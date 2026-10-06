import "server-only";
import { getDb } from "@/lib/db/client";
import { codeMatchesHash, hashVoucherCode, normalizeVoucherCode } from "@/lib/vouchers/code";
import type { VoucherRow } from "@/lib/db/types";

export interface NewVoucherPayment {
  amountUsd: number;
  amountUgx: number;
  providerRef: string;
  buyerEmail: string;
  buyerName?: string | null;
  recipientEmail?: string | null;
}

export interface VoucherRequestInput {
  paymentId: string;
  amountUsd: number;
  buyerEmail: string;
  buyerName?: string | null;
  recipientEmail?: string | null;
}

/**
 * Attaches a voucher_requests row to an EXISTING payment.
 *
 * NOT the normal path — `insertVoucherPurchase` creates both rows atomically.
 * This exists to repair a payment that predates the atomic RPC, and to let a
 * test construct the "payment without a request" state that the IPN is required
 * to reject.
 */
export async function insertVoucherRequest(
  input: VoucherRequestInput,
): Promise<void> {
  const db = getDb();
  const { error } = await db.from("voucher_requests").insert({
    payment_id: input.paymentId,
    amount_usd: input.amountUsd,
    buyer_email: input.buyerEmail,
    buyer_name: input.buyerName ?? null,
    recipient_email: input.recipientEmail ?? null,
  });
  if (error) throw new Error(`insertVoucherRequest failed: ${error.message}`);
}

export interface VoucherRequestRow {
  payment_id: string;
  amount_usd: string;
  buyer_email: string;
  buyer_name: string | null;
  recipient_email: string | null;
  status: "started" | "paid" | "void";
}

export async function getVoucherRequest(
  paymentId: string,
): Promise<VoucherRequestRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("voucher_requests")
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (error) throw new Error(`getVoucherRequest failed: ${error.message}`);
  return (data as VoucherRequestRow | null) ?? null;
}

export class VoucherRequestMissingError extends Error {
  constructor(paymentId: string) {
    super(
      `Voucher payment ${paymentId} has no voucher_requests row — the code ` +
        `cannot be emailed. Refusing to complete the payment.`,
    );
    this.name = "VoucherRequestMissingError";
  }
}

export class VoucherUnavailableError extends Error {
  constructor() {
    super("Vouchers are not available right now.");
    this.name = "VoucherUnavailableError";
  }
}

/**
 * Read a voucher request, or THROW.
 *
 * Used by the IPN. A paid voucher whose request row is missing cannot be
 * emailed to anyone, so failing here (and therefore 503-ing the webhook) is the
 * only honest outcome: the provider retries, and once the row is restored the
 * voucher completes. Acking 200 would mean "settled and told", which is false.
 */
export async function requireVoucherRequest(
  paymentId: string,
): Promise<VoucherRequestRow> {
  const row = await getVoucherRequest(paymentId);
  if (!row) throw new VoucherRequestMissingError(paymentId);
  return row;
}

export class VoucherCheckoutNotAllowedError extends Error {
  constructor() {
    super("A voucher checkout is already open for this request.");
    this.name = "VoucherCheckoutNotAllowedError";
  }
}

/**
 * Records a voucher purchase as a payment row PLUS its matching
 * voucher_requests row, in ONE transaction (`create_voucher_purchase`).
 *
 * They used to be two inserts, which left a paid voucher with no request row —
 * and the IPN needs that row for the recipient address, so it could not email
 * the code. Atomic creation means "paid but nobody can be told" is not a state
 * the database can reach.
 *
 * A voucher is not tied to a stay, so booking_id is null.
 */
export async function insertVoucherPurchase(
  input: NewVoucherPayment,
): Promise<{ id: string }> {
  const db = getDb();
  const { data, error } = await db.rpc("create_voucher_purchase", {
    p_amount_usd: input.amountUsd,
    p_amount_ugx: input.amountUgx,
    p_provider_ref: input.providerRef,
    p_buyer_email: input.buyerEmail,
    p_buyer_name: input.buyerName ?? null,
    p_recipient_email: input.recipientEmail ?? null,
  });
  if (error) throw new Error(`insertVoucherPurchase failed: ${error.message}`);
  const row = (data ?? {}) as { id?: string };
  if (!row.id) throw new Error("insertVoucherPurchase returned no payment id");
  return { id: row.id };
}

export async function setVoucherPaymentInitiated(
  id: string,
  providerRef: string,
  redirectUrl: string,
): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("payments")
    .update({
      provider_ref: providerRef,
      redirect_url: redirectUrl,
      status: "initiated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`setVoucherPaymentInitiated failed: ${error.message}`);
}

/**
 * Look up a voucher from the code a guest presents. The code never reaches
 * SQL: it is hashed in the app and matched on `code_hash`, then verified once
 * more in constant time before the row is handed back. A wrong code and an
 * unknown code are indistinguishable to the caller.
 */
export async function findVoucherByCode(code: string): Promise<VoucherRow | null> {
  const bare = normalizeVoucherCode(code);
  if (!bare) return null;
  const db = getDb();
  const { data, error } = await db
    .from("vouchers")
    .select("*")
    .eq("code_hash", hashVoucherCode(bare))
    .maybeSingle();
  if (error) throw new Error(`findVoucherByCode failed: ${error.message}`);
  const row = (data as VoucherRow | null) ?? null;
  if (!row) return null;
  return codeMatchesHash(bare, row.code_hash) ? row : null;
}

export type VoucherNotRedeemable = "not_found" | "already_redeemed" | "void";

export interface RedeemOutcome {
  status: "redeemed" | VoucherNotRedeemable;
  voucher?: VoucherRow;
  bookingId?: string;
}

/**
 * Mark a voucher redeemed against a booking. The code is verified by digest
 * (constant time) and the state change is done by `redeem_voucher`, which only
 * transitions `issued -> redeemed` — so a voucher cannot be redeemed twice, or
 * re-pointed at a different booking after the fact.
 */
export async function redeemVoucherByCode(
  code: string,
  bookingId: string,
): Promise<RedeemOutcome> {
  const voucher = await findVoucherByCode(code);
  if (!voucher) return { status: "not_found" };

  if (voucher.status === "void") return { status: "void", voucher };
  if (voucher.status === "redeemed") {
    return {
      status: "already_redeemed",
      voucher,
      bookingId: voucher.redeemed_booking_id ?? undefined,
    };
  }

  const db = getDb();
  const { data, error } = await db.rpc("redeem_voucher", {
    p_id: voucher.id,
    p_booking_id: bookingId,
  });
  if (error) throw new Error(`redeemVoucherByCode failed: ${error.message}`);

  const row = ((data ?? [])[0] as VoucherRow | undefined) ?? null;
  if (!row) {
    // Lost a race with another redemption: report the truth, do not retry.
    const current = await findVoucherByCode(code);
    if (current?.status === "void") return { status: "void", voucher: current };
    return {
      status: "already_redeemed",
      voucher: current ?? voucher,
      bookingId: current?.redeemed_booking_id ?? undefined,
    };
  }
  return { status: "redeemed", voucher: row, bookingId: bookingId };
}

export async function listVouchers(limit = 100): Promise<VoucherRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("vouchers")
    .select("*")
    .order("issued_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listVouchers failed: ${error.message}`);
  return (data ?? []) as VoucherRow[];
}

/**
 * Owner-initiated void (wrong amount, duplicate purchase, refund agreed).
 * Refuses a voucher that was already redeemed — that one is a conversation, not
 * a silent edit.
 */
export async function voidVoucher(
  id: string,
  reason: string,
): Promise<VoucherRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("vouchers")
    .update({
      status: "void",
      voided_at: new Date().toISOString(),
      void_reason: reason.slice(0, 300),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "issued")
    .select();
  if (error) throw new Error(`voidVoucher failed: ${error.message}`);
  return ((data ?? [])[0] as VoucherRow | undefined) ?? null;
}