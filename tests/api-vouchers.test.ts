import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as buyVoucher } from "@/app/api/vouchers/route";
import { GET as pending } from "@/app/api/vouchers/pending/route";
import { POST as adminAction } from "@/app/api/admin/vouchers/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";

const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "PESAPAL_ENV",
  "PESAPAL_CONSUMER_KEY",
  "PESAPAL_CONSUMER_SECRET",
  "PESAPAL_IPN_URL",
];

const PASSING_SECRET = "1x0000000000000000000000000000000AA";
const TEST_SITEKEY = "1x00000000000000000000AA";

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

function post(body: unknown): Request {
  return new Request("http://localhost/api/vouchers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const valid = { amount_usd: 250, email: "buyer@example.test" };

/** Configured-but-unreachable: gets past the price check, fails at the DB. */
function configureProvider(): void {
  process.env.PESAPAL_ENV = "sandbox";
  process.env.PESAPAL_CONSUMER_KEY = "test-key-never-sent";
  process.env.PESAPAL_CONSUMER_SECRET = "test-secret-never-sent";
  process.env.PESAPAL_IPN_URL = "http://localhost/api/payments/ipn";
}

describe("POST /api/vouchers — intake", () => {
  it("refuses a malformed body before any provider call", async () => {
    const res = await buyVoucher(post({ amount_usd: "free", email: "nope" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("requires an amount and a valid email", async () => {
    expect((await buyVoucher(post({ email: "b@example.test" }))).status).toBe(400);
    expect((await buyVoucher(post({ ...valid, email: "nope" }))).status).toBe(400);
    expect(
      (await buyVoucher(post({ ...valid, recipient_email: "nope" }))).status,
    ).toBe(400);
    expect((await buyVoucher(post("not json"))).status).toBe(400);
  });

  it("503s honestly when Pesapal is not configured", async () => {
    const res = await buyVoucher(post(valid));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("payment_provider_unavailable");
  });

  it("503s vouchers_unavailable when no amounts are published", async () => {
    configureProvider();
    // No database => settings read as defaults, whose voucher list is empty.
    const res = await buyVoucher(post(valid));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("vouchers_unavailable");
  });

  it("rejects a filled honeypot without leaking the field name", async () => {
    const res = await buyVoucher(post({ ...valid, website: "spam.example" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(JSON.stringify(body)).not.toContain("website");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("vouchers honeypot triggered"),
    );
  });

  it("403s when Turnstile is enforced but no token was sent", async () => {
    configureProvider();
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await buyVoucher(post(valid));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("turnstile_required");
    expect(res.headers.get("x-turnstile-mode")).toBe("enabled");
  });

  it("rejects an unknown field (strict schema)", async () => {
    configureProvider();
    const res = await buyVoucher(post({ ...valid, surprise: true }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/vouchers/pending", () => {
  it("400s without a payment id", async () => {
    const res = await pending(
      new Request("http://localhost/api/vouchers/pending"),
    );
    expect(res.status).toBe(400);
  });

  it("says paid=false for an unknown id, without a database", async () => {
    const res = await pending(
      new Request("http://localhost/api/vouchers/pending?payment_id=abc"),
    );
    // No database configured => honest 503, never a fake "paid".
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});

describe("POST /api/admin/vouchers — session guarded", () => {
  it("401s without a session, for every action", async () => {
    for (const body of [
      { action: "redeem", code: "ABCD", booking_id: crypto.randomUUID() },
      { action: "void", voucher_id: crypto.randomUUID(), reason: "why" },
    ]) {
      const res = await adminAction(
        new Request("http://localhost/api/admin/vouchers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe("unauthorized");
    }
  });

  it("with a session: rejects a malformed action", async () => {
    const token = await createSessionToken("unit-test-secret");
    const res = await adminAction(
      new Request("http://localhost/api/admin/vouchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        },
        body: JSON.stringify({ action: "redeem", code: "" }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });
});