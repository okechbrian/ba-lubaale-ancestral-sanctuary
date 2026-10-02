import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/admin/content/images/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";

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

function uploadReq(file: File | null, auth?: string): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/admin/content/images", {
    method: "POST",
    headers: auth ? { Cookie: auth } : {},
    body: form,
  });
}

function fileOf(
  bytes: Uint8Array | number[],
  name: string,
  type: string,
): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("POST /api/admin/content/images", () => {
  it("401s without an admin session", async () => {
    const res = await POST(
      uploadReq(fileOf([1, 2, 3], "x.png", "image/png")),
    );
    expect(res.status).toBe(401);
  });

  it("400s when no file is attached", async () => {
    const res = await POST(uploadReq(null, await cookie()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_file");
  });

  it("400s on an unsupported file type", async () => {
    const res = await POST(
      uploadReq(fileOf([1], "notes.pdf", "application/pdf"), await cookie()),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("unsupported_type");
  });

  it("413s when the file exceeds 8 MB", async () => {
    const big = new Uint8Array(8 * 1024 * 1024 + 1);
    const res = await POST(
      uploadReq(fileOf(big, "big.png", "image/png"), await cookie()),
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe("file_too_large");
  });

  it("503s for a valid upload when the database is missing", async () => {
    const res = await POST(
      uploadReq(fileOf([137, 80], "ok.png", "image/png"), await cookie()),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});
