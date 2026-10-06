import "server-only";
import { getDb } from "@/lib/db/client";
import { codeMatchesHash, hashVoucherCode, normalizeVoucherCode } from "@/lib/vouchers/code";
import type { VoucherRow } from "@/lib/db/types";

export interface NewVoucherPayment {
  amountUsd: number;
  amountUgx: number;
  providerRef: string;
  buyerEmail: string;
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
 * Records what the buyer asked for, next to the payment row. The IPN needs the
 * recipient addresses and name to compose the emails, and a payment row does
 * not carry them. Holds no code.
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

export class VoucherUnavailableError extends Error {
  constructor() {
    super("Vouchers are not available right now.");
    this.name = "VoucherUnavailableError";
  }
}

export class VoucherCheckoutNotAllowedError extends Error {
  constructor() {
    super("A voucher checkout is already open for this request.");
    this.name = "VoucherCheckoutNotAllowedError";
  }
}

/**
 * Records a voucher purchase as a payment row (no booking: a voucher is
 * redeemed against a stay later, or gifted to someone else).
 */
export async function insertVoucherPayment(
  input: NewVoucherPayment,
): Promise<{ id: string }> {
  const db = getDb();
  const { data, error } = await db
    .from("payments")
    .insert({
      booking_id: null,
      subject_kind: "voucher",
      kind: "deposit", // the whole voucher price is charged up front
      amount_usd: input.amountUsd,
      amount_ugx: input.amountUgx,
      currency: "UGX",
      provider: "pesapal",
      provider_ref: input.providerRef,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertVoucherPayment failed: ${error.message}`);
  return data as { id: string };
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