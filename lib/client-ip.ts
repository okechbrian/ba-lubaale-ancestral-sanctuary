import "server-only";

/**
 * Spoofing-resistant client IP resolution for rate limiting.
 *
 * ## Why this file is careful
 *
 * Every header a client can set is attacker-controlled **unless a proxy we
 * control rewrites it**. The old implementation read `cf-connecting-ip` first,
 * which is only trustworthy when the site actually sits behind Cloudflare's
 * proxy — on plain Vercel a client can simply send the header itself and pick
 * its own rate-limit bucket, i.e. unlimited login attempts.
 *
 * Resolution order (first source that yields a valid IP wins):
 *
 * 1. `cf-connecting-ip` (then `cf-real-ip`) — **only** when
 *    `TRUST_CLOUDFLARE_IP=1`. Cloudflare overwrites these on its proxy; the
 *    flag is the operator asserting "my traffic really does arrive via
 *    Cloudflare". Unset (the default) the header is treated as hostile.
 * 2. `x-vercel-forwarded-for` — authored by the Vercel edge, which replaces
 *    any client-supplied copy. This is the client IP as Vercel sees it. Behind
 *    Cloudflare it is Cloudflare's edge IP, which is exactly why (1) exists.
 * 3. `x-forwarded-for`, **rightmost valid entry** — XFF is append-based: every
 *    proxy appends the address of the peer that connected to it. Vercel
 *    appends the address it observed, so the rightmost entry was written by
 *    Vercel and cannot be chosen by the client; everything to its left is
 *    client-supplied. (The old code took the FIRST hop — the most
 *    attacker-controlled value in the header.)
 * 4. `x-real-ip` — only when we are **not** on Vercel (`VERCEL !== "1"` and
 *    no `x-vercel-id` header), where it is written by the site's own reverse
 *    proxy. On Vercel it is not a Vercel-authored header, so it is ignored.
 *
 * Anything that is not a syntactically valid IP is discarded rather than
 * trusted, and a request that yields nothing valid becomes the shared bucket
 * `"unknown"` — being lumped together still gets rate-limited.
 *
 * Note: equivalent spellings of one IPv6 address (compressed vs expanded) are
 * not canonicalised, so they occupy separate buckets. That is a safe
 * direction: it can never merge an attacker with a victim.
 */

export type ClientIpSource =
  | "cloudflare"
  | "vercel"
  | "xff-last-hop"
  | "x-real-ip"
  | "unknown";

export interface ClientIpResult {
  ip: string;
  source: ClientIpSource;
}

const MAX_IP_LENGTH = 45; // longest textual IPv6, e.g. "ffff:...:ffff" + zone-free

/** Accepts ":1234" or "1234" — anything outside the 16-bit port range is junk. */
function validPort(raw: string): boolean {
  const digits = raw.startsWith(":") ? raw.slice(1) : raw;
  if (!/^\d{1,5}$/.test(digits)) return false;
  const port = Number(digits);
  return port > 0 && port <= 65535;
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every(
    (part) =>
      /^\d{1,3}$/.test(part) &&
      Number(part) <= 255 &&
      // reject "01.2.3.4" style leading zeros (ambiguous octal)
      (part.length === 1 || part[0] !== "0"),
  );
}

function isIpv6(value: string): boolean {
  if (!value.includes(":") || value.length > MAX_IP_LENGTH) return false;
  if (!/^[0-9a-f:.]+$/.test(value)) return false;
  if ((value.match(/::/g) ?? []).length > 1) return false;

  const compressedAt = value.indexOf("::");
  const left = compressedAt === -1 ? value : value.slice(0, compressedAt);
  const right = compressedAt === -1 ? "" : value.slice(compressedAt + 2);

  // Group count: hex groups count 1, an embedded IPv4 tail counts 2.
  const countGroups = (segment: string): number | null => {
    if (segment === "") return 0;
    let groups = 0;
    for (const part of segment.split(":")) {
      if (part === "") return null; // stray empty group (":::" or "1::2::3")
      if (part.includes(".")) {
        if (!isIpv4(part)) return null;
        groups += 2;
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      groups += 1;
    }
    return groups;
  };

  const leftCount = countGroups(left);
  const rightCount = countGroups(right);
  if (leftCount === null || rightCount === null) return false;

  const total = leftCount + rightCount;
  if (compressedAt === -1) return total === 8; // no "::" => exactly 8 groups
  // "::" must stand in for at least one omitted group.
  return total < 8;
}

/**
 * Normalise one header entry to a bare IP literal, or null when it is not a
 * usable address. Handles `[2001:db8::1]:443` and `203.0.113.9:51000`
 * (some proxies append ports) but rejects anything else that merely looks
 * like an IP.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length > MAX_IP_LENGTH + 12) return null;

  let value = trimmed.toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end === -1) return null;
    const port = value.slice(end + 1);
    if (port && !validPort(port)) return null;
    value = value.slice(1, end);
  } else {
    // A bare IPv4 with a port ("1.2.3.4:8080") — exactly one colon, dotted quad.
    const colon = value.indexOf(":");
    if (colon !== -1 && !value.includes("::") && isIpv4(value.slice(0, colon))) {
      if (!validPort(value.slice(colon + 1))) return null;
      value = value.slice(0, colon);
    }
  }

  if (!value || value.length > MAX_IP_LENGTH) return null;
  if (isIpv4(value) || isIpv6(value)) return value;
  return null;
}

function headerValue(
  headers: Headers,
  name: string,
): string | null {
  return normalizeIp(headers.get(name));
}

function lastForwardedHop(headers: Headers): string | null {
  const raw = headers.get("x-forwarded-for");
  if (!raw) return null;
  const entries = raw.split(",");
  // Rightmost first: that is the entry Vercel's edge appended.
  for (let i = entries.length - 1; i >= 0; i--) {
    const ip = normalizeIp(entries[i]);
    if (ip) return ip;
  }
  return null;
}

function onVercel(headers: Headers, env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL === "1" || headers.get("x-vercel-id") !== null;
}

/** Full resolution with the winning source, for logs and tests. */
export function resolveClientIp(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): ClientIpResult {
  const headers = request.headers;

  // 1. Cloudflare, only when the operator asserts the proxy is in front.
  if (env.TRUST_CLOUDFLARE_IP === "1") {
    const cf =
      headerValue(headers, "cf-connecting-ip") ??
      headerValue(headers, "cf-real-ip");
    if (cf) return { ip: cf, source: "cloudflare" };
  }

  // 2. Vercel-authored header.
  const vercel = headerValue(headers, "x-vercel-forwarded-for");
  if (vercel) return { ip: vercel, source: "vercel" };

  // 3. Rightmost XFF entry (appended by Vercel, not client-choosable).
  const forwarded = lastForwardedHop(headers);
  if (forwarded) return { ip: forwarded, source: "xff-last-hop" };

  // 4. x-real-ip only off Vercel, where our own proxy writes it.
  if (!onVercel(headers, env)) {
    const real = headerValue(headers, "x-real-ip");
    if (real) return { ip: real, source: "x-real-ip" };
  }

  return { ip: "unknown", source: "unknown" };
}

/** Bucket key for rate limiting — see `resolveClientIp` for the trust rules. */
export function clientIp(request: Request): string {
  return resolveClientIp(request).ip;
}