import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { POST as blockedDates } from "@/app/api/admin/blocked-dates/route";
import { POST as saveSettings } from "@/app/api/admin/settings/route";
import { POST as bookingAction } from "@/app/api/admin/bookings/[id]/action/route";
import {
  SESSION_COOKIE,
  createSessionToken,
} from "@/lib/admin/session";

const KEYS = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  // Abuse-protection vars: never inherit a developer's/CI's real config —
  // login must behave as "limiter disabled" here, deterministically.
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
];
const saved: Record<string, string | undefined> = {};

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
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function req(path: string, body: unknown, cookie?: string): Request {
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

describe("POST /api/admin/login", () => {
  it("503s when admin env is missing", async () => {
    const user = process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_USERNAME;
    const res = await login(req("/api/admin/login", { username: "x", password: "y" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("admin_not_configured");
    process.env.ADMIN_USERNAME = user;
  });

  it("401s on wrong credentials", async () => {
    const res = await login(
      req("/api/admin/login", { username: "chief", password: "wrong" }),
    );
    expect(res.status).toBe(401);
  });

  it("200s with an HttpOnly session cookie on correct credentials", async () => {
    const res = await login(
      req("/api/admin/login", { username: "chief", password: "hunter2-secret" }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");
  });

  it("logout clears the cookie", async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("admin write routes require a session", () => {
  it("blocked-dates 401s without cookie", async () => {
    const res = await blockedDates(req("/api/admin/blocked-dates", { action: "add", day: "2027-01-01" }));
    expect(res.status).toBe(401);
  });

  it("settings 401s without cookie", async () => {
    const res = await saveSettings(req("/api/admin/settings", { settings: { ugx_rate: 4000 } }));
    expect(res.status).toBe(401);
  });

  it("booking action 401s without cookie", async () => {
    const res = await bookingAction(
      req("/api/admin/bookings/x/action", { action: "approve" }),
      { params: Promise.resolve({ id: "x" }) },
    );
    expect(res.status).toBe(401);
  });

  it("blocked-dates 503s with cookie but no database", async () => {
    const res = await blockedDates(
      req(
        "/api/admin/blocked-dates",
        { action: "add", day: "2027-01-01" },
        await adminCookie(),
      ),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("booking action 503s with cookie but no database", async () => {
    const res = await bookingAction(
      req(
        "/api/admin/bookings/00000000-0000-0000-0000-000000000000/action",
        { action: "decline" },
        await adminCookie(),
      ),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("rejects invalid settings payload with cookie", async () => {
    const res = await saveSettings(
      req(
        "/api/admin/settings",
        { settings: { deposit_percent: 999 } },
        await adminCookie(),
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_settings");
  });
});
