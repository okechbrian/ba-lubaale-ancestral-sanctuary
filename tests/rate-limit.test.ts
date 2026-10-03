import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  adminLoginRequiresLimiter,
  checkRateLimit,
  isProductionEnv,
  rateLimitHeaders,
  type RateLimitOptions,
} from "@/lib/rate-limit";
import { startUpstashStub, type UpstashStub } from "./helpers/upstash-stub";

const KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VERCEL_ENV",
  "NODE_ENV",
  "ALLOW_UNTHROTTLED_ADMIN",
];
const saved: Record<string, string | undefined> = {};
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeAll(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  warnSpy.mockClear();
  errorSpy.mockClear();
});

function opts(overrides: Partial<RateLimitOptions> = {}): RateLimitOptions {
  return {
    name: "unit-bucket",
    limit: 3,
    windowSec: 60,
    onFailure: "open",
    ip: "203.0.113.7",
    ...overrides,
  };
}

function useStub(stub: UpstashStub): void {
  process.env.UPSTASH_REDIS_REST_URL = stub.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";
}

describe("checkRateLimit — missing config disables loudly", () => {
  it("allows with mode disabled-missing-config and warns once per bucket", async () => {
    const first = await checkRateLimit(opts());
    expect(first).toMatchObject({
      allowed: true,
      mode: "disabled-missing-config",
      limit: 3,
      remaining: null,
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("DISABLED"));

    warnSpy.mockClear();
    const again = await checkRateLimit(opts());
    expect(again.allowed).toBe(true);
    expect(again.mode).toBe("disabled-missing-config");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("refuses traffic when onMissingConfig is closed, and still warns loudly", async () => {
    const decision = await checkRateLimit(
      opts({ name: "closed-bucket", onMissingConfig: "closed" }),
    );
    expect(decision).toEqual({
      allowed: false,
      mode: "fail-closed-missing-config",
      limit: 3,
      remaining: null,
      retryAfterSec: null,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("REFUSING traffic"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ALLOW_UNTHROTTLED_ADMIN=1"),
    );
    // The bucket name is in the message, so an operator can see which guard
    // is refusing traffic without reading code.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("closed-bucket"),
    );
    expect(rateLimitHeaders(decision)["x-ratelimit-mode"]).toBe(
      "fail-closed-missing-config",
    );
  });
});

describe("production guard for the admin login limiter", () => {
  it("detects production from VERCEL_ENV or NODE_ENV", () => {
    expect(isProductionEnv({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionEnv({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionEnv({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionEnv({})).toBe(false);
  });

  it("requires the limiter in production unless explicitly waived", () => {
    expect(
      adminLoginRequiresLimiter({ VERCEL_ENV: "production" }),
    ).toBe(true);
    expect(
      adminLoginRequiresLimiter({
        VERCEL_ENV: "production",
        ALLOW_UNTHROTTLED_ADMIN: "1",
      }),
    ).toBe(false);
    // Only the exact string "1" waives it — "true"/"0" do not.
    expect(
      adminLoginRequiresLimiter({
        VERCEL_ENV: "production",
        ALLOW_UNTHROTTLED_ADMIN: "true",
      }),
    ).toBe(true);
    // Local dev and previews keep the loud-but-usable disabled state.
    expect(adminLoginRequiresLimiter({ NODE_ENV: "development" })).toBe(false);
    expect(adminLoginRequiresLimiter({ VERCEL_ENV: "preview" })).toBe(false);
  });
});

describe("checkRateLimit — enabled against a real (stub) HTTP backend", () => {
  let stub: UpstashStub;

  beforeAll(async () => {
    stub = await startUpstashStub();
  });

  beforeEach(() => {
    // The file-level afterEach clears env after every test — restore here so
    // each test in this suite really hits the enabled code path.
    useStub(stub);
  });

  afterAll(async () => {
    await stub.close();
  });

  it("counts hits, denies over the limit, and PTTLs the Retry-After", async () => {
    const a = await checkRateLimit(opts());
    const b = await checkRateLimit(opts());
    const c = await checkRateLimit(opts());
    expect([a, b, c].map((d) => d.remaining)).toEqual([2, 1, 0]);

    const denied = await checkRateLimit(opts());
    expect(denied.allowed).toBe(false);
    expect(denied.mode).toBe("enabled");
    expect(denied.retryAfterSec).toBeGreaterThan(0);
    expect(denied.retryAfterSec).toBeLessThanOrEqual(60);

    const headers = rateLimitHeaders(denied);
    expect(headers["x-ratelimit-mode"]).toBe("enabled");
    expect(headers["Retry-After"]).toBe(String(denied.retryAfterSec));
    expect(headers["x-ratelimit-limit"]).toBe("3");
  });

  it("keys buckets per name and sanitized IP", async () => {
    await checkRateLimit(opts({ name: "ipfmt", ip: "bad ip;drop/../../x" }));
    expect(stub.commands.at(-1)).toContain("rl:ipfmt:bad_ip_drop_.._.._x");
  });
});

describe("checkRateLimit — runtime backend failure honors the policy", () => {
  it("fail-open: allows with mode fail-open and logs the error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";

    const decision = await checkRateLimit(opts({ onFailure: "open" }));
    expect(decision.allowed).toBe(true);
    expect(decision.mode).toBe("fail-open");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("fail-open"),
    );
  });

  it("fail-closed: denies with mode fail-closed", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";

    const decision = await checkRateLimit(opts({ onFailure: "closed" }));
    expect(decision.allowed).toBe(false);
    expect(decision.mode).toBe("fail-closed");
    expect(decision.retryAfterSec).toBeNull();
  });

  it("EXPIRE error: deletes the TTL-less counter, then applies the policy", async () => {
    const broken = await startUpstashStub({ failExpire: true });
    try {
      useStub(broken);
      const decision = await checkRateLimit(opts({ onFailure: "open" }));
      expect(decision.allowed).toBe(true);
      expect(decision.mode).toBe("fail-open");
      expect(broken.commands.some((c) => c.startsWith("DEL "))).toBe(true);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("expire:"),
      );
    } finally {
      await broken.close();
    }
  });
});

describe("rateLimitHeaders", () => {
  it("exposes the mode on every response and omits absent values", () => {
    const disabled = rateLimitHeaders({
      allowed: true,
      mode: "disabled-missing-config",
      limit: 5,
      remaining: null,
      retryAfterSec: null,
    });
    expect(disabled).toEqual({
      "x-ratelimit-mode": "disabled-missing-config",
      "x-ratelimit-limit": "5",
    });
  });
});
