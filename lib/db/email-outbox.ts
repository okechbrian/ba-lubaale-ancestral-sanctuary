import "server-only";
import { getDb } from "@/lib/db/client";
import type { EmailOutboxRow } from "@/lib/db/types";

/** One email as handed to the RPC (it inserts them inside the transaction). */
export interface OutboxEmailInput {
  category: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Pending rows whose backoff has elapsed, oldest first — the processor's only
 * read. `nowIso` is injected so tests can control "is the backoff over".
 */
export async function listDueOutbox(
  limit: number,
  nowIso: string,
): Promise<EmailOutboxRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listDueOutbox failed: ${error.message}`);
  return (data ?? []) as EmailOutboxRow[];
}

/**
 * Take exclusive ownership of one pending row and count the attempt
 * (`claim_email_outbox`: compare-and-set + `attempts + 1` in one statement).
 * Returns null when another processor already claimed it — that row is then
 * skipped, never sent twice in parallel.
 */
export async function claimOutboxRow(id: string): Promise<EmailOutboxRow | null> {
  const db = getDb();
  const { data, error } = await db.rpc("claim_email_outbox", { p_id: id });
  if (error) throw new Error(`claimOutboxRow failed: ${error.message}`);
  return ((data ?? [])[0] as EmailOutboxRow | undefined) ?? null;
}

export async function markOutboxSent(id: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { error } = await db
    .from("email_outbox")
    .update({
      status: "sent",
      sent_at: now,
      last_error: null,
      next_attempt_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(`markOutboxSent failed: ${error.message}`);
}

/**
 * Record a failed attempt.
 *
 * `terminal` = the attempt budget is spent: the row becomes `failed` and stops
 * being picked up, so the owner sees it in /admin/emails and can resend by
 * hand. Otherwise it returns to `pending` with `nextAttemptAt` as its backoff.
 */
export async function markOutboxFailed(
  id: string,
  error: string,
  opts: { terminal: boolean; nextAttemptAt: string },
): Promise<void> {
  const db = getDb();
  const { error: writeError } = await db
    .from("email_outbox")
    .update({
      status: opts.terminal ? "failed" : "pending",
      last_error: error.slice(0, 500),
      next_attempt_at: opts.nextAttemptAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (writeError) {
    throw new Error(`markOutboxFailed failed: ${writeError.message}`);
  }
}

/**
 * Owner-initiated retry ("Resend" in /admin/emails) — `requeue_email_outbox`
 * resets the attempt counter so the backoff starts fresh, counts the human
 * resend, and refuses to touch an already-delivered row.
 */
export async function requeueOutboxRow(
  id: string,
): Promise<EmailOutboxRow | null> {
  const db = getDb();
  const { data, error } = await db.rpc("requeue_email_outbox", { p_id: id });
  if (error) throw new Error(`requeueOutboxRow failed: ${error.message}`);
  return ((data ?? [])[0] as EmailOutboxRow | undefined) ?? null;
}

export async function listOutbox(limit = 100): Promise<EmailOutboxRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("email_outbox")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listOutbox failed: ${error.message}`);
  return (data ?? []) as EmailOutboxRow[];
}

export async function getOutboxRow(id: string): Promise<EmailOutboxRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("email_outbox")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getOutboxRow failed: ${error.message}`);
  return (data as EmailOutboxRow | null) ?? null;
}