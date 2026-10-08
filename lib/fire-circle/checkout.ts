import "server-only";
import { getSettings } from "@/lib/db/settings";
import { ugxAmount } from "@/lib/booking/pricing";
import {
  createFireCirclePayment,
  getFireCircleRequestByHash,
  type FireCircleRequestRow,
} from "@/lib/db/fire-circle";
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

  const reused = await reusableUrl(row);
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
    await setPaymentStatus(paymentId, "failed").catch(() => undefined);
    throw err;
  }
}

async function reusableUrl(row: FireCircleRequestRow): Promise<string | null> {
  if (!row.payment_id) return null;
  const payment = await getPaymentById(row.payment_id);
  if (
    payment &&
    (payment.status === "initiated" || payment.status === "pending") &&
    payment.redirect_url
  ) {
    return payment.redirect_url;
  }
  return null;
}
