import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as cronGet,
  POST as cronPost,
} from "@/app/api/cron/payment-reconcile/route";
import { POST as recheck } from "@/app/api/admin/payments/[id]/recheck/route";

const CRON_SECRET = "test-recon-cron-secret";
const ENV_KEYS = [
  "CRON_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SESSION_SECRET",
];

const saved: Record<string, string | undefined> = {};
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeAll(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  errorSpy.mockRestore();
});

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  errorSpy.mockClear();
});

function cronReq(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/payment-reconcile", { headers });
}

describe("GET/POST /api/cron/payment-reconcile - never an open trigger", () => {
  it("refuses when CRON_SECRET is unset, loudly (503)", async () => {
    const res = await cronGet(cronReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("cron_secret_missing");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("CRON_SECRET is not set"),
    );
  });

  it("401s a missing or wrong bearer token", async () => {
    process.env.CRON_SECRET = CRON_SECRET;
    const attempts: Record<string, string>[] = [
      {},
      { authorization: "Bearer wrong-secret" },
      { authorization: CRON_SECRET }, // no Bearer prefix
      { authorization: `Bearer ${CRON_SECRET}x` }, // longer
      { authorization: `Bearer ${CRON_SECRET.slice(0, -1)}` }, // shorter
    ];
    for (const headers of attempts) {
      const res = await cronGet(cronReq(headers));
      expect(res.status, JSON.stringify(headers)).toBe(401);
      expect((await res.json()).error).toBe("unauthorized");
    }
  });

  it("accepts the cron bearer, then reports an honest 503 without a database", async () => {
    process.env.CRON_SECRET = CRON_SECRET;
    for (const handler of [cronGet, cronPost]) {
      const res = await handler(
        cronReq({ authorization: `Bearer ${CRON_SECRET}` }),
      );
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe("database_not_configured");
    }
  });
});

describe("POST /api/admin/payments/[id]/recheck - session guarded", () => {
  it("401s without an admin session, before touching anything", async () => {
    const res = await recheck(
      new Request("http://localhost/api/admin/payments/x/recheck", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });
});
