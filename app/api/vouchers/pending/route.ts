import { getSettings } from "@/lib/db/settings";
import { getVoucherRequest } from "@/lib/db/vouchers";
import { voucherRequestSchema } from "@/lib/vouchers/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/vouchers/pending — does the buyer need to pay before we email them?
 *
 * Called by /vouchers right after Pesapal redirects back. It reports only the
 * *paid* case, and only for a payment whose tracking id we issued. Anything else
 * (unknown id, still pending, already paid) answers `{ paid: false }` without
 * leaking whether the id exists or what state it is in.
 */
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("payment_id");
  if (!id) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  let request_;
  try {
    request_ = await getVoucherRequest(id);
  } catch {
    return Response.json({ error: "database_not_configured" }, { status: 503 });
  }
  if (!request_) {
    return Response.json({ paid: false }, { status: 200 });
  }

  const { getDb } = await import("@/lib/db/client");
  const { data, error } = await getDb()
    .from("payments")
    .select("status, subject_kind, amount_usd")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return Response.json({ paid: false }, { status: 200 });
  }

  const payment = data as {
    status: string;
    subject_kind: string;
    amount_usd: string;
  };
  // Guard against a stay payment id being probed here.
  if (payment.subject_kind !== "voucher") {
    return Response.json({ paid: false }, { status: 200 });
  }

  const paid = payment.status === "completed";
  return Response.json(
    paid ? { paid: true, amount_usd: Number(payment.amount_usd) } : { paid: false },
    // Never cache: the answer changes when the IPN lands.
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** The public price list, straight from the owner's settings. */
export async function listVoucherAmounts(): Promise<number[]> {
  const settings = await getSettings();
  return settings.voucherAmountsUsd ?? [];
}

export { voucherRequestSchema };