import { z } from "zod";
import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError, getDb } from "@/lib/db/client";
import {
  buildCmsObjectPath,
  CMS_BUCKET,
  CMS_MAX_BYTES,
  isAllowedCmsType,
} from "@/lib/cms/storage-path";

export const dynamic = "force-dynamic";

const signSchema = z
  .object({
    filename: z.string().min(1).max(200),
    contentType: z.string().min(1).max(120),
    size: z.number().int().positive().max(CMS_MAX_BYTES),
  })
  .strict();

/**
 * POST /api/admin/content/images/sign — authorise one upload, then get out of
 * the way.
 *
 * Returns a signed Storage URL the browser PUTs the bytes to directly. The
 * photo never passes through a serverless function, which removes the 4.5 MB
 * request-body ceiling that made large CMS photos fail.
 *
 * The object path is built HERE, never taken from the request: the browser is
 * told where to write, not allowed to choose. That keeps every upload inside
 * the bucket, keeps the `Date.now()` prefix that prevents collisions, and
 * means a compromised client cannot overwrite an existing object.
 *
 * The signed URL's token is the only credential the browser needs, and on this
 * project it expires after ~10 minutes — so the upload must follow promptly.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (!isAllowedCmsType(input.contentType)) {
    return Response.json({ error: "unsupported_type" }, { status: 400 });
  }

  const path = buildCmsObjectPath(input.filename, input.contentType);

  try {
    const db = getDb();
    const { data, error } = await db.storage
      .from(CMS_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.signedUrl) {
      console.error(
        "cms sign failed:",
        error?.message ?? "no signed url returned",
      );
      return Response.json({ error: "upload_sign_failed" }, { status: 500 });
    }
    const { data: pub } = db.storage.from(CMS_BUCKET).getPublicUrl(path);
    return Response.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: pub.publicUrl,
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "cms sign error:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "upload_sign_failed" }, { status: 500 });
  }
}