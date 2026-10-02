import "server-only";
import {
  getPaymentById,
  initiatePayment,
  insertPayment,
  listPaymentsForBooking,
  setPaymentStatus,
} from "@/lib/db/payments";
import { getSettings } from "@/lib/db/settings";
import {
  balanceAmountUsd,
  depositAmountUsd,
  stayAmountUsd,
  ugxAmount,
} from "@/lib/booking/pricing";
import { canCreateCheckout } from "@/lib/payments/state";
import { submitOrder, type SubmittedOrder } from "@/lib/payments/pesapal";
import type { BookingRow, PaymentRow } from "@/lib/db/types";

export interface CheckoutResult {
  payment: PaymentRow;
  checkoutUrl: string;
  reused: boolean;
  totalUsd: number;
  amountUsd: number;
  amountUgx: number;
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "Guest" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Creates (or reopens) the hosted-checkout attempt for a booking.
 * Throws PesapalNotConfiguredError / PesapalApiError after cleaning up any
 * half-created pending row — callers map those to honest HTTP statuses.
 * Gate: `canCreateCheckout` (pure, unit-tested).
 */
export async function createOrReuseCheckout(
  booking: BookingRow,
  kind: "deposit" | "balance",
): Promise<CheckoutResult> {
  const existing = await listPaymentsForBooking(booking.id);
  const facts = existing.map((p) => ({ kind: p.kind, status: p.status }));
  if (!canCreateCheckout(booking.status, kind, facts)) {
    throw new CheckoutNotAllowedError();
  }

  // Reopen an unpaid attempt whose hosted URL is still stored.
  const reusable = [...existing]
    .reverse()
    .find(
      (p) =>
        p.kind === kind &&
        (p.status === "initiated" || p.status === "pending") &&
        p.redirect_url,
    );
  if (reusable?.redirect_url) {
    const totalUsd = Number(booking.amount_usd ?? 0);
    return {
      payment: reusable,
      checkoutUrl: reusable.redirect_url,
      reused: true,
      totalUsd,
      amountUsd: Number(reusable.amount_usd),
      amountUgx: Number(reusable.amount_ugx),
    };
  }

  const settings = await getSettings();
  const totalUsd = booking.amount_usd
    ? Number(booking.amount_usd)
    : stayAmountUsd(booking.stay_slug, booking.party, settings);
  const amountUsd =
    kind === "deposit"
      ? depositAmountUsd(totalUsd, settings)
      : balanceAmountUsd(totalUsd, settings);
  const amountUgx = ugxAmount(amountUsd, settings);

  const pending = await insertPayment({
    booking_id: booking.id,
    kind,
    amount_usd: amountUsd,
    amount_ugx: amountUgx,
    provider: "pesapal",
    provider_ref: `pending-${crypto.randomUUID()}`,
  });

  let order: SubmittedOrder;
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const { first, last } = splitName(booking.name);
    order = await submitOrder({
      merchantRef: pending.id,
      amountUgx,
      description: `Ba Lubaale ${kind} — booking ${booking.id.slice(0, 8)}`,
      callbackUrl: `${site}/api/payments/callback`,
      email: booking.email,
      firstName: first,
      lastName: last,
    });
  } catch (err) {
    await setPaymentStatus(pending.id, "failed").catch(() => undefined);
    throw err;
  }

  await initiatePayment(pending.id, order.trackingId, order.redirectUrl);
  const payment = await getPaymentById(pending.id);
  if (!payment) throw new Error("payment row vanished after initiate");
  return {
    payment,
    checkoutUrl: order.redirectUrl,
    reused: false,
    totalUsd,
    amountUsd,
    amountUgx,
  };
}

export class CheckoutNotAllowedError extends Error {
  constructor() {
    super("Checkout not allowed for this booking right now.");
    this.name = "CheckoutNotAllowedError";
  }
}
