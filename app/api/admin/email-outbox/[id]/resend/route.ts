import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getOutboxRow, requeueOutboxRow } from "@/lib/db/email-outbox";
import { processEmailOutbox } from "@/lib/email/outbox";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/email-outbox/[id]/resend — the "Resend" button in
 * /admin/emails for a row that exhausted its attempts.
 *
 * The row is requeued (attempt counter reset so the backoff starts fresh,
 * `resends` incremented, already-sent rows refused by the database) and then
 * delivered inline, so the owner sees the outcome on the same click instead of
 * waiting for the next cron tick. Session-guarded, like every admin route.
 */
export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    const requeued = await requeueOutboxRow(id);
    if (!requeued) {
      // Either no such row, or it is already `sent` — the RPC refuses both.
      return Response.json({ error: "not_resendable" }, { status: 409 });
    }

    const result = await processEmailOutbox({ limit: 1 });
    // Re-read so the UI shows the durable state, not our optimism.
    const row = await getOutboxRow(id);
    return Response.json({
      ok: row?.status === "sent",
      status: row?.status ?? requeued.status,
      attempts: row?.attempts ?? requeued.attempts,
      last_error: row?.last_error ?? null,
      resends: row?.resends ?? requeued.resends,
      processed: result.claimed,
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      `[email-outbox] resend failed for ${id}:`,
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "resend_failed" }, { status: 500 });
  }
}