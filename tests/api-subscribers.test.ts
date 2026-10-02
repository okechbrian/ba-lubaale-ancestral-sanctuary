import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as subscribe } from "@/app/api/subscribers/route";
import { GET as confirm } from "@/app/subscribe/confirm/route";
import { GET as unsubscribe } from "@/app/subscribe/unsubscribe/route";
import { startUpstashStub } from "./helpers/upstash-stub";

const ENV_KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SMTP_USER",
  "SMTP_PASS",
];

const saved: Record<string, string | undefined> = {};
// The limiter warns ONCE per process per bucket, and earlier tests in this
// file already trigger it — track it independently of the per-test spy.
let disabledWarned = false;
const warnSpy = vi.spyOn(console, "warn").mockImplementation((...args) => {
  if (String(args[0]).includes("[rate-limit] subscribe is DISABLED")) {
    disabledWarned = true;
  }
});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeAll(() => {
  for (const k of ENV_KEYS) {
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

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  warnSpy.mockClear();
  errorSpy.mockClear();
});

function postSubscribe(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return subscribe(
    new Request("http://localhost/api/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/subscribers — validation", () => {
  it("400s an invalid email with a field-level issue", async () => {
    const res = await postSubscribe({ email: "not-an-email" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(
      body.issues.some((i: { path: string }) => i.path === "email"),
    ).toBe(true);
  });

  it("400s invalid JSON", async () => {
    const res = await postSubscribe("not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("400s a filled honeypot loudly, without leaking the field name", async () => {
    const res = await postSubscribe({
      email: "someone@example.com",
      website: "spam.example",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(body.issues).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("website");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("subscribe honeypot triggered ip="),
    );
  });

  it("503s database_not_configured for a valid address with no database", async () => {
    const res = await postSubscribe({ email: "someone@example.com" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});

describe("POST /api/subscribers — rate limiting (5/15min, fail-open)", () => {
  it("runs with the limiter disabled LOUDLY when UPSTASH keys are missing", async () => {
    const res = await postSubscribe({ email: "someone@example.com" });
    expect(res.status).toBe(503); // DB missing — the point is the header
    expect(res.headers.get("x-ratelimit-mode")).toBe(
      "disabled-missing-config",
    );
    expect(disabledWarned).toBe(true);
  });

  it("fails OPEN when the backend is unreachable (signup stays up, loudly)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";

    const res = await postSubscribe({ email: "someone@example.com" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
    expect(res.headers.get("x-ratelimit-mode")).toBe("fail-open");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("fail-open"));
  });

  it("429s the 6th request within the window (real HTTP backend)", async () => {
    const stub = await startUpstashStub();
    try {
      process.env.UPSTASH_REDIS_REST_URL = stub.url;
      process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";

      for (let i = 1; i <= 5; i++) {
        const res = await postSubscribe(
          { email: `person${i}@example.com` },
          { "x-forwarded-for": "198.51.100.77" },
        );
        expect(res.status).toBe(503); // DB unset — counting already happened
        expect(res.headers.get("x-ratelimit-mode")).toBe("enabled");
      }

      const sixth = await postSubscribe(
        { email: "person6@example.com" },
        { "x-forwarded-for": "198.51.100.77" },
      );
      expect(sixth.status).toBe(429);
      const body = await sixth.json();
      expect(body.error).toBe("rate_limited");
      expect(body.retry_after).toBeGreaterThan(0);
      expect(sixth.headers.get("x-ratelimit-mode")).toBe("enabled");
    } finally {
      await stub.close();
    }
  });
});

function linkReq(url: string): Request {
  return new Request(url);
}

describe("GET /subscribe/confirm — honest outcomes without a database", () => {
  it("400s when the link has no token (never touches the database)", async () => {
    const res = await confirm(linkReq("http://localhost/subscribe/confirm"));
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("confirmation link is incomplete");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });

  it("503s honestly when a token is present but no database is configured", async () => {
    const res = await confirm(
      linkReq("http://localhost/subscribe/confirm?token=abc123"),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("not available right now");
  });
});

describe("GET /subscribe/unsubscribe — honest outcomes without a database", () => {
  it("400s when the link has no token", async () => {
    const res = await unsubscribe(
      linkReq("http://localhost/subscribe/unsubscribe"),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("unsubscribe link is incomplete");
  });

  it("503s honestly when a token is present but no database is configured", async () => {
    const res = await unsubscribe(
      linkReq("http://localhost/subscribe/unsubscribe?token=abc123"),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("not available right now");
  });
});
