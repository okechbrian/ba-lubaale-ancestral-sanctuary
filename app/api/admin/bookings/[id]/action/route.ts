import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBooking, updateBookingStatus } from "@/lib/db/bookings";
import { getSettings } from "@/lib/db/settings";
import { depositAmountUsd, stayAmountUsd } from "@/lib/booking/pricing";
import { sendAndLog } from "@/lib/email/sender";
import { bookingApprovedGuest, bookingDeclinedGuest } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/bookings/[id]/action — { action: "approve" | "decline" }.
 * Approve prices the stay from owner settings and emails the guest the
 * deposit figures; decline emails a short, honest note. Session-guarded.
 */
export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "decline") {
    return Response.json({ error: "invalid_action" }, { status: 400 });
  }

  try {
    const booking = await getBooking(id);
    if (!booking) return Response.json({ error: "not_found" }, { status: 404 });
    if (booking.status !== "pending") {
      return Response.json(
        { error: "invalid_transition", status: booking.status },
        { status: 409 },
      );
    }

    if (body.action === "approve") {
      const settings = await getSettings();
      const totalUsd = stayAmountUsd(booking.stay_slug, booking.party, settings);
      const depositUsd = depositAmountUsd(totalUsd, settings);
      const updated = await updateBookingStatus(id, "approved", {
        amount_usd: totalUsd,
        approved_at: new Date().toISOString(),
      });
      const email = bookingApprovedGuest(updated, {
        totalUsd,
        depositUsd,
        depositPercent: settings.depositPercent,
      });
      await sendAndLog("booking_approved_guest", updated.email, email.subject, email.text);
      return Response.json({ ok: true, status: "approved", totalUsd, depositUsd });
    }

    const updated = await updateBookingStatus(id, "declined");
    const email = bookingDeclinedGuest(updated);
    await sendAndLog(
      "booking_declined_guest",
      updated.email,
      email.subject,
      email.text,
    );
    return Response.json({ ok: true, status: "declined" });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "booking action failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "action_failed" }, { status: 500 });
  }
}
