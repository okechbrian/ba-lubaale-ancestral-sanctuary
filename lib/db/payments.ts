import "server-only";
import { getDb } from "@/lib/db/client";
import type { PaymentRow } from "@/lib/db/types";

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
