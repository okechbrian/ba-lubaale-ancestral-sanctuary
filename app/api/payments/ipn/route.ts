import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getPaymentById, getPaymentByRef } from "@/lib/db/payments";
import { verifyAndSettle } from "@/lib/payments/settle";

export const dynamic = "force-dynamic";

function ackBody(trackingId: string, merchantRef: string, type: string): Response {
  return Response.json({
    orderNotificationType: type || "IPNCHANGE",
    orderTrackingId: trackingId,
    orderMerchantReference: merchantRef,
    status: 200,
  });
}

/**
 * Shared IPN handler (POST body or query params). Pesapal's IPN carries no
 * HMAC signature, so nothing here is trusted: we look up OUR payment row by
 * the tracking id and hand it to `verifyAndSettle`, which re-queries
 * GetTransactionStatus with our own bearer token, cross-checks
 * currency/amount, and only then completes the payment. The reconciliation
 * sweep (cron + admin Re-check) calls that very same function, so there is one
 * settlement path, not two.
 *
 * Completion happens in ONE database transaction that also queues the emails in
 * `email_outbox` — any failure rolls all of it back and returns 503 so the
 * provider retries. Nothing is sent from this request: a separate processor
 * delivers the queued mail, which is what makes "payment settled, guest never
 * told" impossible. A voucher purchase (no booking) takes its own path, where
 * the transaction issues the redeemable code.
 * Always acks 200 when it understood the event.
 */
async function handle(params: {
  trackingId: string;
  merchantRef: string;
  type: string;
}): Promise<Response> {
  const { trackingId, merchantRef, type } = params;

  let payment;
  try {
    payment = await getPaymentByRef(trackingId);
    if (!payment && merchantRef) {
      payment = await getPaymentById(merchantRef);
    }
    if (!payment) {
      console.warn(`pesapal ipn: unknown tracking id ${trackingId.slice(0, 8)}…`);
      return ackBody(trackingId, merchantRef, type);
    }
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    throw err;
  }

  try {
    const settled = await verifyAndSettle(payment, {
      trackingId,
      merchantRef,
      type,
      mode: "ipn",
    });
    if (settled.result === "provider_unavailable") {
      return Response.json({ error: "provider_unavailable" }, { status: 503 });
    }
    // Everything else is acked: settled, duplicate, already settled, rejected
    // (a human reviews the still-pending row) or not yet settled.
    return ackBody(trackingId, merchantRef, type);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "pesapal ipn apply failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "ipn_failed" }, { status: 503 });
  }
}
function readTracking(body: unknown, url: URL): {
  trackingId: string;
  merchantRef: string;
  type: string;
} | null {
  const fromQuery = url.searchParams.get("OrderTrackingId") ||
    url.searchParams.get("orderTrackingId");
  const refQuery = url.searchParams.get("OrderMerchantReference") ||
    url.searchParams.get("orderMerchantReference");
  const typeQuery = url.searchParams.get("OrderNotificationType") || "";
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    const tracking = b.orderTrackingId ?? b.OrderTrackingId ?? fromQuery;
    const ref = b.orderMerchantReference ?? b.OrderMerchantReference ?? refQuery ?? "";
    const type = (b.orderNotificationType as string) || typeQuery || "IPNCHANGE";
    if (typeof tracking === "string" && tracking) {
      return { trackingId: tracking, merchantRef: String(ref), type };
    }
  }
  if (fromQuery) {
    return { trackingId: fromQuery, merchantRef: refQuery || "", type: typeQuery };
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }
  const url = new URL(request.url);
  const params = readTracking(json, url);
  if (!params) {
    return Response.json({ error: "missing_order_tracking_id" }, { status: 400 });
  }
  return handle(params);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = readTracking(null, url);
  if (!params) {
    return Response.json({ error: "missing_order_tracking_id" }, { status: 400 });
  }
  return handle(params);
}
