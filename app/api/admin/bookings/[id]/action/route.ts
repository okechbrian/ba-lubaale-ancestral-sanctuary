import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBooking, updateBookingStatus } from "@/lib/db/bookings";
import { getSettings } from "@/lib/db/settings";
import { depositAmountUsd, stayAmountUsd } from "@/lib/booking/pricing";
import { sendAndLog } from "@/lib/email/sender";
import { bookingApprovedGuest, bookingDeclinedGuest } from "@/lib/email/templates";
import { CheckoutNotAllowedError, createOrReuseCheckout } from "@/lib/payments/checkout";
import {
  PesapalApiError,
  PesapalNotConfiguredError,
  isPesapalConfigured,
} from "@/lib/payments/pesapal";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/bookings/[id]/action — { action: "approve" | "decline" }.
 * Approve refuses without Pesapal configured (503, honest matrix), creates the
 * deposit checkout FIRST, then marks the booking approved and emails the
 * guest one message with the payment link. Decline just emails a short honest
 * note. Session-guarded.
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
  if (body.action === "approve" && !isPesapalConfigured()) {
    // Approve = create deposit checkout first; without a provider we refuse
    // before touching any data (never approve without a real link).
    return Response.json({ error: "payment_provider_unavailable" }, { status: 503 });
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

      // Deposit checkout must exist before we call the request approved.
      const checkout = await createOrReuseCheckout(booking, "deposit");

      const updated = await updateBookingStatus(id, "approved", {
        amount_usd: totalUsd,
        approved_at: new Date().toISOString(),
      });
      const email = bookingApprovedGuest(
        updated,
        { totalUsd, depositUsd, depositPercent: settings.depositPercent },
        checkout.checkoutUrl,
      );
      await sendAndLog("booking_approved_guest", updated.email, email.subject, email.text);
      return Response.json({
        ok: true,
        status: "approved",
        totalUsd,
        depositUsd,
        checkout_url: checkout.checkoutUrl,
      });
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
    if (err instanceof PesapalNotConfiguredError) {
      return Response.json({ error: "payment_provider_unavailable" }, { status: 503 });
    }
    if (err instanceof CheckoutNotAllowedError) {
      return Response.json({ error: "checkout_not_allowed" }, { status: 409 });
    }
    if (err instanceof PesapalApiError) {
      console.error("approve checkout failed:", err.message);
      return Response.json({ error: "payment_provider_error" }, { status: 502 });
    }
    console.error(
      "booking action failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "action_failed" }, { status: 500 });
  }
}
