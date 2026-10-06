import { z } from "zod";
import { isAdminRequest } from "@/lib/admin/session";
import {
  CMS_REGISTRY,
  InvalidCmsContentError,
  UnknownCmsKeyError,
  deleteContent,
  saveContent,
} from "@/lib/cms";
import { DatabaseNotConfiguredError } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

function errorResponse(err: unknown): Response {
  if (err instanceof UnknownCmsKeyError) {
    return Response.json({ error: "unknown_key" }, { status: 404 });
  }
  if (err instanceof InvalidCmsContentError) {
    return Response.json(
      { error: "invalid_content", issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof DatabaseNotConfiguredError) {
    return Response.json({ error: "database_not_configured" }, { status: 503 });
  }
  console.error(
    "content save failed:",
    err instanceof Error ? err.message : "unknown",
  );
  return Response.json({ error: "content_save_failed" }, { status: 500 });
}

export async function PUT(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    await saveContent(parsed.data.key, parsed.data.value);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !(key in CMS_REGISTRY)) {
    return Response.json({ error: "unknown_key" }, { status: 404 });
  }
  try {
    await deleteContent(key);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
