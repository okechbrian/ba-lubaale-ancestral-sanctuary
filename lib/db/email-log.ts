import "server-only";
import { getDb } from "@/lib/db/client";
import type { EmailLogRow } from "@/lib/db/types";

export interface EmailRecord {
  to: string;
  template: string;
  subject: string;
  body: string;
  status: "sent" | "stubbed" | "failed";
  error?: string;
}

/**
 * Appends an email to email_log so the owner can read every notification in
 * /admin/emails even when no sender is configured. Never store card or phone
 * data here — callers pass template text and links only.
 */
export async function logEmail(record: EmailRecord): Promise<void> {
  try {
    const db = getDb();
    const { error } = await db.from("email_log").insert({
      to_email: record.to,
      template: record.template,
      subject: record.subject,
      body: record.body,
      status: record.status,
      error: record.error ?? null,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    // Logging must never break the booking flow; surface loudly but safely.
    console.error(
      `email_log write failed template=${record.template} status=${record.status}:`,
      err instanceof Error ? err.message : "unknown",
    );
  }
}

export async function listEmailLog(limit = 100): Promise<EmailLogRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("email_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listEmailLog failed: ${error.message}`);
  return (data ?? []) as EmailLogRow[];
}
