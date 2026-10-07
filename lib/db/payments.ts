import "server-only";
import { getDb } from "@/lib/db/client";
import type { OutboxEmailInput } from "@/lib/db/email-outbox";
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
  /**
   * Emails to queue in the SAME transaction as the payment completion
   * (migration 20261002000005). They are written, not sent — the outbox
   * processor delivers them, which is what makes "settled but never told"
   * impossible.
   */
  emails?: OutboxEmailInput[];
}

export interface ApplyCompletionResult {
  claimed: boolean;
  first_completion: boolean;
  payment_id?: string;
  payment_status?: PaymentStatus;
  booking_id?: string;
  booking_status?: BookingStatus;
  emails_queued?: number;
}

/**
 * Atomic IPN apply — ONE Postgres transaction
 * (migrations 20261002000003 + 20261002000005: webhook_events claim +
 * payment completion + booking status transition + email-outbox rows). If ANY
 * step fails the whole transaction rolls back — claim included — so the caller
 * can answer 503 and the provider's retry re-applies everything from a clean
 * slate. A duplicate delivery returns { claimed: false } and changes nothing.
 */
export interface ApplyVoucherCompletionInput {
  provider: string;
  externalId: string;
  paymentId: string;
  /** SHA-256 hex of the freshly generated code — the code is never stored. */
  codeHash: string;
  codeHint: string;
  buyerEmail: string;
  recipientEmail?: string | null;
  redactedPayload?: unknown;
  emails?: OutboxEmailInput[];
}

export interface ApplyVoucherCompletionResult {
  claimed: boolean;
  first_completion: boolean;
  issued: boolean;
  payment_id?: string;
  payment_status?: PaymentStatus;
  voucher_id?: string;
  code_hint?: string;
}

/**
 * Atomic voucher issue (migration 20261002000006): provider claim + payment
 * completion + one unique code + the queued emails, in a single transaction.
 *
 * Double-issue is closed twice over: the webhook claim refuses a replayed
 * event, and `v_first` means a *second, previously unseen* event for the same
 * already-completed payment issues nothing. `vouchers.payment_id` is unique as
 * the final backstop.
 */
export async function applyVoucherCompletion(
  input: ApplyVoucherCompletionInput,
): Promise<ApplyVoucherCompletionResult> {
  const db = getDb();
  const { data, error } = await db.rpc("apply_voucher_completion", {
    p_provider: input.provider,
    p_external_id: input.externalId,
    p_payment_id: input.paymentId,
    p_code_hash: input.codeHash,
    p_code_hint: input.codeHint,
    p_buyer_email: input.buyerEmail,
    p_recipient_email: input.recipientEmail ?? null,
    p_redacted_payload: input.redactedPayload ?? null,
    p_emails: input.emails ?? [],
  });
  if (error) {
    throw new Error(`applyVoucherCompletion failed: ${error.message}`);
  }
  return (data ?? {}) as ApplyVoucherCompletionResult;
}

export async function applyPaymentCompletion(
  input: ApplyCompletionInput,
): Promise<ApplyCompletionResult> {
  const db = getDb();
  const { data, error } = await db.rpc("apply_payment_completion", {
    p_provider: input.provider,
    p_external_id: input.externalId,
    p_payment_id: input.paymentId,
    p_redacted_payload: input.redactedPayload ?? null,
    p_emails: input.emails ?? [],
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

/**
 * Payments a reconciliation sweep should ask the provider about: `initiated`
 * (the guest was sent to Pesapal) and not touched for `idleMs`.
 *
 * `updated_at` doubles as "last looked at": `markPaymentChecked` bumps it when
 * the provider has nothing for us yet, so a payment that is perpetually
 * unresolved rotates to the back of the queue instead of starving everything
 * behind it, and is not re-queried on every tick. Rows older than `maxAgeMs`
 * (by creation) are left to the admin Re-check button — the hosted order has
 * long expired and polling it forever is only noise.
 */
export async function listStuckPayments(args: {
  now: Date;
  idleMs: number;
  maxAgeMs: number;
  limit: number;
}): Promise<PaymentRow[]> {
  const db = getDb();
  const idleCutoff = new Date(args.now.getTime() - args.idleMs).toISOString();
  const ageCutoff = new Date(args.now.getTime() - args.maxAgeMs).toISOString();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("status", "initiated")
    .lt("updated_at", idleCutoff)
    .gt("created_at", ageCutoff)
    .order("updated_at", { ascending: true })
    .limit(args.limit);
  if (error) throw new Error(`listStuckPayments failed: ${error.message}`);
  return (data ?? []) as PaymentRow[];
}

/**
 * Records "we asked, the provider has nothing yet" by bumping `updated_at` —
 * only while the payment is still `initiated`, so it can never race a
 * completion into overwriting a newer state.
 */
export async function markPaymentChecked(id: string, now: Date): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("payments")
    .update({ updated_at: now.toISOString() })
    .eq("id", id)
    .eq("status", "initiated");
  if (error) throw new Error(`markPaymentChecked failed: ${error.message}`);
}

/**
 * What /admin/payments shows: payments that need a human's eyes — every
 * `failed` one, and every `initiated` one that has been open longer than
 * `stuckAfterMs` since it was created. Newest first.
 */
export async function listPaymentsNeedingAttention(args: {
  now: Date;
  stuckAfterMs: number;
  limit?: number;
}): Promise<PaymentRow[]> {
  const db = getDb();
  const cutoff = new Date(args.now.getTime() - args.stuckAfterMs).toISOString();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .or(`status.eq.failed,and(status.eq.initiated,created_at.lt.${cutoff})`)
    .order("created_at", { ascending: false })
    .limit(args.limit ?? 200);
  if (error) {
    throw new Error(`listPaymentsNeedingAttention failed: ${error.message}`);
  }
  return (data ?? []) as PaymentRow[];
}
