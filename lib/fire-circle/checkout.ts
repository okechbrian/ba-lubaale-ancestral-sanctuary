import "server-only";
import { getSettings } from "@/lib/db/settings";
import { ugxAmount } from "@/lib/booking/pricing";
import {
  createFireCirclePayment,
  getFireCircleRequestByHash,
  type FireCircleRequestRow,
} from "@/lib/db/fire-circle";
import { releaseFailedFirePayment } from "@/lib/db/fire-circle-release";
import { getPaymentById, initiatePayment, setPaymentStatus } from "@/lib/db/payments";
import { submitOrder } from "@/lib/payments/pesapal";
import { hashSeatToken } from "@/lib/fire-circle/token";

export class FireCircleCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FireCircleCheckoutError";
  }
}

export async function startFireCircleCheckout(token: string): Promise<{
  checkoutUrl: string;
  amountUsd: number;
}> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new FireCircleCheckoutError("not_a_seat");
  }
  const row = await getFireCircleRequestByHash(await hashSeatToken(token));
  if (!row || row.status === "declined" || row.status === "requested") {
    throw new FireCircleCheckoutError("not_a_seat");
  }
  if (row.status === "paid") {
    throw new FireCircleCheckoutError("already_paid");
  }
  const amountUsd = Number(row.fee_usd);
  if (!Number.isFinite(amountUsd) || amountUsd < 1) {
    throw new FireCircleCheckoutError("fee_missing");
  }

  const reused = await openOrRelease(row);
  if (reused) return { checkoutUrl: reused, amountUsd };

  const settings = await getSettings();
  const amountUgx = ugxAmount(amountUsd, settings);
  const paymentId = await createFireCirclePayment({
    requestId: row.id,
    amountUsd,
    amountUgx,
    providerRef: `pending-${crypto.randomUUID()}`,
  });

  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const order = await submitOrder({
      merchantRef: paymentId,
      amountUgx,
      description: `Ba Lubaale fire circle — USD ${amountUsd}`,
      callbackUrl: `${site}/api/payments/callback`,
      email: row.email,
      firstName: row.name.split(/\s+/)[0]?.slice(0, 40) || "Guest",
      lastName: "Circle",
    });
    await initiatePayment(paymentId, order.trackingId, order.redirectUrl);
    return { checkoutUrl: order.redirectUrl, amountUsd };
  } catch (err) {
    try {
      await setPaymentStatus(paymentId, "failed");
      await releaseFailedFirePayment(row.id, paymentId);
    } catch {
      // Leave the link. The next attempt releases a failed row.
    }
    throw err;
  }
}

/**
 * A live checkout URL is reused. A failed or unfinished attempt is released
 * so a new payment can be created. A completed payment is never replaced.
 */
async function openOrRelease(row: FireCircleRequestRow): Promise<string | null> {
  if (!row.payment_id) return null;
  const payment = await getPaymentById(row.payment_id);
  if (!payment) return null;
  if (payment.status === "completed") {
    throw new FireCircleCheckoutError("already_paid");
  }
  if (
    (payment.status === "initiated" || payment.status === "pending") &&
    payment.redirect_url
  ) {
    return payment.redirect_url;
  }
  if (
    payment.status === "failed" ||
    payment.status === "cancelled" ||
    payment.status === "initiated" ||
    payment.status === "pending"
  ) {
    await releaseFailedFirePayment(row.id, payment.id);
    return null;
  }
  throw new FireCircleCheckoutError("payment_in_progress");
}