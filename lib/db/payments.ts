import "server-only";
import { getDb } from "@/lib/db/client";
import type { BookingStatus, PaymentRow, PaymentStatus } from "@/lib/db/types";

export interface NewPayment {
  booking_id: string;
  kind: "deposit" | "balance";
  amount_usd: number;
  amount_ugx: number;
  provider: string;
  provider_ref: string;
  currency?: string;
}

export async function insertPayment(input: NewPayment): Promise<PaymentRow> {
  const db = getDb();
  const { data, error } = await db
    .from("payments")
    .insert({ currency: "UGX", ...input })
    .select()
    .single();
  if (error) throw new Error(`insertPayment failed: ${error.message}`);
  return data as PaymentRow;
}

export async function getPaymentByRef(providerRef: string): Promise<PaymentRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("provider_ref", providerRef)
    .maybeSingle();
  if (error) throw new Error(`getPaymentByRef failed: ${error.message}`);
  return data as PaymentRow | null;
}

/**
 * Idempotent completion: marks the payment completed exactly once.
 * Returns false when it was already completed (repeat webhook / double click).
 * The partial unique index (one completed row per booking+kind) backstops this.
 */
export async function completePayment(id: string): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("payments")
    .update({ status: "completed", paid_at: now, updated_at: now })
    .eq("id", id)
    .neq("status", "completed")
    .select("id");
  if (error) throw new Error(`completePayment failed: ${error.message}`);
  return (data ?? []).length === 1;
}

export async function setPaymentStatus(
  id: string,
  status: PaymentRow["status"],
): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("payments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`setPaymentStatus failed: ${error.message}`);
}

export interface ApplyCompletionInput {
  provider: string;
  externalId: string;
  paymentId: string;
  redactedPayload?: unknown;
}

export interface ApplyCompletionResult {
  claimed: boolean;
  first_completion: boolean;
  payment_id?: string;
  payment_status?: PaymentStatus;
  booking_id?: string;
  booking_status?: BookingStatus;
}

/**
 * Atomic IPN apply — ONE Postgres transaction
 * (migration 20261002000003_payment_integrity.sql: webhook_events claim +
 * payment completion + booking status transition). If ANY step fails the
 * whole transaction rolls back — claim included — so the caller can answer
 * 503 and the provider's retry re-applies everything from a clean slate.
 * A duplicate delivery returns { claimed: false } and changes nothing.
 */
export async function applyPaymentCompletion(
  input: ApplyCompletionInput,
): Promise<ApplyCompletionResult> {
  const db = getDb();
  const { data, error } = await db.rpc("apply_payment_completion", {
    p_provider: input.provider,
    p_external_id: input.externalId,
    p_payment_id: input.paymentId,
    p_redacted_payload: input.redactedPayload ?? null,
  });
  if (error) {
    const err = new Error(
      `applyPaymentCompletion failed: ${error.message}`,
    ) as Error & { code?: string };
    err.code = error.code;
    throw err;
  }
  return (data ?? {}) as ApplyCompletionResult;
}

export async function getPaymentById(id: string): Promise<PaymentRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getPaymentById failed: ${error.message}`);
  return data as PaymentRow | null;
}

export async function listPaymentsForBooking(
  bookingId: string,
): Promise<PaymentRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listPaymentsForBooking failed: ${error.message}`);
  return (data ?? []) as PaymentRow[];
}

/**
 * Stores the Pesapal tracking id + hosted-checkout URL on a pending attempt
 * and marks it `initiated` (the guest may now open the payment page).
 */
export async function initiatePayment(
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
  if (error) throw new Error(`initiatePayment failed: ${error.message}`);
}
