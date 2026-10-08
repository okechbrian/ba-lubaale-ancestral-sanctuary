import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { SubscriberRow, SubscriberStatus } from "@/lib/db/types";

/** One identity per address: trimmed + lowercased before any lookup. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Opaque URL-safe token (32 bytes). Separate tokens for confirm/unsub. */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface SubscribeRequestResult {
  status: SubscriberStatus;
  /** Send the double opt-in confirmation email (pending only). */
  sendConfirmation: boolean;
  /** Send the "you are already on the list" email (confirmed only). */
  sendAlready: boolean;
  confirmToken: string;
  unsubToken: string;
}

async function selectByEmail(email: string): Promise<SubscriberRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("subscribers")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(`requestSubscription failed: ${error.message}`);
  return (data as SubscriberRow | null) ?? null;
}

/**
 * Double opt-in entry point. Always called with a valid, normalized email.
 *
 * - no row            -> insert pending + send confirmation
 * - pending           -> resend the SAME confirm link (older links keep working)
 * - unsubscribed      -> re-subscribe: back to pending with FRESH tokens
 *                        (every link from before then points at nothing)
 * - confirmed         -> no email change; caller may send "already subscribed"
 *
 * The caller must never vary its HTTP response by status (no enumeration);
 * this function only decides which email, if any, goes out.
 */
export async function requestSubscription(
  rawEmail: string,
): Promise<SubscribeRequestResult> {
  const email = normalizeEmail(rawEmail);
  const existing = await selectByEmail(email);
  if (!existing) {
    const confirmToken = newToken();
    const unsubToken = newToken();
    const db = getDb();
    const { error } = await db
      .from("subscribers")
      .insert({
        email,
        status: "pending",
        confirm_token: confirmToken,
        unsub_token: unsubToken,
      })
      .select()
      .single();
    if (error) {
      // 23505 = two identical requests raced; the winner's row is the truth.
      if (error.code === "23505") {
        const winner = await selectByEmail(email);
        if (winner) return fromRow(winner);
      }
      throw new Error(`requestSubscription failed: ${error.message}`);
    }
    return {
      status: "pending",
      sendConfirmation: true,
      sendAlready: false,
      confirmToken,
      unsubToken,
    };
  }
  if (existing.status === "confirmed") {
    return {
      status: "confirmed",
      sendConfirmation: false,
      sendAlready: true,
      confirmToken: existing.confirm_token,
      unsubToken: existing.unsub_token,
    };
  }
  if (existing.status === "unsubscribed") {
    const db = getDb();
    const confirmToken = newToken();
    const unsubToken = newToken();
    const { data, error } = await db
      .from("subscribers")
      .update({
        status: "pending",
        confirm_token: confirmToken,
        unsub_token: unsubToken,
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      throw new Error(`requestSubscription failed: ${error.message}`);
    }
    const row = data as SubscriberRow;
    return {
      status: row.status,
      sendConfirmation: true,
      sendAlready: false,
      confirmToken: row.confirm_token,
      unsubToken: row.unsub_token,
    };
  }
  return fromRow(existing);
}

function fromRow(row: SubscriberRow): SubscribeRequestResult {
  return {
    status: row.status,
    sendConfirmation: row.status === "pending",
    sendAlready: false,
    confirmToken: row.confirm_token,
    unsubToken: row.unsub_token,
  };
}

export type ConfirmOutcome = "confirmed" | "already" | "not_found";

export interface ConfirmResult {
  outcome: ConfirmOutcome;
  /** On "confirmed": address + token for the welcome email. */
  email?: string;
  unsubToken?: string;
}

/**
 * Confirmation link click. Idempotent: a second click on a confirmed
 * subscription reports "already" rather than erroring (and the welcome
 * email is sent exactly once, by the caller, on "confirmed").
 */
export async function confirmSubscriber(token: string): Promise<ConfirmResult> {
  if (!token) return { outcome: "not_found" };
  const db = getDb();
  const { data, error } = await db
    .from("subscribers")
    .select("*")
    .eq("confirm_token", token)
    .maybeSingle();
  if (error) throw new Error(`confirmSubscriber failed: ${error.message}`);
  const row = data as SubscriberRow | null;
  if (!row) return { outcome: "not_found" };
  if (row.status === "confirmed") return { outcome: "already" };
  const now = new Date().toISOString();
  const { error: updErr } = await db
    .from("subscribers")
    .update({
      status: "confirmed",
      confirmed_at: now,
      unsubscribed_at: null,
      updated_at: now,
    })
    .eq("id", row.id);
  if (updErr) throw new Error(`confirmSubscriber failed: ${updErr.message}`);
  return { outcome: "confirmed", email: row.email, unsubToken: row.unsub_token };
}

export type UnsubscribeOutcome = "unsubscribed" | "already" | "not_found";

/** Unsubscribe link click. Idempotent. */
export async function unsubscribeSubscriber(
  token: string,
): Promise<UnsubscribeOutcome> {
  if (!token) return "not_found";
  const db = getDb();
  const { data, error } = await db
    .from("subscribers")
    .select("*")
    .eq("unsub_token", token)
    .maybeSingle();
  if (error) throw new Error(`unsubscribeSubscriber failed: ${error.message}`);
  const row = data as SubscriberRow | null;
  if (!row) return "not_found";
  if (row.status === "unsubscribed") return "already";
  const now = new Date().toISOString();
  const { error: updErr } = await db
    .from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: now, updated_at: now })
    .eq("id", row.id);
  if (updErr) throw new Error(`unsubscribeSubscriber failed: ${updErr.message}`);
  return "unsubscribed";
}

/**
 * Subscriber listing for /admin/subscribers. `status` undefined means every
 * status, newest first. Used by the admin page and the CSV export route.
 */
export async function listSubscribers(
  status?: "pending" | "confirmed" | "unsubscribed",
): Promise<SubscriberRow[]> {
  const db = getDb();
  let query = db
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  // Bounded on purpose: the export must never page an unbounded table.
  const { data, error } = await query.limit(1000);
  if (error) throw new Error(`listSubscribers failed: ${error.message}`);
  return (data ?? []) as SubscriberRow[];
}
