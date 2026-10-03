import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listGroupInquiries, markInquiryHandled } from "@/lib/db/growth";

export const dynamic = "force-dynamic";

/**
 * GET    /api/admin/inquiries — every group enquiry, newest first.
 * PATCH  /api/admin/inquiries?id=… — mark one handled.
 *
 * Read-only apart from the handled flag: an enquiry is the operator's record of
 * a conversation, so nothing here can edit or delete their words.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const inquiries = await listGroupInquiries();
    return Response.json({ ok: true, inquiries });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "inquiry list failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "inquiries_unavailable" }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const updated = await markInquiryHandled(id);
    if (!updated) {
      // Already handled, or no such enquiry — say which is which.
      const inquiries = await listGroupInquiries(200);
      const found = inquiries.some((i) => i.id === id);
      return Response.json(
        found ? { error: "already_handled" } : { error: "not_found" },
        { status: found ? 409 : 404 },
      );
    }
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "inquiry update failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "inquiry_update_failed" }, { status: 500 });
  }
}