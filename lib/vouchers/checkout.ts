import "server-only";
import { getSettings } from "@/lib/db/settings";
import {
  insertVoucherPurchase,
  setVoucherPaymentInitiated,
  VoucherUnavailableError,
} from "@/lib/db/vouchers";
import { setPaymentStatus } from "@/lib/db/payments";
import { ugxAmount, VoucherPriceError, voucherAmountUsd } from "@/lib/booking/pricing";
import { submitOrder, type SubmittedOrder } from "@/lib/payments/pesapal";

export interface VoucherCheckoutInput {
  amountUsd: number;
  buyerEmail: string;
  buyerName?: string;
  recipientEmail?: string | null;
}

export interface VoucherCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  amountUsd: number;
  amountUgx: number;
}

/**
 * Hosted checkout for a gift voucher — same Pesapal pipeline as a stay, minus
 * the booking. The price is looked up in the owner's /admin/settings list and
 * refused if it is not on sale; nothing here may invent an amount.
 */
export async function createVoucherCheckout(
  input: VoucherCheckoutInput,
): Promise<VoucherCheckoutResult> {
  const settings = await getSettings();
  const amountUsd = voucherAmountUsd(input.amountUsd, settings);
  if (amountUsd === null) {
    // No amounts configured: vouchers are simply not for sale yet.
    throw new VoucherUnavailableError();
  }
  const amountUgx = ugxAmount(amountUsd, settings);

  // The unique voucher_requests.payment_id makes this the single request for
  // this payment. Created atomically with the payment row: a crash between two
  // inserts used to leave a paid voucher with nobody to email.
  const payment = await insertVoucherPurchase({
    amountUsd,
    amountUgx,
    providerRef: `pending-${crypto.randomUUID()}`,
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName ?? null,
    recipientEmail: input.recipientEmail ?? null,
  });

  let order: SubmittedOrder;
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    order = await submitOrder({
      merchantRef: payment.id,
      amountUgx,
      description: `Ba Lubaale voucher — USD ${amountUsd}`,
      callbackUrl: `${site}/api/payments/callback`,
      email: input.buyerEmail,
      firstName: (input.buyerName?.trim() || "Voucher").slice(0, 40),
      lastName: "Buyer",
    });
  } catch (err) {
    // The row stays as a failed attempt; nothing was charged.
    await setPaymentStatus(payment.id, "failed").catch(() => undefined);
    throw err;
  }

  await setVoucherPaymentInitiated(payment.id, order.trackingId, order.redirectUrl);
  return { paymentId: payment.id, checkoutUrl: order.redirectUrl, amountUsd, amountUgx };
}

export { VoucherPriceError };