import "server-only";
import { claimWebhookEvent, releaseWebhookEvent } from "@/lib/db/webhook-events";
import {
  applyPaymentCompletion,
  applyVoucherCompletion,
  getPaymentById,
  setPaymentStatus,
} from "@/lib/db/payments";
import { getBooking } from "@/lib/db/bookings";
import {
  applyFireCircleCompletion,
  getFireCircleRequestByPayment,
} from "@/lib/db/fire-circle";
import { prepareFireCirclePaidEmail } from "@/lib/fire-circle/emails";
import { requireVoucherRequest } from "@/lib/db/vouchers";
import {
  generateVoucherCode,
  hashVoucherCode,
  voucherCodeHint,
} from "@/lib/vouchers/code";
import { prepareVoucherEmails } from "@/lib/vouchers/emails";
import type { BookingRow, PaymentRow } from "@/lib/db/types";
import type { OutboxEmailInput } from "@/lib/db/email-outbox";
import { verifyRemotePayment, type VerifyOutcome } from "@/lib/payments/state";
import {
  PesapalApiError,
  PesapalNotConfiguredError,
  getTransactionStatus,
} from "@/lib/payments/pesapal";
import {
  balanceReceivedGuest,
  depositReceivedGuest,
  howToPrepareGuest,
  ownerPaymentReceived,
} from "@/lib/email/templates";
import { drainOutboxBestEffort } from "@/lib/email/outbox";

export const CLAIM_PROVIDER = "pesapal";

function composePaymentEmails(
  booking: BookingRow,
  payment: { kind: string; amount_usd: string },
): OutboxEmailInput[] {
  const emails: OutboxEmailInput[] = [];
  try {
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
    emails.push({
      category: `payment_received_${payment.kind}_guest`,
      to: booking.email,
      subject: guest.subject,
      body: guest.text,
    });

    if (payment.kind === "deposit") {
      const guide = howToPrepareGuest(booking);
      emails.push({
        category: "prepare_guide_guest",
        to: booking.email,
        subject: guide.subject,
        body: guide.text,
      });
    }

    const owner = process.env.OWNER_NOTIFY_EMAIL;
    if (owner) {
      const note = ownerPaymentReceived(
        booking,
        payment as Parameters<typeof ownerPaymentReceived>[1],
      );
      emails.push({
        category: `payment_received_${payment.kind}_owner`,
        to: owner,
        subject: note.subject,
        body: note.text,
      });
    }
  } catch (err) {
    console.error(
      "payment email composition failed (payment stays settled):",
      err instanceof Error ? err.message : "unknown",
    );
  }
  return emails;
}

async function completeVoucherPayment(args: {
  payment: PaymentRow;
  trackingId: string;
  merchantRef: string;
  type: string;
  statusCode: number;
}): Promise<boolean> {
  const { payment, trackingId, merchantRef, type, statusCode } = args;
  const request = await requireVoucherRequest(payment.id);
  const code = generateVoucherCode();
  const codeHash = hashVoucherCode(code);
  const codeHint = voucherCodeHint(code);
  const amountUsd = Number(payment.amount_usd);
  const emails = prepareVoucherEmails({
    formattedCode: code,
    amountUsd,
    buyerName: request.buyer_name,
    buyerEmail: request.buyer_email,
    recipientEmail: request.recipient_email,
    codeHint,
  });

  const applied = await applyVoucherCompletion({
    provider: CLAIM_PROVIDER,
    externalId: trackingId,
    paymentId: payment.id,
    codeHash,
    codeHint,
    buyerEmail: request.buyer_email,
    recipientEmail: request.recipient_email,
    redactedPayload: {
      type,
      merchant_reference: merchantRef,
      status_code: statusCode,
    },
    emails,
  });

  if (!applied.claimed) return false;
  if (!applied.issued && applied.first_completion) {
    console.error(
      `voucher payment ${payment.id} completed without issuing a code`,
    );
  }
  return true;
}

async function completeFireCirclePayment(args: {
  payment: PaymentRow;
  trackingId: string;
  merchantRef: string;
  type: string;
  statusCode: number;
}): Promise<boolean> {
  const { payment, trackingId, merchantRef, type, statusCode } = args;
  const seat = await getFireCircleRequestByPayment(payment.id);
  if (!seat) {
    throw new Error(
      `Fire circle payment ${payment.id} has no request row. Refusing to complete it.`,
    );
  }
  const paid = prepareFireCirclePaidEmail({ name: seat.name, email: seat.email });
  const applied = await applyFireCircleCompletion({
    provider: CLAIM_PROVIDER,
    externalId: trackingId,
    paymentId: payment.id,
    redactedPayload: {
      type,
      merchant_reference: merchantRef,
      status_code: statusCode,
    },
    emails: [paid],
  });
  return applied.claimed;
}

export type SettleResult =
  | { result: "settled" }
  | { result: "already_completed" }
  | { result: "duplicate" }
  | { result: "blocked" }
  | { result: "failed" }
  | { result: "unresolved"; statusCode: number }
  | { result: "rejected"; reason: Extract<VerifyOutcome, { ok: false }>["reason"] }
  | { result: "provider_unavailable"; message: string };

export interface SettleOptions {
  trackingId: string;
  merchantRef: string;
  type: string;
  mode: "ipn" | "reconcile";
}

function failedClaimKey(trackingId: string): string {
  return `failed:${trackingId}`;
}

export async function verifyAndSettle(
  payment: PaymentRow,
  opts: SettleOptions,
): Promise<SettleResult> {
  const { trackingId, merchantRef, type, mode } = opts;

  if (payment.status === "completed") return { result: "already_completed" };

  let remote;
  try {
    remote = await getTransactionStatus(trackingId);
  } catch (err) {
    if (err instanceof PesapalNotConfiguredError || err instanceof PesapalApiError) {
      console.error("pesapal status verify failed:", err.message);
      return { result: "provider_unavailable", message: err.message };
    }
    throw err;
  }

  if (mode === "reconcile" && remote.statusCode === 0) {
    return { result: "unresolved", statusCode: remote.statusCode };
  }

  const outcome = verifyRemotePayment(payment, remote);
  if (!outcome.ok) {
    console.error(`pesapal ${type} rejected payment=${payment.id}: ${outcome.reason}`);
    return { result: "rejected", reason: outcome.reason };
  }

  const payload = {
    type,
    merchant_reference: merchantRef,
    status_code: remote.statusCode,
  };

  if (outcome.status === "completed") {
    let claimed: boolean;
    if (payment.subject_kind === "voucher") {
      claimed = await completeVoucherPayment({
        payment,
        trackingId,
        merchantRef,
        type,
        statusCode: remote.statusCode,
      });
    } else if (payment.subject_kind === "fire_circle") {
      claimed = await completeFireCirclePayment({
        payment,
        trackingId,
        merchantRef,
        type,
        statusCode: remote.statusCode,
      });
    } else {
      const booking = payment.booking_id ? await getBooking(payment.booking_id) : null;
      const emails = booking ? composePaymentEmails(booking, payment) : [];
      const applied = await applyPaymentCompletion({
        provider: CLAIM_PROVIDER,
        externalId: trackingId,
        paymentId: payment.id,
        redactedPayload: payload,
        emails,
      });
      claimed = applied.claimed;
    }

    if (claimed) {
      try {
        await drainOutboxBestEffort({
          reason:
            payment.subject_kind === "voucher"
              ? "voucher"
              : payment.subject_kind === "fire_circle"
                ? "fire_circle"
                : `payment:${type}`,
        });
      } catch (err) {
        console.error(
          `inline email drain failed (payment already settled; the cron will retry):`,
          err instanceof Error ? err.message : "unknown",
        );
      }
      return { result: "settled" };
    }

    const current = await getPaymentById(payment.id);
    if (current?.status === "completed") return { result: "duplicate" };
    console.error(
      `payment ${payment.id}: provider says COMPLETED but the event claim is already taken and the payment is not completed — manual review needed`,
    );
    return { result: "blocked" };
  }

  if (outcome.status === "failed") {
    const key = failedClaimKey(trackingId);
    const claimed = await claimWebhookEvent(CLAIM_PROVIDER, key, payload);
    if (!claimed) return { result: "failed" };
    try {
      await setPaymentStatus(payment.id, "failed");
    } catch (err) {
      await releaseWebhookEvent(CLAIM_PROVIDER, key).catch(() => undefined);
      throw err;
    }
    return { result: "failed" };
  }

  return { result: "unresolved", statusCode: remote.statusCode };
}
