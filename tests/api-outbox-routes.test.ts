import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as cronGet,
  POST as cronPost,
} from "@/app/api/cron/email-outbox/route";
import { POST as resend } from "@/app/api/admin/email-outbox/[id]/resend/route";

const CRON_SECRET = "test-cron-secret-value";
const ENV_KEYS = [
  "CRON_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SESSION_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
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
  return new Request("http://localhost/api/cron/email-outbox", { headers });
}

describe("GET/POST /api/cron/email-outbox — never an open mail trigger", () => {
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
    const res = await cronGet(
      cronReq({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("POST behaves exactly like GET (manual kick)", async () => {
    process.env.CRON_SECRET = CRON_SECRET;
    const res = await cronPost(
      cronReq({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});

describe("POST /api/admin/email-outbox/[id]/resend — session guarded", () => {
  const ctx = { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) };

  it("401s without an admin session", async () => {
    const res = await resend(
      new Request("http://localhost/api/admin/email-outbox/x/resend", {
        method: "POST",
      }),
      ctx,
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });
});