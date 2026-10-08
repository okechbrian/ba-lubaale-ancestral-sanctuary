import "server-only";
import { getDb } from "@/lib/db/client";

/** Lets a failed attempt be replaced. Does not touch a live or completed payment. */
export async function releaseFailedFirePayment(
  requestId: string,
  paymentId: string,
): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("fire_circle_requests")
    .update({ payment_id: null })
    .eq("id", requestId)
    .eq("payment_id", paymentId);
  if (error) throw new Error(`releaseFailedFirePayment failed: ${error.message}`);
}
