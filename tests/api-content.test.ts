import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PUT, DELETE } from "@/app/api/admin/content/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { faqDefault } from "@/content/faq";

const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
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

async function cookie(): Promise<string> {
  const token = await createSessionToken("unit-test-secret");
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

function putReq(body: unknown, auth?: string): Request {
  return new Request("http://localhost/api/admin/content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Cookie: auth } : {}),
    },
    body: JSON.stringify(body),
  });
}

function delReq(key: string | null, auth?: string): Request {
  return new Request(
    `http://localhost/api/admin/content${key ? `?key=${encodeURIComponent(key)}` : ""}`,
    { method: "DELETE", headers: auth ? { Cookie: auth } : {} },
  );
}

describe("PUT /api/admin/content", () => {
  it("401s without an admin session", async () => {
    const res = await PUT(putReq({ key: "content:faq", value: faqDefault }));
    expect(res.status).toBe(401);
  });

  it("404s on an unknown block key", async () => {
    const res = await PUT(
      putReq({ key: "content:evil", value: {} }, await cookie()),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("unknown_key");
  });

  it("400s with issues when the content does not match the schema", async () => {
    const res = await PUT(
      putReq({ key: "content:faq", value: { items: [] } }, await cookie()),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_content");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("503s when the database is missing (valid content)", async () => {
    const res = await PUT(
      putReq({ key: "content:faq", value: faqDefault }, await cookie()),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });

  it("validates the guest-voices block (testimonials)", async () => {
    const bad = await PUT(
      putReq(
        {
          key: "content:testimonials",
          value: {
            one: { quote: 7, author: "" },
            two: { quote: "", author: "" },
            three: { quote: "", author: "" },
          },
        },
        await cookie(),
      ),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("invalid_content");

    const good = await PUT(
      putReq(
        {
          key: "content:testimonials",
          value: {
            one: { quote: "Said out loud", author: "A guest" },
            two: { quote: "", author: "" },
            three: { quote: "", author: "" },
          },
        },
        await cookie(),
      ),
    );
    expect(good.status).toBe(503); // valid shape; only the DB is missing
    expect((await good.json()).error).toBe("database_not_configured");
  });

  it("400s on invalid JSON", async () => {
    const res = await PUT(
      new Request("http://localhost/api/admin/content", {
        method: "PUT",
        headers: { Cookie: await cookie() },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/content", () => {
  it("401s without an admin session", async () => {
    const res = await DELETE(delReq("content:faq"));
    expect(res.status).toBe(401);
  });

  it("404s on an unknown or missing key", async () => {
    expect((await DELETE(delReq(null, await cookie()))).status).toBe(404);
    expect(
      (await DELETE(delReq("content:nope", await cookie()))).status,
    ).toBe(404);
  });

  it("503s when the database is missing", async () => {
    const res = await DELETE(delReq("content:faq", await cookie()));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});
