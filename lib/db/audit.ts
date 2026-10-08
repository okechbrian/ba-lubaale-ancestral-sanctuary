import "server-only";
import { getDb } from "@/lib/db/client";
import type { AuditEntry } from "@/lib/db/types";

export type AuditAction =
  | "booking_approved"
  | "booking_declined"
  | "booking_cancelled"
  | "voucher_redeemed"
  | "settings_saved"
  | "content_saved"
  | "content_deleted";

/** Insert one audit row. Best-effort: a failed insert must NEVER break the
 *  operation it audits, but it is logged loudly. */
export async function recordAudit(entry: {
  action: AuditAction;
  subject?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = getDb();
    const { error } = await db.from("admin_audit").insert([
      {
        action: entry.action,
        subject: entry.subject ?? null,
        details: entry.details ?? null,
      },
    ]);
    if (error) {
      console.error(`[admin_audit] insert failed for ${entry.action}:`, error.message);
    }
  } catch (err) {
    console.error(
      `[admin_audit] insert failed for ${entry.action}:`,
      err instanceof Error ? err.message : "unknown",
    );
  }
}

export async function listAudits(limit = 50): Promise<AuditEntry[]> {
  const db = getDb();
  const { data, error } = await db
    .from("admin_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listAudits failed: ${error.message}`);
  return (data ?? []) as AuditEntry[];
}
