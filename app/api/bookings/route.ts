import { AvailabilityConflictError } from "@/lib/booking/availability";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { insertBooking } from "@/lib/db/bookings";
import { assertWindowAvailable } from "@/lib/db/availability";
import { sendAndLog } from "@/lib/email/sender";
import { bookingReceivedGuest, ownerNewBooking } from "@/lib/email/templates";
import type { NewBooking } from "@/lib/db/bookings";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings — server-validated stay intake.
 * 400 invalid payload · 409 dates unavailable · 503 database missing ·
 * 201 stored. Emails (guest received + owner notify) run after a successful
 * insert and never block the response path with an exception.
 */
export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(json);
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

  const form = parsed.data;
  const input: NewBooking = {
    name: form.name,
    email: form.email,
    whatsapp: form.whatsapp || undefined,
    country: form.country,
    requested_window: form.requested_window || undefined,
    party: form.party,
    stay_slug: form.stay_slug,
    check_in: form.check_in,
    check_out: form.check_out,
    drawing: form.drawing,
    comfort: form.comfort,
    limits: form.limits || undefined,
    protocols: form.protocols === "yes",
    digital_sunset: form.digital_sunset === "yes",
    burden: form.burden,
  };

  try {
    await assertWindowAvailable({ check_in: form.check_in, check_out: form.check_out });
    const booking = await insertBooking(input);

    const guest = bookingReceivedGuest(booking);
    await sendAndLog(
      "booking_received_guest",
      booking.email,
      guest.subject,
      guest.text,
    );
    const ownerNotify = process.env.OWNER_NOTIFY_EMAIL;
    if (ownerNotify) {
      const owner = ownerNewBooking(booking);
      await sendAndLog("owner_new_booking", ownerNotify, owner.subject, owner.text);
    }

    return Response.json({ id: booking.id, status: booking.status }, { status: 201 });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    if (err instanceof AvailabilityConflictError) {
      return Response.json(
        { error: "dates_unavailable", message: err.message },
        { status: 409 },
      );
    }
    console.error(
      "bookings POST failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "booking_failed" }, { status: 500 });
  }
}
