import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { recheckPayment } from "@/lib/payments/reconcile";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/payments/[id]/recheck - the "Re-check" button in
 * /admin/payments.
 *
 * Asks Pesapal about this one payment right now and settles it through the same
 * verified, atomic path as the IPN and the cron sweep. The admin cannot mark a
 * payment paid: the only thing this route can do is let the provider's own
 * answer take effect. Session-guarded, like every admin route.
 */
export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return Response.json({ error: "invalid_payment_id" }, { status: 400 });
  }

  try {
    const out = await recheckPayment(id, "admin");
    if (!out.found) {
      return Response.json({ error: "payment_not_found" }, { status: 404 });
    }
    if (!out.recheckable) {
      return Response.json(
        { error: "not_recheckable", status: out.status },
        { status: 409 },
      );
    }
    const settle = out.settle;
    if (settle.result === "provider_unavailable") {
      return Response.json({ error: "provider_unavailable" }, { status: 503 });
    }
    return Response.json({
      ok: settle.result === "settled" || settle.result === "already_completed" ||
        settle.result === "duplicate",
      result: settle.result,
      ...(settle.result === "rejected" ? { reason: settle.reason } : {}),
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      `[payment-recheck] failed for ${id}:`,
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "recheck_failed" }, { status: 500 });
  }
}
