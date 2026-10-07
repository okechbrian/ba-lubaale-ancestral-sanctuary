import "server-only";

/**
 * Fixed-window per-IP rate limiting backed by Upstash Redis over plain REST
 * (no SDK dependency; host-agnostic — Vercel KV is the same Upstash backend
 * but would lock the site to Vercel).
 *
 * Documented failure policy (per bucket, chosen deliberately):
 * - `onFailure: "open"`  — backend errors let the request through with
 *   `x-ratelimit-mode: fail-open` (availability first; used for guest intake).
 * - `onFailure: "closed"` — backend errors reject with 503
 *   `rate_limiter_unavailable` (protection first; used for admin login).
 *
 * Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN is a separate knob
 * (`onMissingConfig`, default `"allow"`): by default the bucket is DISABLED
 * LOUDLY — one console.warn per process per bucket plus
 * `x-ratelimit-mode: disabled-missing-config` on every response, so the
 * disabled state is never silent and never fakes "enabled". The admin login
 * bucket opts into `"closed"` in production (see `adminLoginRequiresLimiter`):
 * an unconfigured brute-force guard must not accept unlimited attempts on a
 * live site.
 */

export type RateLimitMode =
  | "enabled"
  | "disabled-missing-config"
  | "fail-closed-missing-config"
  | "fail-open"
  | "fail-closed";

export interface RateLimitDecision {
allowed: boolean;
    mode: RateLimitMode;
    limit: number;
    remaining: number | null;
    retryAfterSec: number | null;
    /**
     * True when this call actually incremented the counter against Redis, so a
     * caller that goes on to *succeed* can hand the hit back with
     * `refundRateLimit`. False in every mode that short-circuits before the
     * INCR (no config, backend error), where there is nothing to refund.
     */
    consumed: boolean;
  }

export interface RateLimitOptions {
  /** Bucket namespace, unique per endpoint (part of the Redis key). */
  name: string;
  limit: number;
  windowSec: number;
  /** Policy when the Redis backend itself errors at runtime. */
  onFailure: "open" | "closed";
  /**
   * Policy when the Redis credentials are missing from the environment.
   * `"allow"` (default) disables the bucket loudly; `"closed"` refuses
   * traffic (503) so a production login can never run unthrottled.
   */
  onMissingConfig?: "allow" | "closed";
  ip: string;
}

/**
 * The environment slice these policies read. Structurally narrower than
 * `NodeJS.ProcessEnv` so callers (and tests) can pass a plain object.
 */
export interface RateLimitEnv {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
  ALLOW_UNTHROTTLED_ADMIN?: string;
  [key: string]: string | undefined;
}

/**
 * True when this process is serving production traffic (a real deployment,
 * not a local build or test run).
 */
export function isProductionEnv(env: RateLimitEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

/**
 * Whether the admin login bucket must refuse traffic when Upstash is
 * unconfigured.
 *
 * In production: YES — an admin console with no brute-force guard is worse
 * than one that answers 503 `rate_limiter_unavailable`, and 503 is honest
 * about why. `ALLOW_UNTHROTTLED_ADMIN=1` is the explicit, auditable escape
 * hatch for an operator who accepts that risk (self-hosted, no Redis, one
 * admin behind a VPN).
 *
 * Outside production (local dev, tests, preview builds) the bucket stays
 * disabled-loudly so local work never needs a Redis instance.
 */
export function adminLoginRequiresLimiter(
  env: RateLimitEnv = process.env,
): boolean {
  if (env.ALLOW_UNTHROTTLED_ADMIN === "1") return false;
  return isProductionEnv(env);
}

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function sanitizeIp(ip: string): string {
  const clean = ip.replace(/[^A-Za-z0-9:._-]/g, "_").slice(0, 64);
  return clean || "unknown";
}

/**
 * Send one or more Redis commands as a single JSON pipeline.
 *
 * The wire format matters and is NOT guessable: the Upstash REST API parses
 * every request body as JSON. An earlier version of this file posted
 * `text/plain` with newline-separated commands
 * (`INCR <key>\nEXPIRE <key> 900 NX`), which a real database rejects with
 * `HTTP 400 invalid character 'I' looking for beginning of value` while the
 * in-repo test stub happily accepted it - so the limiter was never exercised
 * against a real Upstash. Every call must therefore be a JSON array of
 * argument arrays posted to `/pipeline`, and `tests/rate-limit.test.ts` pins
 * that shape so it cannot quietly regress.
 *
 * `/pipeline` also accepts a single command, so DEL and PTTL share this path
 * rather than growing a second URL style.
 */
async function upstash(
  cfg: { url: string; token: string },
  commands: string[][],
): Promise<unknown> {
  const res = await fetch(`${cfg.url.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`upstash http ${res.status}`);
  return res.json();
}

interface CmdResult {
  result?: unknown;
  error?: string;
}

/** Upstash returns an object for a single command, an array for a pipeline. */
function entriesOf(json: unknown): CmdResult[] {
  return Array.isArray(json) ? (json as CmdResult[]) : [json as CmdResult];
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Count one hit against `name:<ip>` for the current fixed window.
 * Pipeline: `INCR` then `EXPIRE <window> NX` (TTL set only when the key is
 * new, so concurrent hits cannot leave a TTL-less runaway counter).
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitDecision> {
  const cfg = redisConfig();
  if (!cfg) {
    if (opts.onMissingConfig === "closed") {
      warnOnce(
        `rate-limit:${opts.name}`,
        `[rate-limit] ${opts.name} has NO Redis config in production and is ` +
          `REFUSING traffic (x-ratelimit-mode=fail-closed-missing-config, ` +
          `503 rate_limiter_unavailable). Set UPSTASH_REDIS_REST_URL and ` +
          `UPSTASH_REDIS_REST_TOKEN to restore throttling, or set ` +
          `ALLOW_UNTHROTTLED_ADMIN=1 to accept unthrottled admin logins.`,
      );
      return {
        allowed: false,
        mode: "fail-closed-missing-config",
        limit: opts.limit,
        remaining: null,
        retryAfterSec: null,
        consumed: false,
      };
    }
    warnOnce(
      `rate-limit:${opts.name}`,
      `[rate-limit] ${opts.name} is DISABLED — UPSTASH_REDIS_REST_URL / ` +
        `UPSTASH_REDIS_REST_TOKEN missing. Requests pass unthrottled; every ` +
        `response carries x-ratelimit-mode=disabled-missing-config (loud, never silent).`,
    );
    return {
      allowed: true,
mode: "disabled-missing-config",
        limit: opts.limit,
        remaining: null,
        retryAfterSec: null,
        consumed: false,
      };
  }

  const key = `rl:${opts.name}:${sanitizeIp(opts.ip)}`;
  try {
    const json = await upstash(cfg, [
      ["INCR", key],
      ["EXPIRE", key, String(opts.windowSec), "NX"],
    ]);
    const [incr, expire] = entriesOf(json);
    const n = asNumber(incr?.result);
    if (n === null || incr?.error) {
      throw new Error(`incr: ${incr?.error ?? "unparseable result"}`);
    }
    if (expire?.error) {
      // The TTL never got set — remove the counter so a permanently-open
      // window can never lock an IP out, then apply the failure policy.
      await upstash(cfg, [["DEL", key]]).catch(() => undefined);
      throw new Error(`expire: ${expire.error}`);
    }

    if (n > opts.limit) {
      let retryAfterSec = opts.windowSec;
      try {
        const pttl = entriesOf(await upstash(cfg, [["PTTL", key]]))[0];
        const ms = asNumber(pttl?.result);
        if (ms !== null && ms > 0) retryAfterSec = Math.max(1, Math.ceil(ms / 1000));
      } catch {
        // Fall back to the full window — the denial itself already succeeded.
      }
      return {
        allowed: false,
        mode: "enabled",
        limit: opts.limit,
        remaining: 0,
        retryAfterSec,
        // The INCR ran before the denial, so this hit is on the counter.
        consumed: true,
      };
    }

    return {
      allowed: true,
mode: "enabled",
        limit: opts.limit,
        remaining: Math.max(0, opts.limit - n),
        retryAfterSec: null,
        consumed: true,
      };
  } catch (err) {
    console.error(
      `[rate-limit] ${opts.name} backend error ` +
        `(${err instanceof Error ? err.message : "unknown"}) — ` +
        `policy: fail-${opts.onFailure}.`,
    );
    if (opts.onFailure === "open") {
      return {
        allowed: true,
        mode: "fail-open",
        limit: opts.limit,
        remaining: null,
        retryAfterSec: null,
        consumed: false,
      };
    }
    return {
      allowed: false,
        mode: "fail-closed",
        limit: opts.limit,
        remaining: null,
        retryAfterSec: null,
        consumed: false,
      };
  }
}

/**
 * Hand one hit back after a request *succeeded*.
 *
 * The limiter has to count an attempt before it knows whether the request will
 * be allowed through — you cannot check a password without spending a check.
 * On a login form that means a real owner who mistypes twice and then types it
 * correctly has still spent three of five attempts, and a fifth stray keystroke
 * locks the owner out of their own console for a quarter of an hour. The page
 * then has to explain that lockout, which it did not, so the owner was told
 * their correct password was wrong.
 *
 * Refunding on success separates the two things the counter was conflating:
 * **failures** are what the limit exists to stop, and a success proves the
 * password was known. An attacker gets no refund, because a refund only happens
 * once the correct credentials have already been supplied.
 *
 * Best effort by design: if Redis is unreachable the hit simply stands, which
 * is the fail-closed direction for a security control.
 *
 * Only call this when the matching `checkRateLimit` reported
 * `consumed: true`, so it can never decrement a window this request did not
 * touch.
 */
export async function refundRateLimit(opts: {
  name: string;
  ip: string;
}): Promise<void> {
  const cfg = redisConfig();
  if (!cfg) return;
  const key = `rl:${opts.name}:${sanitizeIp(opts.ip)}`;
  try {
    const json = await upstash(cfg, [["DECR", key]]);
    const entry = entriesOf(json)[0];
    if (entry?.error) {
      // A command-level rejection is not an HTTP failure, so it does not throw
      // above. Surfacing it keeps a silent no-op from looking like a working
      // refund — the failure mode that made this whole incident hard to read.
      throw new Error(`decr: ${entry.error}`);
    }
    const after = asNumber(entry?.result);
    // The window can expire between the charge and the refund. DECR would then
    // create the key at -1, so drop it rather than leave a bucket that reads
    // one attempt *under* zero — the failure mode here is a slightly lenient
    // counter, never a lockout.
    if (after !== null && after < 0) {
      await upstash(cfg, [["DEL", key]]);
    }
  } catch (err) {
    console.error(
      `[rate-limit] ${opts.name} refund failed (${
        err instanceof Error ? err.message : "unknown"
      }) — the hit stands, which is the safe direction.`,
    );
  }
}

/** Response headers that make the limiter's state visible on EVERY response. */
export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  const headers: Record<string, string> = {
    "x-ratelimit-mode": decision.mode,
    "x-ratelimit-limit": String(decision.limit),
  };
  if (decision.remaining !== null) {
    headers["x-ratelimit-remaining"] = String(decision.remaining);
  }
  if (decision.retryAfterSec !== null) {
    headers["Retry-After"] = String(decision.retryAfterSec);
  }
  return headers;
}
