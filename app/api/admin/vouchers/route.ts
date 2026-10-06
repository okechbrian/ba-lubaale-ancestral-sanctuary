import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBooking } from "@/lib/db/bookings";
import {
  redeemVoucherByCode,
  voidVoucher,
  VoucherNotRedeemable,
} from "@/lib/db/vouchers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("redeem"),
    code: z.string().min(1, "Enter the voucher code.").max(200),
    booking_id: z.string().uuid("Choose the booking this voucher pays for."),
  }),
  z.object({
    action: z.literal("void"),
    voucher_id: z.string().uuid(),
    reason: z.string().trim().min(3, "Say why it is being voided.").max(300),
  }),
]);

/**
 * POST /api/admin/vouchers — owner actions on a voucher.
 *
 * `redeem` marks it redeemed against a booking; `void` cancels an unused one.
 * Both take the *code*, never an id we hand the browser: the code is hashed and
 * compared in constant time, and an unknown code is reported as not found
 * without revealing whether it ever existed.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "redeem") {
      const { code, booking_id } = parsed.data;
      // The booking must exist: redeeming against a typo would burn the voucher.
      const booking = await getBooking(booking_id);
      if (!booking) {
        return Response.json(
          { error: "booking_not_found", message: "No such booking." },
          { status: 404 },
        );
      }
      // Never redeem against a booking that has already been declined/voided.
      if (booking.status === "declined") {
        return Response.json(
          { error: "booking_not_redeemable" },
          { status: 409 },
        );
      }

      const outcome = await redeemVoucherByCode(code, booking_id);
      if (outcome.status === "redeemed") {
        return Response.json({
          ok: true,
          status: "redeemed",
          voucher_id: outcome.voucher?.id,
          code_hint: outcome.voucher?.code_hint,
          booking_id,
        });
      }
      if (outcome.status === "already_redeemed") {
        return Response.json(
          {
            error: "voucher_already_redeemed",
            booking_id: outcome.bookingId ?? null,
          },
          { status: 409 },
        );
      }
      if (outcome.status === "void") {
        return Response.json({ error: "voucher_void" }, { status: 409 });
      }
      // Unknown code — and an invalid code shape looks identical from outside.
      return Response.json({ error: "voucher_not_found" }, { status: 404 });
    }

    const { voucher_id, reason } = parsed.data;
    const voided = await voidVoucher(voucher_id, reason);
    if (!voided) {
      // Already redeemed or void, or unknown: read the row to say which.
      const db = await findVoucherById(voucher_id);
      if (!db) return Response.json({ error: "voucher_not_found" }, { status: 404 });
      return Response.json(
        { error: "voucher_not_voidable", status: db.status },
        { status: 409 },
      );
    }
    return Response.json({ ok: true, status: "void", voucher_id });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "voucher admin action failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "voucher_action_failed" }, { status: 500 });
  }
}

async function findVoucherById(id: string) {
  const { getDb } = await import("@/lib/db/client");
  const { data, error } = await getDb()
    .from("vouchers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`findVoucherById failed: ${error.message}`);
  return data as { id: string; status: VoucherNotRedeemable | string } | null;
}