import "server-only";
import { getDb } from "@/lib/db/client";

/**
 * Owner ops alerts for unsuccessful email delivery and stuck payments. The
 * alert itself goes through `email_outbox` like every other transactional
 * email, which means it is durable and idempotent; when the failure is an
 * SMTP fault, it simply shares the queue's fate (no infinite loop — alerting
 * here does not re-trigger the alert).
 */
export async function alertOwner(opts: {
  category: string;
  subject: string;
  lines: string[];
}): Promise<void> {
  const owner = process.env.OWNER_NOTIFY_EMAIL;
  if (!owner) {
    console.error(`[owner-alert] ${opts.category}: OWNER_NOTIFY_EMAIL is not set`);
    return;
  }
  try {
    const db = getDb();
    const { error } = await db.from("email_outbox").insert([
      {
        category: opts.category,
        recipient: owner,
        subject: opts.subject,
        body: ["An issue was detected on the site infrastructure.", "", ...opts.lines].join("\n"),
        status: "pending",
      },
    ]);
    if (error) {
      console.error(`[owner-alert] ${opts.category} insert failed: ${error.message}`);
    }
  } catch (err) {
    console.error(
      `[owner-alert] ${opts.category} failed:`,
      err instanceof Error ? err.message : "unknown",
    );
  }
}
