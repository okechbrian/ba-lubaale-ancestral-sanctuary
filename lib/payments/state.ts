/**
 * Pure payment/booking state machine — unit-tested, no I/O.
 * Pesapal's IPN has no HMAC signature, so every status change passes through
 * these checks after an authenticated GetTransactionStatus call.
 */
import type { BookingStatus, PaymentKind, PaymentStatus } from "@/lib/db/types";

/** Pesapal status_code: 0 INVALID · 1 COMPLETED · 2 FAILED · 3 REVERSED. */
export function paymentStatusFromRemote(code: number): PaymentStatus | null {
  switch (code) {
    case 1:
      return "completed";
    case 0:
    case 2:
    case 3:
      return "failed";
    default:
      return null;
  }
}

export interface PaymentSnapshot {
  amount_ugx: number | string;
  currency: string;
}

export interface RemoteStatus {
  statusCode: number;
  currency?: string | null;
  amount?: number | string | null;
}

export type VerifyOutcome =
  | { ok: true; status: PaymentStatus }
  | { ok: false; reason: "currency_mismatch" | "amount_mismatch" | "unknown_code" };

/**
 * Cross-check the authenticated remote status against the payment we created.
 * Rejects any currency/amount drift; unrecognized codes are refused, never
 * guessed.
 */
export function verifyRemotePayment(
  payment: PaymentSnapshot,
  remote: RemoteStatus,
): VerifyOutcome {
  if (remote.currency && remote.currency !== payment.currency) {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (remote.amount !== undefined && remote.amount !== null && remote.amount !== "") {
    const remoteAmount = Math.round(Number(remote.amount));
    const ourAmount = Math.round(Number(payment.amount_ugx));
    if (!Number.isFinite(remoteAmount) || remoteAmount !== ourAmount) {
      return { ok: false, reason: "amount_mismatch" };
    }
  }
  const status = paymentStatusFromRemote(remote.statusCode);
  if (!status) return { ok: false, reason: "unknown_code" };
  return { ok: true, status };
}

/**
 * Booking status after a payment event. Completed deposits move approved →
 * paid; balances keep the booking paid; nothing ever resurrects a pending or
 * declined booking.
 */
export function bookingStatusAfterPayment(
  current: BookingStatus,
  kind: PaymentKind,
  paymentStatus: PaymentStatus,
): BookingStatus {
  if (paymentStatus !== "completed") return current;
  if (current !== "approved" && current !== "paid") return current;
  if (kind === "deposit") return "paid";
  return current; // balance completes an already-paid booking
}

export interface PaymentFacts {
  kind: PaymentKind;
  status: PaymentStatus;
}

/**
 * May a new checkout attempt be created right now?
 * - deposit: booking approved (or pending during the approve action) and no
 *   completed deposit yet.
 * - balance: deposit completed first, no completed balance yet.
 */
export function canCreateCheckout(
  bookingStatus: BookingStatus,
  kind: PaymentKind,
  payments: readonly PaymentFacts[],
): boolean {
  const hasCompleted = (k: PaymentKind) =>
    payments.some((p) => p.kind === k && p.status === "completed");
  if (hasCompleted(kind)) return false;
  if (kind === "deposit") {
    return bookingStatus === "approved" || bookingStatus === "pending";
  }
  return (
    hasCompleted("deposit") &&
    (bookingStatus === "approved" || bookingStatus === "paid")
  );
}
