import "server-only";

/**
 * Server-side Cloudflare Turnstile verification for POST /api/bookings.
 *
 * Enforcement requires BOTH keys: `TURNSTILE_SECRET_KEY` (server) and
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (the /apply widget — without it no human
 * can ever obtain a token, so enforcing on the secret alone would brick the
 * form). Missing either => the feature is DISABLED LOUDLY: one console.warn
 * per process plus `x-turnstile-mode: disabled-missing-keys` on responses —
 * never a silent bypass.
 *
 * When enabled the policy is FAIL-CLOSED and never silent:
 * - no token            -> 403 `turnstile_required` (no outbound call)
 * - siteverify rejects  -> 403 `turnstile_failed` (error-codes logged)
 * - Cloudflare down     -> 503 `turnstile_unavailable` (we never pass an
 *                          unverified token through)
 *
 * Endpoint: challenges.cloudflare.com/turnstile/v0/siteverify (current — the
 * historical siteverify.cloudflare.com host no longer exists).
 */

export const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileOutcome =
  | { ok: true; mode: "enabled" | "disabled-missing-keys" }
  | { ok: false; kind: "rejected"; reason: string; mode: "enabled" }
  | { ok: false; kind: "unavailable"; reason: string; mode: "enabled" };

let warnedMissing = false;

function enforcementKeys(): { secret: string; siteKey: string } | null {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!secret || !siteKey) return null;
  return { secret, siteKey };
}

export function turnstileEnforced(): boolean {
  return enforcementKeys() !== null;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  ip: string,
): Promise<TurnstileOutcome> {
  const keys = enforcementKeys();
  if (!keys) {
    if (!warnedMissing) {
      warnedMissing = true;
      const missing = [
        !process.env.TURNSTILE_SECRET_KEY?.trim() && "TURNSTILE_SECRET_KEY",
        !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
          "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      ]
        .filter(Boolean)
        .join(", ");
      console.warn(
        `[turnstile] DISABLED (missing ${missing}) — POST /api/bookings ` +
          `accepts requests without token verification. Responses carry ` +
          `x-turnstile-mode=disabled-missing-keys (loud, never silent).`,
      );
    }
    return { ok: true, mode: "disabled-missing-keys" };
  }

  if (!token || !token.trim()) {
    return { ok: false, kind: "rejected", reason: "missing_token", mode: "enabled" };
  }

  try {
    const body = new URLSearchParams({ secret: keys.secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return {
        ok: false,
        kind: "unavailable",
        reason: `siteverify http ${res.status}`,
        mode: "enabled",
      };
    }

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success === true) {
      return { ok: true, mode: "enabled" };
    }
    const codes = Array.isArray(data["error-codes"])
      ? data["error-codes"].join(",")
      : "not_success";
    return { ok: false, kind: "rejected", reason: codes, mode: "enabled" };
  } catch (err) {
    return {
      ok: false,
      kind: "unavailable",
      reason: err instanceof Error ? err.message : "network_error",
      mode: "enabled",
    };
  }
}
