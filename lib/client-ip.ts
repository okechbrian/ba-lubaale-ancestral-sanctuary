/**
 * Best-effort client IP for rate limiting and abuse logs.
 * Trusted-proxy headers win in order: Cloudflare -> reverse proxy ->
 * Vercel/standard x-forwarded-for (first hop). Falls back to "unknown"
 * (local dev / direct invocation) — the limiter still buckets it.
 */
export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
