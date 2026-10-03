import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as sendInquiry } from "@/app/api/group-inquiries/route";
import {
  GET as listStories,
  POST as saveStory,
  DELETE as removeStory,
} from "@/app/api/admin/stories/route";
import { GET as listInquiries, PATCH as patchInquiry } from "@/app/api/admin/inquiries/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { startUpstashStub } from "./helpers/upstash-stub";

const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "OWNER_NOTIFY_EMAIL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
];

// Official Cloudflare Turnstile test keys (docs: always pass / always fail).
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

function jsonReq(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function adminRequest(url: string, init: RequestInit = {}): Promise<Request> {
  const token = await createSessionToken("unit-test-secret");
  return new Request(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    },
  });
}

const inquiry = {
  name: "Amos",
  email: "amos@example.test",
  organisation: "Ssese Tours",
  group_size: 14,
  window: "July, flexible",
  message: "We run a circuit and would like to stop for a night.",
};

describe("POST /api/group-inquiries — abuse stack", () => {
  it("rejects a malformed body before touching anything", async () => {
    const res = await sendInquiry(jsonReq("http://localhost/api/group-inquiries", "POST", { name: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("503s honestly when the database is not configured", async () => {
    const res = await sendInquiry(
      jsonReq("http://localhost/api/group-inquiries", "POST", inquiry),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("rejects a filled honeypot without leaking the field name", async () => {
    const res = await sendInquiry(
      jsonReq("http://localhost/api/group-inquiries", "POST", {
        ...inquiry,
        website: "spam.example",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(JSON.stringify(body)).not.toContain("website");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("group-inquiries honeypot triggered"),
    );
  });

  it("wins before Turnstile: a bot never reaches Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await sendInquiry(
      jsonReq("http://localhost/api/group-inquiries", "POST", {
        ...inquiry,
        website: "spam.example",
      }),
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("x-turnstile-mode")).toBeNull();
  });

  it("403s a missing token once Turnstile is enforced", async () => {
    process.env.TURNSTILE_SECRET_KEY = PASSING_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITEKEY;

    const res = await sendInquiry(
      jsonReq("http://localhost/api/group-inquiries", "POST", inquiry),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("turnstile_required");
    expect(res.headers.get("x-turnstile-mode")).toBe("enabled");
  });

  it("429s the 6th enquiry in the window (real HTTP backend)", async () => {
    const stub = await startUpstashStub();
    try {
      process.env.UPSTASH_REDIS_REST_URL = stub.url;
      process.env.UPSTASH_REDIS_REST_TOKEN = "stub-token";

      for (let i = 1; i <= 5; i++) {
        const res = await sendInquiry(
          jsonReq("http://localhost/api/group-inquiries", "POST", inquiry),
        );
        // Counting happens before the database check, so 503 db each time.
        expect(res.status).toBe(503);
        expect(res.headers.get("x-ratelimit-mode")).toBe("enabled");
        expect(res.headers.get("x-ratelimit-remaining")).toBe(String(5 - i));
      }

      const sixth = await sendInquiry(
        jsonReq("http://localhost/api/group-inquiries", "POST", inquiry),
      );
      expect(sixth.status).toBe(429);
      expect((await sixth.json()).error).toBe("rate_limited");
      expect(Number(sixth.headers.get("Retry-After"))).toBeGreaterThan(0);
    } finally {
      await stub.close();
    }
  });

  it("fails OPEN when the limiter backend is down (an enquiry is not worth an outage)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:9";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dead";

    const res = await sendInquiry(
      jsonReq("http://localhost/api/group-inquiries", "POST", inquiry),
    );
    expect(res.status).toBe(503); // the DATABASE, not the limiter
    expect(res.headers.get("x-ratelimit-mode")).toBe("fail-open");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("fail-open"),
    );
  });
});

describe("/api/admin/stories — session guarded and validating", () => {
  const url = "http://localhost/api/admin/stories";

  it("401s without a session on every verb", async () => {
    const post = await saveStory(
      jsonReq(url, "POST", { slug: "x", title: "T", excerpt: "E", body: "B" }),
    );
    expect(post.status).toBe(401);
    expect((await post.json()).error).toBe("unauthorized");

    const del = await removeStory(new Request(`${url}?id=x`, { method: "DELETE" }));
    expect(del.status).toBe(401);

    const get = await listStories(new Request(url));
    expect(get.status).toBe(401);
  });

  it("rejects an incomplete story with field-level issues", async () => {
    const res = await saveStory(
      await adminRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "ok-slug", title: "" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(body.issues.map((i: { path: string }) => i.path)).toContain("title");
  });

  it("rejects a cover image that is neither local nor https", async () => {
    const res = await saveStory(
      await adminRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "ok-slug",
          title: "T",
          excerpt: "E",
          body: "B",
          cover_image: "javascript:alert(1)",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects unknown fields", async () => {
    const res = await saveStory(
      await adminRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "ok-slug",
          title: "T",
          excerpt: "E",
          body: "B",
          surprise: true,
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("503s honestly when the database is not configured", async () => {
    const res = await saveStory(
      await adminRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "ok-slug",
          title: "T",
          excerpt: "E",
          body: "B",
        }),
      }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("400s a DELETE without an id", async () => {
    const res = await removeStory(await adminRequest(url, { method: "DELETE" }));
    expect(res.status).toBe(400);
  });
});

describe("/api/admin/inquiries — session guarded", () => {
  const url = "http://localhost/api/admin/inquiries";

  it("401s without a session on GET and PATCH", async () => {
    expect((await listInquiries(new Request(url))).status).toBe(401);
    expect((await patchInquiry(new Request(`${url}?id=x`, { method: "PATCH" }))).status).toBe(401);
  });

  it("400s a PATCH without an id, and 503s without a database", async () => {
    const noId = await patchInquiry(
      await adminRequest(url, { method: "PATCH" }),
    );
    expect(noId.status).toBe(400);

    const withId = await patchInquiry(
      await adminRequest(`${url}?id=00000000-0000-0000-0000-000000000000`, {
        method: "PATCH",
      }),
    );
    expect(withId.status).toBe(503);
    expect((await withId.json()).error).toBe("database_not_configured");
  });
});