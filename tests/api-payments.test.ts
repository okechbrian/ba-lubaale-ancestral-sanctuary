import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as ipn } from "@/app/api/payments/ipn/route";
import { POST as bookingAction } from "@/app/api/admin/bookings/[id]/action/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";

const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PESAPAL_ENV",
  "PESAPAL_CONSUMER_KEY",
  "PESAPAL_CONSUMER_SECRET",
  "PESAPAL_IPN_URL",
  "ADMIN_SESSION_SECRET",
];
const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.ADMIN_SESSION_SECRET = "unit-test-secret";
});

afterAll(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function jsonReq(path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function adminCookie(): Promise<string> {
  const token = await createSessionToken("unit-test-secret");
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

describe("POST /api/payments/checkout", () => {
  it("401s without an admin session", async () => {
    const res = await checkout(
      jsonReq("/api/payments/checkout", {
        booking_id: "00000000-0000-0000-0000-000000000000",
        kind: "deposit",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("503s when the database is missing", async () => {
    const res = await checkout(
      jsonReq(
        "/api/payments/checkout",
        { booking_id: "00000000-0000-0000-0000-000000000000", kind: "deposit" },
        await adminCookie(),
      ),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("rejects an invalid payload", async () => {
    const res = await checkout(
      jsonReq("/api/payments/checkout", { booking_id: "nope", kind: "gas" }, await adminCookie()),
    );
    expect(res.status).toBe(400);
  });
});

describe("approve action without payment provider", () => {
  it("503s payment_provider_unavailable (never approves without checkout)", async () => {
    const res = await bookingAction(
      jsonReq(
        "/api/admin/bookings/00000000-0000-0000-0000-000000000000/action",
        { action: "approve" },
        await adminCookie(),
      ),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("payment_provider_unavailable");
  });
});

describe("POST /api/payments/ipn", () => {
  it("400s without an order tracking id", async () => {
    const res = await ipn(jsonReq("/api/payments/ipn", { hello: "world" }));
    expect(res.status).toBe(400);
  });

  it("503s (retries) when the database is missing", async () => {
    const res = await ipn(
      jsonReq("/api/payments/ipn", {
        orderNotificationType: "IPNCHANGE",
        orderTrackingId: "track-123",
        orderMerchantReference: "ref-123",
      }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});
