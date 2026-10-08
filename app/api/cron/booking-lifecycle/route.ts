import { DatabaseNotConfiguredError, getDb } from "@/lib/db/client";
import { guardCron } from "@/lib/cron/auth";
import {
  cancelBooking,
  listBookings,
  listExpiredHoldApprovals,
  markBalanceReminderSent,
  updateBookingStatus,
} from "@/lib/db/bookings";
import { listPaymentsForBooking } from "@/lib/db/payments";
import {
  balanceReminderGuest,
  holdReleasedGuest,
} from "@/lib/email/templates";

export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Whole calendar days from `now` (UTC day) until the check-in day. */
function daysUntilArrival(checkIn: string, now: Date): number {
  const arrivalMs = new Date(`${checkIn}T00:00:00Z`).getTime();
  const todayMs = new Date(`${isoDay(now)}T00:00:00Z`).getTime();
  return Math.round((arrivalMs - todayMs) / 86400000);
}

async function queueEmail(row: {
  category: string;
  to: string;
  subject: string;
  body: string;
  booking_id: string;
}): Promise<void> {
  const db = getDb();
  const { error } = await db.from("email_outbox").insert([
    {
      category: row.category,
      recipient: row.to,
      subject: row.subject,
      body: row.body,
      booking_id: row.booking_id,
      payment_id: null,
    },
  ]);
  if (error) throw new Error(`email_outbox insert failed: ${error.message}`);
}

/**
 * Booking lifecycle sweep. Vercel Cron hits this daily; `pnpm test` never sees
 * it because the guard refuses without a real bearer token.
 *
 * Three jobs, each guarded so one bad booking never blocks the others:
 *
 * 1. Hold release (b): an `approved` booking whose deposit hold expired with no
 *    completed deposit is cancelled, freeing its window (`cancelled` is outside
 *    the overlap guard's whitelist). The guest is emailed first so the only
 *    state change they learn about comes from us.
 * 2. Balance reminders (c): `paid` bookings with no completed balance get two
 *    outbox-queued reminders, one around 7 days out and one at ~1 day out, each
 *    behind its own flag so a missed run never spams.
 * 3. Completion (a): `paid` bookings whose check-out day has passed become
 *    `completed`.
 */
async function handle(request: Request): Promise<Response> {
  const refused = guardCron(request, "booking-lifecycle");
  if (refused) return refused;

  try {
    const now = new Date();
    const summary = { released: 0, reminders7d: 0, reminders1d: 0, completed: 0, errors: 0 };

    // 1. Release expired holds.
    for (const booking of await listExpiredHoldApprovals(now)) {
      try {
        const payments = await listPaymentsForBooking(booking.id);
        const depositDone = payments.some(
          (p) => p.kind === "deposit" && p.status === "completed",
        );
        if (depositDone) {
          // Reconcile rather than release: a paid stay that lapsed into
          // 'approved' is a data bug, not an empty booking.
          await updateBookingStatus(booking.id, "paid");
          continue;
        }
        const notice = holdReleasedGuest(booking);
        try {
          await queueEmail({
            category: "hold_released_guest",
            to: booking.email,
            subject: notice.subject,
            body: notice.text,
            booking_id: booking.id,
          });
        } catch (err) {
          // The email is important but must not block the release; the row
          // stays queued (or lost by the host), the DB stays truthful.
          console.error(`[booking-lifecycle] release email failed for ${booking.id}:`, err);
        }
        await cancelBooking(
          booking.id,
          `Deposit hold expired on ${booking.payment_due_at?.slice(0, 10)} — booking released.`,
        );
        summary.released++;
      } catch (err) {
        summary.errors++;
        console.error(`[booking-lifecycle] release failed for ${booking.id}:`, err);
      }
    }

    // 2. Balance reminders.
    for (const booking of await listBookings("paid")) {
      try {
        const payments = await listPaymentsForBooking(booking.id);
        const balanceDone = payments.some(
          (p) => p.kind === "balance" && p.status === "completed",
        );
        if (balanceDone) continue;
        const days = daysUntilArrival(booking.check_in, now);
        if (!booking.balance_reminder_7d_sent && days >= 2 && days <= 7) {
          const m = balanceReminderGuest(booking, 7);
          await queueEmail({
            category: "balance_reminder_7d_guest",
            to: booking.email,
            subject: m.subject,
            body: m.text,
            booking_id: booking.id,
          });
          await markBalanceReminderSent(booking.id, 7);
          summary.reminders7d++;
        }
        if (!booking.balance_reminder_1d_sent && days >= 0 && days <= 1) {
          const m = balanceReminderGuest(booking, 1);
          await queueEmail({
            category: "balance_reminder_1d_guest",
            to: booking.email,
            subject: m.subject,
            body: m.text,
            booking_id: booking.id,
          });
          await markBalanceReminderSent(booking.id, 1);
          summary.reminders1d++;
        }
      } catch (err) {
        summary.errors++;
        console.error(`[booking-lifecycle] reminder failed for ${booking.id}:`, err);
      }
    }

    // 3. Complete finished stays.
    for (const booking of await listBookings("paid")) {
      try {
        if (booking.check_out < isoDay(now)) {
          await updateBookingStatus(booking.id, "completed");
          summary.completed++;
        }
      } catch (err) {
        summary.errors++;
        console.error(`[booking-lifecycle] completion failed for ${booking.id}:`, err);
      }
    }

    return Response.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error("[booking-lifecycle] sweep failed:", err);
    return Response.json({ error: "booking_lifecycle_failed" }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
