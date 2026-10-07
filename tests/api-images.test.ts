import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/admin/content/images/sign/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import {
  buildCmsObjectPath,
  isAllowedCmsType,
  safeStem,
} from "@/lib/cms/storage-path";

/**
 * The sign endpoint authorises one upload and hands the browser a signed
 * Storage URL. It replaced a multipart route that could not work:
 *
 *  - `StoryEditor` posted the raw file with `Content-Type: image/jpeg`, so
 *    `request.formData()` threw and every cover upload returned `invalid_form`.
 *  - it then read `body.url` while the route returned `src`, so it would have
 *    failed even with a correct request.
 *  - and the route advertised an 8 MB limit that Vercel's 4.5 MB request-body
 *    ceiling made unreachable — its 413 branch could never fire.
 *
 * These tests pin the contract that replaced all three: the object path is
 * built server-side (the browser is told where to write, not allowed to
 * choose), the type allowlist holds, and no secret is ever needed client-side.
 */

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

function signReq(body: unknown, auth?: string, raw = false): Request {
  return new Request("http://localhost/api/admin/content/images/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Cookie: auth } : {}),
    },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

const valid = {
  filename: "lake at dusk.png",
  contentType: "image/png",
  size: 1024,
};

describe("POST /api/admin/content/images/sign", () => {
  it("401s without an admin session", async () => {
    const res = await POST(signReq(valid));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("400s on unparseable JSON", async () => {
    const res = await POST(signReq("{not json", await cookie(), true));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("400s on a non-object body", async () => {
    // The old multipart route read `.website` off the parsed body before
    // validating, so null / "text" / 42 / [] were a TypeError and a 500.
    for (const body of [null, "text", 42, []]) {
      const res = await POST(signReq(body, await cookie()));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error, JSON.stringify(body)).toBe(
        "invalid_request",
      );
    }
  });

  it("400s on an unsupported type, including a phone's HEIC", async () => {
    for (const contentType of [
      "application/pdf",
      "image/heic",
      "image/heif",
      "text/html",
    ]) {
      const res = await POST(
        signReq({ ...valid, contentType }, await cookie()),
      );
      expect(res.status, contentType).toBe(400);
      expect((await res.json()).error).toBe("unsupported_type");
    }
  });

  it("400s when the declared size exceeds the bucket limit", async () => {
    const res = await POST(
      signReq({ ...valid, size: 8 * 1024 * 1024 + 1 }, await cookie()),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("400s on a zero or negative size", async () => {
    for (const size of [0, -1]) {
      const res = await POST(signReq({ ...valid, size }, await cookie()));
      expect(res.status).toBe(400);
    }
  });

  it("400s when required fields are missing", async () => {
    for (const body of [
      {},
      { filename: "a.png" },
      { filename: "a.png", contentType: "image/png" },
      { contentType: "image/png", size: 10 },
    ]) {
      const res = await POST(signReq(body, await cookie()));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error).toBe("invalid_request");
    }
  });

  it("503s for a valid request when the database is missing", async () => {
    const res = await POST(signReq(valid, await cookie()));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});

describe("cms object-path policy", () => {
  // The path is built server-side on purpose: the browser is told where to
  // write, never allowed to choose. So these are behavioural tests on the
  // policy itself, not on the route's plumbing.

  it("never lets a filename escape the bucket", () => {
    const hostile = [
      "../../etc/passwd",
      "..\\..\\windows\\system32\\evil.png",
      "/absolute/path/photo.png",
      "a/b/c/photo.png",
      "....//....//x.png",
      " null.png",
    ];
    for (const filename of hostile) {
      const path = buildCmsObjectPath(filename, "image/png", 1700000000000);
      // The security property is that nothing structural survives: no
      // separator, no traversal, and a fixed `<timestamp>-<slug>.<ext>` shape.
      // Whatever words remain are inert text, so assert the shape rather than
      // an exact slug.
      expect(path, filename).not.toContain("/");
      expect(path, filename).not.toContain("\\");
      expect(path, filename).not.toContain("..");
      expect(path, filename).toMatch(/^1700000000000-[a-z0-9-]+\.png$/);
    }
  });

  it("reduces awkward names to a clean slug", () => {
    expect(safeStem("Lake at Dusk (1).jpg")).toBe("lake-at-dusk-1");
    expect(safeStem("  ___weird__name___.PNG ")).toBe("weird-name");
    // Non-ASCII is flattened to a single hyphen rather than transliterated,
    // so each run of unusable characters becomes one separator.
    expect(safeStem("Ünïcode ñame.jpg")).toBe("n-code-ame");
    // A name with nothing usable left still yields a usable key.
    expect(safeStem("日本語.jpg")).toBe("photo");
  });

  it("caps the stem length so a long name cannot bloat the key", () => {
    const path = buildCmsObjectPath(`${"a".repeat(300)}.png`, "image/png", 42);
    expect(path.startsWith("42-aaa")).toBe(true);
    expect(path.length).toBeLessThanOrEqual(42 + 1 + 60 + 1 + 4);
  });

  it("uses the right extension per type", () => {
    const at = 7;
    expect(buildCmsObjectPath("x.jpg", "image/jpeg", at)).toBe("7-x.jpg");
    expect(buildCmsObjectPath("x.png", "image/png", at)).toBe("7-x.png");
    expect(buildCmsObjectPath("x.webp", "image/webp", at)).toBe("7-x.webp");
    expect(buildCmsObjectPath("x.avif", "image/avif", at)).toBe("7-x.avif");
  });

  it("gives two uploads of the same name distinct keys", () => {
    const a = buildCmsObjectPath("photo.jpg", "image/jpeg", 1000);
    const b = buildCmsObjectPath("photo.jpg", "image/jpeg", 1001);
    expect(a).not.toBe(b);
  });

  it("rejects a phone's HEIC/HEIF and anything not on the allowlist", () => {
    for (const t of [
      "image/heic",
      "image/heif",
      "application/pdf",
      "text/html",
      "image/svg+xml",
      "image/gif",
    ]) {
      expect(isAllowedCmsType(t), t).toBe(false);
    }
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
      expect(isAllowedCmsType(t), t).toBe(true);
    }
  });
});