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
import { POST as login } from "@/app/api/admin/login/route";
import { loginErrorMessage } from "@/lib/admin/login-messages";
import { checkRateLimit, refundRateLimit } from "@/lib/rate-limit";
import { startUpstashStub, type UpstashStub } from "./helpers/upstash-stub";

/**
 * Regression suite for the admin lockout incident.
 *
 * What happened: an owner with entirely correct credentials was locked out and
 * told "Wrong username or password." The server was refusing them with
 * `429 rate_limited` — carrying a `retry_after` it had read from Redis — and the
 * login page collapsed that into the wrong-password branch, discarding the
 * countdown. Each retry burned another attempt.
 *
 * Two defects, both fixed here:
 *   1. the page had no distinct copy for a temporary lockout, and
 *   2. a *successful* login consumed one of the five attempts, so ordinary
 *      typos could lock the owner out of their own console.
 *
 * This file pins both, plus the refund primitive itself.
 */

const KEYS = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VERCEL_ENV",
  "NODE_ENV",
  "ALLOW_UNTHROTTLED_ADMIN",
];
const saved: Record<string, string | undefined> = {};
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

const IP = "198.51.100.77";

beforeAll(() => {
  for (const k of KEYS) {
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
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  errorSpy.mockClear();
  warnSpy.mockClear();
});

function loginReq(password: string, ip = IP): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ username: "chief", password }),
  });
}

async function withStub(fn: (stub: UpstashStub) => Promise<void>) {
  const stub = await startUpstashStub();
  try {
    process.env.UPSTASH_REDIS_REST_URL = stub.url;
    process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";
    await fn(stub);
  } finally {
    await stub.close();
  }
}

describe("loginErrorMessage — a lockout is not a wrong password", () => {
  it("never reports rate_limited as bad credentials", () => {
    // The exact defect: this string is what the owner was shown.
    expect(loginErrorMessage("rate_limited", 716)).not.toContain(
      "Wrong username or password",
    );
  });

  it("tells the owner their credentials are not the problem", () => {
    const msg = loginErrorMessage("rate_limited", 716);
    expect(msg).toContain("Too many attempts");
    expect(msg).toContain("not the problem");
    // 716s rounds up to 12 minutes.
    expect(msg).toContain("12 minutes");
  });

  it("uses a singular minute when the wait rounds to one", () => {
    expect(loginErrorMessage("rate_limited", 30)).toContain("1 minute.");
    expect(loginErrorMessage("rate_limited", 30)).not.toContain("1 minutes");
  });

  it("still says something useful when the server sent no TTL", () => {
    const msg = loginErrorMessage("rate_limited", null);
    expect(msg).toContain("Too many attempts");
    expect(msg).not.toMatch(/\d+ minutes?/);
  });

  it("keeps a genuine wrong password distinct", () => {
    expect(loginErrorMessage("invalid_credentials")).toBe(
      "Wrong username or password.",
    );
  });

  it("explains a fail-closed 503 as deliberate rather than blaming the password", () => {
    const msg = loginErrorMessage("rate_limiter_unavailable");
    expect(msg).not.toContain("Wrong username");
    expect(msg).toContain("deliberate");
  });

  it("keeps the misconfiguration message specific", () => {
    expect(loginErrorMessage("admin_not_configured")).toContain(
      "ADMIN_SESSION_SECRET",
    );
  });

  it("falls back honestly on an unknown error", () => {
    expect(loginErrorMessage("something_new")).toBe("Sign-in failed. Try again.");
    expect(loginErrorMessage(undefined)).toBe("Sign-in failed. Try again.");
  });
});

describe("a successful login does not spend the owner's budget", () => {
  beforeEach(() => {
    // Counters live per IP, so each test gets its own.
  });

  it("allows many consecutive correct logins (limit is 5/15min)", async () => {
    await withStub(async () => {
      for (let i = 0; i < 12; i++) {
        const res = await login(loginReq("hunter2-secret", "198.51.100.101"));
        expect(res.status, `login ${i + 1} must succeed`).toBe(200);
        expect(res.headers.get("x-ratelimit-mode")).toBe("enabled");
      }
    });
  });

  it("a wrong password still consumes the budget", async () => {
    await withStub(async () => {
      // Failures are what the limit exists to stop, so they must count.
      const first = await login(loginReq("nope", "198.51.100.102"));
      expect(first.status).toBe(401);
      expect(first.headers.get("x-ratelimit-remaining")).toBe("4");

      const second = await login(loginReq("nope", "198.51.100.102"));
      expect(second.headers.get("x-ratelimit-remaining")).toBe("3");
    });
  });

  it("mistyped-then-correct still leaves budget for the next attempt", async () => {
    await withStub(async () => {
      // Two typos, then the right password, then another typo. The refund
      // means the successful attempt is not counted: 4 requests, 3 net hits,
      // so 2 of the 5 attempts remain — and without the refund it would be 1.
      await login(loginReq("typo1", "198.51.100.103"));
      await login(loginReq("typo2", "198.51.100.103"));
      const ok = await login(loginReq("hunter2-secret", "198.51.100.103"));
      expect(ok.status).toBe(200);

      const next = await login(loginReq("typo3", "198.51.100.103"));
      expect(next.status).toBe(401);
      expect(next.headers.get("x-ratelimit-remaining")).toBe("2");
    });
  });

  it("six wrong passwords in a row still lock the device out", async () => {
    await withStub(async () => {
      // The refund must not become a bypass: nobody guessing gets one.
      for (let i = 1; i <= 5; i++) {
        const res = await login(loginReq("guessing", "198.51.100.104"));
        expect(res.status).toBe(401);
      }
      const sixth = await login(loginReq("guessing", "198.51.100.104"));
      expect(sixth.status).toBe(429);
      expect((await sixth.json()).error).toBe("rate_limited");
      expect(Number(sixth.headers.get("Retry-After"))).toBeGreaterThan(0);
    });
  });
});

describe("checkRateLimit reports what it actually consumed", () => {
  it("consumed is true only when the counter was incremented", async () => {
    await withStub(async () => {
      const allowed = await checkRateLimit({
        name: "consume-probe",
        limit: 5,
        windowSec: 900,
        onFailure: "open",
        ip: "198.51.100.105",
      });
      expect(allowed.consumed).toBe(true);
    });
  });

  it("consumed is false when the limiter is disabled", () => {
    // No UPSTASH_* here, so nothing was charged and nothing may be refunded.
    const disabled = checkRateLimit({
      name: "consume-probe",
      limit: 5,
      windowSec: 900,
      onFailure: "open",
      ip: "198.51.100.106",
    });
    return expect(disabled).resolves.toMatchObject({
      mode: "disabled-missing-config",
      consumed: false,
    });
  });
});

describe("refundRateLimit", () => {
  it("hands one hit back", async () => {
    await withStub(async () => {
      const before = await checkRateLimit({
        name: "refund-probe",
        limit: 5,
        windowSec: 900,
        onFailure: "open",
        ip: "198.51.100.107",
      });
      expect(before.consumed).toBe(true);
      expect(before.remaining).toBe(4);

      await refundRateLimit({ name: "refund-probe", ip: "198.51.100.107" });

      const after = await checkRateLimit({
        name: "refund-probe",
        limit: 5,
        windowSec: 900,
        onFailure: "open",
        ip: "198.51.100.107",
      });
      // Charged again inside `after`, so 4 means the refund worked.
      expect(after.remaining).toBe(4);
    });
  });

  it("removes the key rather than leaving a counter below zero", async () => {
    await withStub(async (stub) => {
      // Refund with no charge ever made: DECR would create the key at -1.
      await refundRateLimit({ name: "never-charged", ip: "198.51.100.108" });

      const del = stub.commands.filter((c) => c.startsWith("DEL "));
      expect(del.length).toBeGreaterThan(0);
      expect(del.some((c) => c.includes("never-charged"))).toBe(true);

      // And the key must read as absent, not as -1.
      const probe = await checkRateLimit({
        name: "never-charged",
        limit: 5,
        windowSec: 900,
        onFailure: "open",
        ip: "198.51.100.108",
      });
      expect(probe.remaining).toBe(4);
    });
  });

  it("is a no-op when Redis is unconfigured", async () => {
    // No stub in this test: the refund must not throw or reach anywhere.
    await expect(
      refundRateLimit({ name: "no-config", ip: "198.51.100.109" }),
    ).resolves.toBeUndefined();
  });

  it("leaves the hit standing if Redis errors (fail-closed direction)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";
    await expect(
      refundRateLimit({ name: "dead-probe", ip: "198.51.100.110" }),
    ).resolves.toBeUndefined();
    // A security control failing to refund must never throw into the request
    // path — it just means the owner spends one attempt.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("refund failed"),
    );
  });
});