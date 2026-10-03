import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { SITEVERIFY_URL } from "@/lib/turnstile";
import type { BookingRequest } from "@/lib/booking/schema";
import { startUpstashStub } from "./helpers/upstash-stub";

const ENV_KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  // Client-IP trust switches + the production limiter guard.
  "VERCEL",
  "VERCEL_ENV",
  "NODE_ENV",
  "TRUST_CLOUDFLARE_IP",
  "ALLOW_UNTHROTTLED_ADMIN",
];

// Official Cloudflare Turnstile TEST keys (docs: always pass / always fail).
const PASSING_SECRET = "1x0000000000000000000000000000000AA";
const FAILING_SECRET = "2x0000000000000000000000000000000AA";
const TEST_SITEKEY = "1x00000000000000000000AA";
const DUMMY_TOKEN = "XXXX.XXXX.XXXX-XXXX";

const saved: Record<string, string | undefined> = {};
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeAll(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.ADMIN_USERNAME = "chief";
  process.env.ADMIN_PASSWORD = "hunter2-secret";
  process.env.ADMIN_SESSION_SECRET = "unit-test-secret";
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.ADMIN_USERNAME = "chief";
  process.env.ADMIN_PASSWORD = "hunter2-secret";
  process.env.ADMIN_SESSION_SECRET = "unit-test-secret";
  warnSpy.mockClear();
  errorSpy.mockClear();
});

function clearProtectionEnv(): void {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

function loginReq(): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "chief", password: "hunter2-secret" }),
  });
}

function bookingPayload(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    name: "Test Guest",
    email: "guest@example.com",
    country: "Uganda",
    party: "solo",
    stay_slug: "master",
    check_in: "2027-06-01",
    check_out: "2027-06-05",
    drawing: "Seeking stillness.",
    comfort: "Comfortable.",
    protocols: "yes",
    digital_sunset: "yes",
    burden: "Stress.",
    policiesCheck: true,
    complementaryCheck: true,
    ...overrides,
  };
}

function postBooking(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return createBooking(
    new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

/** Reachability probe: real siteverify calls skip loudly when offline. */
let siteverifyReachable = false;
beforeAll(async () => {
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: PASSING_SECRET,
        response: DUMMY_TOKEN,
      }),
      signal: AbortSignal.timeout(8000),
    });
    siteverifyReachable = res.ok;
  } catch {
    siteverifyReachable = false;
  }
  if (!siteverifyReachable) {
    console.warn(
      "[tests] challenges.cloudflare.com unreachable — real Turnstile " +
        "siteverify tests will skip with a notice (never a faked pass).",
    );
  }
});

describe("POST /api/admin/login — rate limiting", () => {
  it("runs with the limiter disabled LOUDLY when UPSTASH keys are missing", async () => {
    clearProtectionEnv();

    const res = await login(loginReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-mode")).toBe("disabled-missing-config");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[rate-limit] admin-login is DISABLED"),
    );
  });

  it("fails CLOSED (503) when the rate-limit backend is unreachable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";

    const res = await login(loginReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("rate_limiter_unavailable");
    expect(res.headers.get("x-ratelimit-mode")).toBe("fail-closed");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("fail-closed"),
    );
  });

  it("503s in production when UPSTASH is unconfigured (never silently unthrottled)", async () => {
    clearProtectionEnv();
    process.env.VERCEL_ENV = "production";

    const res = await login(loginReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("rate_limiter_unavailable");
    expect(res.headers.get("x-ratelimit-mode")).toBe(
      "fail-closed-missing-config",
    );
    // The warn-once registry is process-global and the admin-login bucket
    // already warned in the first test of this file, so the message text is
    // asserted in tests/rate-limit.test.ts with a fresh bucket name.
  });

  it("ALLOW_UNTHROTTLED_ADMIN=1 waives the guard — still loudly", async () => {
    clearProtectionEnv();
    process.env.VERCEL_ENV = "production";
    process.env.ALLOW_UNTHROTTLED_ADMIN = "1";

    const res = await login(loginReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-mode")).toBe("disabled-missing-config");
  });

  it("429s the 6th attempt within the 5/15min window (real HTTP backend)", async () => {
    const stub = await startUpstashStub();
    try {
      process.env.UPSTASH_REDIS_REST_URL = stub.url;
      process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";

      for (let i = 1; i <= 5; i++) {
        const res = await login(
          new Request("http://localhost/api/admin/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": "198.51.100.9",
            },
            body: JSON.stringify({ username: "chief", password: "wrong" }),
          }),
        );
        expect(res.status).toBe(401);
        expect(res.headers.get("x-ratelimit-mode")).toBe("enabled");
        expect(res.headers.get("x-ratelimit-remaining")).toBe(String(5 - i));
      }

      const sixth = await login(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.9",
          },
          body: JSON.stringify({ username: "chief", password: "wrong" }),
        }),
      );
      expect(sixth.status).toBe(429);
      expect((await sixth.json()).error).toBe("rate_limited");
      expect(Number(sixth.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect(sixth.headers.get("x-ratelimit-mode")).toBe("enabled");
    } finally {
      await stub.close();
    }
  });

  it("cannot be dodged by rotating spoofed client-IP headers", async () => {
    // The attack this closes: a bot sends its own cf-connecting-ip (and its
    // own x-real-ip / left-most x-forwarded-for hop) on every request. The old
    // implementation read cf-connecting-ip first, so each attempt landed in a
    // brand-new bucket and the 5/15min limit never fired.
    const stub = await startUpstashStub();
    try {
      process.env.UPSTASH_REDIS_REST_URL = stub.url;
      process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";

      const attempt = (n: number): Promise<Response> =>
        login(
          new Request("http://localhost/api/admin/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "cf-connecting-ip": `6.6.6.${n}`,
              "x-real-ip": `7.7.7.${n}`,
              // left entry is attacker-chosen; the right one is what the
              // platform appended
              "x-forwarded-for": `8.8.8.${n}, 198.51.100.9`,
            },
            body: JSON.stringify({ username: "chief", password: "wrong" }),
          }),
        );

      for (let i = 1; i <= 5; i++) {
        const res = await attempt(i);
        expect(res.status).toBe(401);
        expect(res.headers.get("x-ratelimit-mode")).toBe("enabled");
        expect(res.headers.get("x-ratelimit-remaining")).toBe(String(5 - i));
      }

      const sixth = await attempt(6);
      expect(sixth.status).toBe(429);
      expect((await sixth.json()).error).toBe("rate_limited");
      expect(Number(sixth.headers.get("Retry-After"))).toBeGreaterThan(0);

      // Proof the bucket never moved: every counter hit the same key, and no
      // spoofed address appears in any Redis key.
      const keys = stub.commands
        .filter((c) => c.startsWith("INCR "))
        .map((c) => c.split("\n")[0].replace("INCR ", ""));
      expect(keys).toHaveLength(6);
      expect(new Set(keys)).toEqual(new Set(["rl:admin-login:198.51.100.9"]));
      expect(stub.commands.join("\n")).not.toContain("6.6.6.");
      expect(stub.commands.join("\n")).not.toContain("7.7.7.");
      expect(stub.commands.join("\n")).not.toContain("8.8.8.");
    } finally {
      await stub.close();
    }
  });
});

describe("POST /api/bookings — rate limiting", () => {
  it("fails OPEN when the backend is unreachable (intake stays up, loudly)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";

    const res = await postBooking(bookingPayload());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
    expect(res.headers.get("x-ratelimit-mode")).toBe("fail-open");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("fail-open"));
    // Turnstile is also unconfigured here — that must be loud too.
    expect(res.headers.get("x-turnstile-mode")).toBe("disabled-missing-keys");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[turnstile] DISABLED"),
    );
  });

  it("429s the 4th request within the 3/hour window", async () => {
    const stub = await startUpstashStub();
    try {
      process.env.UPSTASH_REDIS_REST_URL = stub.url;
      process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";

      for (let i = 1; i <= 3; i++) {
        const res = await postBooking(bookingPayload(), {
          "x-forwarded-for": "198.51.100.42",
        });
        expect(res.status).toBe(503); // DB unset — counting already happened
        expect(res.headers.get("x-ratelimit-mode")).toBe("enabled");
      }

      const fourth = await postBooking(bookingPayload(), {
        "x-forwarded-for": "198.51.100.42",
      });
      expect(fourth.status).toBe(429);
      const body = await fourth.json();
      expect(body.error).toBe("rate_limited");
      expect(body.retry_after).toBeGreaterThan(0);
      expect(fourth.headers.get("Retry-After")).toBeTruthy();
    } finally {
      await stub.close();
    }
  });
});

describe("POST /api/bookings — honeypot enforcement", () => {
  it("rejects a filled honeypot loudly, without leaking the field name", async () => {
    clearProtectionEnv();

    const res = await postBooking(bookingPayload({ website: "spam.example" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(body.issues).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("website");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("bookings honeypot triggered ip="),
    );
  });

  it("wins BEFORE turnstile verification (bot never reaches Cloudflare)", async () => {
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await postBooking(bookingPayload({ website: "spam.example" }));
    expect(res.status).toBe(400);
    expect(res.headers.get("x-turnstile-mode")).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("bookings honeypot triggered"),
    );
  });
});

describe("POST /api/bookings — Turnstile server-side verification", () => {
  it("403s turnstile_required when keys are set but no token is sent", async () => {
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await postBooking(bookingPayload());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("turnstile_required");
    expect(res.headers.get("x-turnstile-mode")).toBe("enabled");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("missing token"),
    );
  });

  it("accepts a token Cloudflare verifies (REAL siteverify, official pass key)", async () => {
    if (!siteverifyReachable) {
      console.warn("[tests] SKIP: siteverify unreachable (no network)");
      return;
    }
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await postBooking(
      bookingPayload({ cf_turnstile_response: DUMMY_TOKEN }),
    );
    // Verification passed => the request proceeds to the (unset) database.
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
    expect(res.headers.get("x-turnstile-mode")).toBe("enabled");
  }, 15000);

  it("403s a token Cloudflare rejects (REAL siteverify, official fail key)", async () => {
    if (!siteverifyReachable) {
      console.warn("[tests] SKIP: siteverify unreachable (no network)");
      return;
    }
    process.env.TURNSTILE_SECRET_KEY = FAILING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await postBooking(
      bookingPayload({ cf_turnstile_response: DUMMY_TOKEN }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("turnstile_failed");
    expect(res.headers.get("x-turnstile-mode")).toBe("enabled");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("turnstile rejected"),
    );
  }, 15000);

  it("rejects an oversized token via schema before any network call", async () => {
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await postBooking(
      bookingPayload({ cf_turnstile_response: "x".repeat(3000) }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(
      body.issues.some(
        (i: { path: string }) => i.path === "cf_turnstile_response",
      ),
    ).toBe(true);
  });
});
