import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
} from "@/lib/admin/session";
import { clientIp } from "@/lib/client-ip";
import {
  adminLoginRequiresLimiter,
  checkRateLimit,
  rateLimitHeaders,
  refundRateLimit,
} from "@/lib/rate-limit";

/** Constant-time-ish string compare (never logs or echoes credentials). */
function matches(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request): Promise<Response> {
  // Brute-force guard: 5 attempts / 15 min per IP, bucketed by the
  // spoof-resistant client IP (see lib/client-ip.ts — a client cannot pick its
  // own bucket by sending cf-connecting-ip).
  //
  // FAIL-CLOSED twice over, because this guards the admin console:
  //  - Upstash unreachable -> 503 rate_limiter_unavailable
  //  - Upstash UNCONFIGURED in production -> also 503 (no guard is not an
  //    acceptable silent state on a live site). ALLOW_UNTHROTTLED_ADMIN=1 is
  //    the explicit escape hatch; outside production the bucket is simply
  //    DISABLED LOUDLY (x-ratelimit-mode: disabled-missing-config + warn).
  const rl = await checkRateLimit({
    name: "admin-login",
    limit: 5,
    windowSec: 15 * 60,
    onFailure: "closed",
    onMissingConfig: adminLoginRequiresLimiter() ? "closed" : "allow",
    ip: clientIp(request),
  });
  const rlHeaders = rateLimitHeaders(rl);
  if (!rl.allowed) {
    // Only a real bucket overflow is a 429; every "the guard itself could not
    // run" mode is a 503, so the caller is never told to merely retry later.
    if (rl.mode === "enabled") {
      return Response.json(
        { error: "rate_limited", retry_after: rl.retryAfterSec },
        { status: 429, headers: rlHeaders },
      );
    }
    return Response.json(
      { error: "rate_limiter_unavailable" },
      { status: 503, headers: rlHeaders },
    );
  }

  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!user || !pass || !secret) {
    return Response.json(
      { error: "admin_not_configured" },
      { status: 503, headers: rlHeaders },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: rlHeaders },
    );
  }

  const ok =
    typeof body.username === "string" &&
    typeof body.password === "string" &&
    matches(body.username, user) &&
    matches(body.password, pass);
  if (!ok) {
    return Response.json(
      { error: "invalid_credentials" },
      { status: 401, headers: rlHeaders },
    );
  }

  // The attempt counter is charged before the password can be checked, so a
  // successful login would otherwise spend one of the owner's five. Give that
  // hit back: a success proves the password was known, which is exactly what
  // the limit is not trying to stop. Nobody who is guessing can reach here.
if (rl.consumed) {
      await refundRateLimit({ name: "admin-login", ip: clientIp(request) });
    }

  const token = await createSessionToken(secret);
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: {
        ...rlHeaders,
        "Set-Cookie": [
          `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
          process.env.NODE_ENV === "production" ? "Secure" : "",
        ]
          .filter(Boolean)
          .join("; "),
      },
    },
  );
}
