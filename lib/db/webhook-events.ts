import "server-only";
import { getDb } from "@/lib/db/client";

/**
 * Claims a webhook event exactly once. Returns false when this event was
 * already processed or is being processed — that is the idempotency gate.
 * `redactedPayload` must already be stripped of card/phone data by the caller.
 */
export async function claimWebhookEvent(
  provider: string,
  externalId: string,
  redactedPayload?: unknown,
): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from("webhook_events").insert({
    provider,
    external_id: externalId,
    processed: true,
    redacted_payload: redactedPayload ?? null,
  });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation = already seen
  throw new Error(`claimWebhookEvent failed: ${error.message}`);
}
