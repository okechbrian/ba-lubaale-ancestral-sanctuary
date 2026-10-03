import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { clientIp, normalizeIp, resolveClientIp } from "@/lib/client-ip";

const ENV_KEYS = ["VERCEL", "VERCEL_ENV", "TRUST_CLOUDFLARE_IP"];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  // Default to the production platform unless a test says otherwise: every
  // untrusted-header rule below is the one that applies on Vercel.
  process.env.VERCEL = "1";
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/admin/login", { headers });
}

/** The header set a real attacker on Vercel could send. */
function spoofed(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "cf-connecting-ip": "6.6.6.6",
    "x-real-ip": "6.6.6.6",
    "x-forwarded-for": "6.6.6.6",
    ...overrides,
  };
}

describe("normalizeIp", () => {
  it("accepts valid IPv4 and IPv6, including bracketed forms with a port", () => {
    expect(normalizeIp("203.0.113.9")).toBe("203.0.113.9");
    expect(normalizeIp("  198.51.100.4 ")).toBe("198.51.100.4");
    expect(normalizeIp("203.0.113.9:51000")).toBe("203.0.113.9");
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
    expect(normalizeIp("2001:DB8::1")).toBe("2001:db8::1");
    expect(normalizeIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIp("::1")).toBe("::1");
    expect(normalizeIp("::ffff:192.0.2.128")).toBe("::ffff:192.0.2.128");
  });

  it("rejects anything that is not an IP literal", () => {
    for (const junk of [
      "",
      "   ",
      "unknown",
      "not-an-ip",
      "1.2.3", // too few octets
      "1.2.3.4.5", // too many
      "256.1.1.1", // out of range
      "01.2.3.4", // ambiguous leading zero
      "1.2.3.4:99999", // port too long
      "[2001:db8::1", // unclosed bracket
      "2001:db8:::1", // stray empty group
      "2001:db8::1::2", // two compressions
      "12345::1", // group too long
      "1.2.3.4;drop",
      "localhost",
      "x".repeat(60),
    ]) {
      expect(normalizeIp(junk), junk).toBeNull();
    }
    expect(normalizeIp(null)).toBeNull();
    expect(normalizeIp(undefined)).toBeNull();
  });
});

describe("resolveClientIp — Cloudflare headers are hostile unless opted in", () => {
  it("ignores a spoofed cf-connecting-ip by default", () => {
    const result = resolveClientIp(
      req(spoofed({ "x-vercel-forwarded-for": "198.51.100.9" })),
    );
    expect(result).toEqual({ ip: "198.51.100.9", source: "vercel" });
  });

  it("prefers x-vercel-forwarded-for over every other header", () => {
    const result = resolveClientIp(
      req(
        spoofed({
          "x-vercel-forwarded-for": "198.51.100.9",
          "x-forwarded-for": "6.6.6.6, 203.0.113.77",
        }),
      ),
    );
    expect(result).toEqual({ ip: "198.51.100.9", source: "vercel" });
  });

  it("uses cf-connecting-ip when TRUST_CLOUDFLARE_IP=1", () => {
    process.env.TRUST_CLOUDFLARE_IP = "1";
    const result = resolveClientIp(
      req(spoofed({ "x-vercel-forwarded-for": "198.51.100.9" })),
    );
    expect(result).toEqual({ ip: "6.6.6.6", source: "cloudflare" });
  });

  it("falls back to cf-real-ip under the flag, and skips garbage values", () => {
    process.env.TRUST_CLOUDFLARE_IP = "1";
    expect(
      resolveClientIp(
        req({ "cf-real-ip": "203.0.113.5", "x-vercel-forwarded-for": "198.51.100.9" }),
      ),
    ).toEqual({ ip: "203.0.113.5", source: "cloudflare" });

    // A Cloudflare-shaped header carrying junk must not be trusted either.
    expect(
      resolveClientIp(
        req({
          "cf-connecting-ip": "totally-not-an-ip",
          "x-vercel-forwarded-for": "198.51.100.9",
        }),
      ),
    ).toEqual({ ip: "198.51.100.9", source: "vercel" });
  });

  it("ignores the flag for any value other than exactly \"1\"", () => {
    for (const value of ["0", "true", "yes", "", " 1"]) {
      process.env.TRUST_CLOUDFLARE_IP = value;
      expect(
        resolveClientIp(
          req(spoofed({ "x-vercel-forwarded-for": "198.51.100.9" })),
        ),
      ).toEqual({ ip: "198.51.100.9", source: "vercel" });
    }
  });
});

describe("resolveClientIp — x-forwarded-for rightmost hop", () => {
  it("takes the LAST entry, not the client-controlled first one", () => {
    const result = resolveClientIp(
      req({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 198.51.100.9" }),
    );
    expect(result).toEqual({ ip: "198.51.100.9", source: "xff-last-hop" });
  });

  it("skips trailing junk entries instead of giving up", () => {
    const result = resolveClientIp(
      req({ "x-forwarded-for": "6.6.6.6, 198.51.100.9, unknown" }),
    );
    expect(result).toEqual({ ip: "198.51.100.9", source: "xff-last-hop" });
  });

  it("handles a single-entry chain (what Vercel sends by default)", () => {
    expect(resolveClientIp(req({ "x-forwarded-for": "198.51.100.9" }))).toEqual({
      ip: "198.51.100.9",
      source: "xff-last-hop",
    });
  });

  it("falls through to \"unknown\" when the chain holds nothing valid", () => {
    expect(resolveClientIp(req({ "x-forwarded-for": "junk, garbage" }))).toEqual({
      ip: "unknown",
      source: "unknown",
    });
  });
});

describe("resolveClientIp — x-real-ip only off Vercel", () => {
  it("ignores x-real-ip on Vercel (VERCEL=1)", () => {
    delete process.env.VERCEL;
    process.env.VERCEL = "1";
    expect(resolveClientIp(req({ "x-real-ip": "6.6.6.6" }))).toEqual({
      ip: "unknown",
      source: "unknown",
    });
  });

  it("ignores x-real-ip when the x-vercel-id header proves we are on Vercel", () => {
    delete process.env.VERCEL;
    expect(
      resolveClientIp(
        req({ "x-real-ip": "6.6.6.6", "x-vercel-id": "iad1::abc" }),
      ),
    ).toEqual({ ip: "unknown", source: "unknown" });
  });

  it("uses x-real-ip on a self-hosted deployment", () => {
    delete process.env.VERCEL;
    expect(resolveClientIp(req({ "x-real-ip": "203.0.113.9:443" }))).toEqual({
      ip: "203.0.113.9",
      source: "x-real-ip",
    });
  });
});

describe("clientIp — the bucket cannot be chosen by the client", () => {
  it("returns the Vercel-observed IP, never a spoofed header value", () => {
    expect(
      clientIp(req(spoofed({ "x-vercel-forwarded-for": "198.51.100.9" }))),
    ).toBe("198.51.100.9");
  });

  it("with no Vercel header, uses the rightmost XFF hop, not the injected one", () => {
    // A bot rotating cf-connecting-ip + the left part of XFF still lands in
    // one bucket: exactly the case the old implementation let it escape.
    const buckets = new Set(
      [1, 2, 3, 4, 5].map(
        (n) =>
          clientIp(
            req({
              "cf-connecting-ip": `6.6.${n}.${n}`,
              "x-real-ip": `6.6.${n}.${n}`,
              "x-forwarded-for": `6.6.${n}.${n}, 198.51.100.9`,
            }),
          ),
      ),
    );
    expect([...buckets]).toEqual(["198.51.100.9"]);
  });

  it("bottles header-less requests into one shared bucket", () => {
    expect(clientIp(req({}))).toBe("unknown");
    expect(clientIp(req({ "cf-connecting-ip": "6.6.6.6" }))).toBe("unknown");
  });
});