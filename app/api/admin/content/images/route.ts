import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError, getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const BUCKET = "cms";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Owner photo upload for the CMS image pickers. Admin session required;
 * files land in the public `cms` bucket and the returned `src` is its public
 * URL. Type and size are enforced server-side; nothing is silently accepted.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "missing_file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: "unsupported_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 413 });
  }

  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "photo";
  const name = `${Date.now()}-${base}.${EXT[file.type]}`;

  try {
    const db = getDb();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await db.storage.from(BUCKET).upload(name, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error("cms upload failed:", error.message);
      return Response.json({ error: "upload_failed" }, { status: 500 });
    }
    const { data } = db.storage.from(BUCKET).getPublicUrl(name);
    return Response.json({ src: data.publicUrl });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "cms upload error:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "upload_failed" }, { status: 500 });
  }
}
