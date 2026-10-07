import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { guardCron } from "@/lib/cron/auth";
import {
  RECONCILE_DEFAULT_LIMIT,
  reconcileStuckPayments,
} from "@/lib/payments/reconcile";

export const dynamic = "force-dynamic";

/**
 * Payment reconciliation sweep. Wired to Vercel Cron in `vercel.json`, which
 * calls it with a GET and `Authorization: Bearer $CRON_SECRET`; POST is there
 * for a manual kick.
 *
 * Finds payments still `initiated` after 30 minutes, asks Pesapal what really
 * happened, and settles them through the SAME verified, atomic path the IPN
 * uses (lib/payments/settle.ts). A payment is never marked paid on our own say
 * so: only Pesapal's authenticated answer, matching currency and amount, can
 * complete one.
 *
 * Never open: an unset `CRON_SECRET` refuses with 503. With nothing stuck the
 * provider is never contacted, so an unconfigured Pesapal does not make an idle
 * cron fail.
 */
async function handle(request: Request): Promise<Response> {
  const refused = guardCron(request, "payment-reconcile");
  if (refused) return refused;

  const limitRaw = Number(
    new URL(request.url).searchParams.get("limit") ?? RECONCILE_DEFAULT_LIMIT,
  );
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.floor(limitRaw)
      : RECONCILE_DEFAULT_LIMIT;

  try {
    const summary = await reconcileStuckPayments({ limit });
    // Nothing could even be checked because the provider was unreachable or
    // unconfigured: report failure so the cron platform shows it.
    if (summary.checked > 0 && summary.unavailable === summary.checked) {
      return Response.json(
        { error: "provider_unavailable", ...summary },
        { status: 503 },
      );
    }
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "[payment-reconcile] sweep failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "reconcile_failed" }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
