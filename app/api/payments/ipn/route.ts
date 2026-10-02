import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { claimWebhookEvent, releaseWebhookEvent } from "@/lib/db/webhook-events";
import {
  applyPaymentCompletion,
  getPaymentById,
  getPaymentByRef,
  setPaymentStatus,
} from "@/lib/db/payments";
import { getBooking } from "@/lib/db/bookings";
import { verifyRemotePayment } from "@/lib/payments/state";
import {
  PesapalApiError,
  PesapalNotConfiguredError,
  getTransactionStatus,
} from "@/lib/payments/pesapal";
import { sendAndLog } from "@/lib/email/sender";
import {
  balanceReceivedGuest,
  depositReceivedGuest,
  howToPrepareGuest,
  ownerPaymentReceived,
} from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const CLAIM_PROVIDER = "pesapal";

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
 * the tracking id, re-query GetTransactionStatus with our own bearer token,
 * cross-check currency/amount/reference, and only then complete the payment.
 * Completion applies claim + payment + booking in ONE database transaction —
 * any failure rolls all of it back and returns 503 so the provider retries.
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

  if (payment.status === "completed") {
    return ackBody(trackingId, merchantRef, type); // already settled
  }

  // Authenticated re-verification (the missing HMAC's compensation).
  let remote;
  try {
    remote = await getTransactionStatus(trackingId);
  } catch (err) {
    if (err instanceof PesapalNotConfiguredError || err instanceof PesapalApiError) {
      console.error("pesapal status verify failed:", err.message);
      return Response.json({ error: "provider_unavailable" }, { status: 503 });
    }
    throw err;
  }

  const outcome = verifyRemotePayment(payment, remote);
  if (!outcome.ok) {
    console.error(`pesapal ipn rejected payment=${payment.id}: ${outcome.reason}`);
    return ackBody(trackingId, merchantRef, type); // ack; human reviews pending row
  }

  let claimed = false;
  try {
    if (outcome.status === "completed") {
      // ONE atomic transaction (RPC apply_payment_completion): webhook claim
      // + payment completion + booking status. If ANY step throws, everything
      // — the claim included — rolls back and we 503 below, so Pesapal's
      // retry re-applies from a clean slate. Nothing can half-commit.
      const applied = await applyPaymentCompletion({
        provider: CLAIM_PROVIDER,
        externalId: trackingId,
        paymentId: payment.id,
        redactedPayload: {
          type,
          merchant_reference: merchantRef,
          status_code: remote.statusCode,
        },
      });
      if (!applied.claimed) {
        return ackBody(trackingId, merchantRef, type); // duplicate delivery
      }
      if (applied.first_completion) {
        // The payment is durably committed now. Confirmation emails run
        // OUTSIDE the transaction: an SMTP failure must not fail the webhook
        // (it is logged here; the booking and payment stay settled).
        try {
          const booking = await getBooking(payment.booking_id);
          if (booking) {
            const guest =
              payment.kind === "deposit"
                ? depositReceivedGuest(booking, {
                    totalUsd: Number(booking.amount_usd ?? payment.amount_usd),
                    depositUsd: Number(payment.amount_usd),
                  })
                : balanceReceivedGuest(
                    booking,
                    Number(booking.amount_usd ?? payment.amount_usd),
                  );
            await sendAndLog(
              `payment_received_${payment.kind}_guest`,
              booking.email,
              guest.subject,
              guest.text,
            );
            if (payment.kind === "deposit") {
              // Deposit paid = stay confirmed: send the how-to-prepare guide
              // (same content as /prepare). Inside the same try/catch: an
              // email failure never fails the webhook.
              const guide = howToPrepareGuest(booking);
              await sendAndLog(
                "prepare_guide_guest",
                booking.email,
                guide.subject,
                guide.text,
              );
            }
            const owner = process.env.OWNER_NOTIFY_EMAIL;
            if (owner) {
              const note = ownerPaymentReceived(booking, payment);
              await sendAndLog(
                `payment_received_${payment.kind}_owner`,
                owner,
                note.subject,
                note.text,
              );
            }
          }
        } catch (emailErr) {
          console.error(
            "payment confirmation email failed:",
            emailErr instanceof Error ? emailErr.message : "unknown",
          );
        }
      }
      return ackBody(trackingId, merchantRef, type);
    }

    if (outcome.status === "failed") {
      claimed = await claimWebhookEvent(CLAIM_PROVIDER, trackingId, {
        type,
        merchant_reference: merchantRef,
        status_code: remote.statusCode,
      });
      if (!claimed) return ackBody(trackingId, merchantRef, type);
      await setPaymentStatus(payment.id, "failed");
      return ackBody(trackingId, merchantRef, type);
    }

    return ackBody(trackingId, merchantRef, type);
  } catch (err) {
    // Only the failed-status branch claims outside the RPC; the completed
    // branch's claim lives inside the rolled-back transaction.
    if (claimed) {
      await releaseWebhookEvent(CLAIM_PROVIDER, trackingId).catch(() => undefined);
    }
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
