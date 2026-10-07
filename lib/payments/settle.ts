import "server-only";
import { claimWebhookEvent, releaseWebhookEvent } from "@/lib/db/webhook-events";
import {
  applyPaymentCompletion,
  applyVoucherCompletion,
  getPaymentById,
  setPaymentStatus,
} from "@/lib/db/payments";
import { getBooking } from "@/lib/db/bookings";
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

export const CLAIM_PROVIDER = "pesapal";

/**
 * The ONE place a payment is verified against the provider and then settled.
 *
 * Both the IPN webhook and the reconciliation sweep (cron + the admin
 * "Re-check" button) go through `verifyAndSettle`. That is deliberate: there is
 * exactly one code path that can call the atomic completion RPC, and it cannot
 * be reached without first asking Pesapal, with our own bearer token, what
 * happened and cross-checking currency and amount. "Never mark paid without
 * provider verification" is therefore a property of the structure, not a rule
 * each caller has to remember.
 */

/**
 * Compose the emails this completion owes. They are only *queued* here — the
 * outbox processor delivers them (see lib/email/outbox.ts). Never throws into
 * the payment path: a template problem must not roll back a settled payment,
 * so a failure is logged loudly and returns whatever could be built.
 */
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
      // Deposit paid = stay confirmed: also send the how-to-prepare guide
      // (same content as /prepare).
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

/**
 * Gift voucher completion: generate the code, then issue it (payment + code +
 * queued emails) in ONE transaction.
 *
 * The code is generated here and only its SHA-256 digest goes to the database —
 * but the raw code DOES go into the queued email bodies, because after this
 * request returns the digest is all that remains and nobody could ever recover
 * the code from it. The outbox is what makes a crash here recoverable.
 *
 * A replayed event cannot mint a second code: the webhook claim refuses it, and
 * `vouchers.payment_id` is unique besides. Returns whether this call claimed
 * the event.
 */
async function completeVoucherPayment(args: {
  payment: PaymentRow;
  trackingId: string;
  merchantRef: string;
  type: string;
  statusCode: number;
}): Promise<boolean> {
  const { payment, trackingId, merchantRef, type, statusCode } = args;

  // Where the code must go. This THROWS when the row is missing rather than
  // logging and continuing: a paid voucher we cannot email is not a settled
  // voucher, and acking 200 would tell the provider the guest has been told.
  // Throwing lets the caller 503, so the provider retries and the voucher
  // completes once the row exists.
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
    // Should be impossible (unique payment_id) — but if it happens, the
    // payment is settled with no code, so shout rather than pretend.
    console.error(
      `voucher payment ${payment.id} completed without issuing a code`,
    );
  }
  return true;
}

/**
 * Where a settle attempt ended up. `settled` is the only outcome that means
 * THIS call moved money-state forward; everything else is a reason it did not.
 */
export type SettleResult =
  /** Provider said COMPLETED, checks passed, atomic completion applied now. */
  | { result: "settled" }
  /** Already completed before we started — nothing to do. */
  | { result: "already_completed" }
  /** Another delivery (IPN vs sweep) won the claim; the payment is completed. */
  | { result: "duplicate" }
  /**
   * The provider says COMPLETED but the event claim was refused while the
   * payment is still not completed — a leftover claim from before the
   * failed-claim namespace fix. Needs a human; never auto-resolved.
   */
  | { result: "blocked" }
  /** Provider says FAILED / REVERSED (or INVALID, IPN mode): marked failed. */
  | { result: "failed" }
  /** Provider has no completed payment yet. Left exactly as it was. */
  | { result: "unresolved"; statusCode: number }
  /** Provider answer contradicts our row (currency/amount/unknown code). */
  | { result: "rejected"; reason: Extract<VerifyOutcome, { ok: false }>["reason"] }
  /** Provider could not be asked (not configured / API error). Retry later. */
  | { result: "provider_unavailable"; message: string };

export interface SettleOptions {
  trackingId: string;
  merchantRef: string;
  /** Recorded in the (redacted) webhook payload so the audit trail says who settled. */
  type: string;
  /**
   * `ipn`: the provider is telling us something changed, so an INVALID(0) status
   * is recorded as failed. `reconcile`: we are the ones asking, long after the
   * fact; INVALID there only means "no payment has landed *yet*" and must never
   * write a terminal state, so it is left unresolved.
   */
  mode: "ipn" | "reconcile";
}

/**
 * The claim key for a FAILED verdict. It must NOT be the tracking id: that is
 * the key the atomic completion claims, so recording a failure under it would
 * make a later COMPLETED status for the same order look like a duplicate and be
 * swallowed — a guest who paid on a second attempt would never be settled.
 */
function failedClaimKey(trackingId: string): string {
  return `failed:${trackingId}`;
}

/**
 * Verify `payment` with the provider and, only if verified, settle it.
 * Throws on database errors (callers turn that into a retryable failure); a
 * voucher whose request row is missing also throws, by design.
 */
export async function verifyAndSettle(
  payment: PaymentRow,
  opts: SettleOptions,
): Promise<SettleResult> {
  const { trackingId, merchantRef, type, mode } = opts;

  if (payment.status === "completed") return { result: "already_completed" };

  // Authenticated re-verification (the missing HMAC's compensation).
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
      // Gift voucher: no booking, so the transaction issues the code itself.
      claimed = await completeVoucherPayment({
        payment,
        trackingId,
        merchantRef,
        type,
        statusCode: remote.statusCode,
      });
    } else {
      // Read the booking BEFORE the transaction: the email bodies need it, and
      // the emails must be a parameter so they land in the same commit.
      const booking = payment.booking_id ? await getBooking(payment.booking_id) : null;
      const emails = booking ? composePaymentEmails(booking, payment) : [];

      // ONE atomic transaction (RPC apply_payment_completion): webhook claim
      // + payment completion + booking status + email-outbox rows. If ANY step
      // throws, everything — the claim included — rolls back, so a retry
      // re-applies from a clean slate. Nothing can half-commit, and a settled
      // payment can never lose its email: the rows are durable before this
      // returns, even if the process dies here.
      const applied = await applyPaymentCompletion({
        provider: CLAIM_PROVIDER,
        externalId: trackingId,
        paymentId: payment.id,
        redactedPayload: payload,
        emails,
      });
      claimed = applied.claimed;
    }

    if (claimed) return { result: "settled" };

    // The claim was refused. Normally that means a concurrent delivery
    // committed first (the unique insert waits for it), so the payment is now
    // completed. If it is NOT, an old claim is swallowing a genuine payment.
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
    if (!claimed) return { result: "failed" }; // already recorded
    try {
      await setPaymentStatus(payment.id, "failed");
    } catch (err) {
      // Release so a retry can record it; otherwise the failure is lost.
      await releaseWebhookEvent(CLAIM_PROVIDER, key).catch(() => undefined);
      throw err;
    }
    return { result: "failed" };
  }

  return { result: "unresolved", statusCode: remote.statusCode };
}
