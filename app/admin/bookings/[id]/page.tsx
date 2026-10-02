import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBooking } from "@/lib/db/bookings";
import BookingActions from "@/components/BookingActions";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string | null | boolean }) {
  const text =
    typeof value === "boolean" ? (value ? "yes" : "no") : value || "—";
  return (
    <div className="grid gap-1 border-b border-mist py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium uppercase text-ink/50">{label}</dt>
      <dd className="text-sm text-ink sm:col-span-2">{text}</dd>
    </div>
  );
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let booking: Awaited<ReturnType<typeof getBooking>>;
  try {
    booking = await getBooking(id);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return (
        <div className="rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — cannot load this request.
        </div>
      );
    }
    throw err;
  }
  if (!booking) notFound();

  return (
    <div>
      <Link href="/admin" className="text-sm text-lake hover:underline">
        ← All requests
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {booking.name}
        </h1>
        <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink/70">
          {booking.status}
          {booking.amount_usd
            ? ` · $${Number(booking.amount_usd).toLocaleString("en-US")} USD`
            : ""}
        </span>
      </div>

      <dl className="mt-6 rounded-md border border-mist bg-white px-4 sm:px-6">
        <Row label="Received" value={booking.created_at.replace("T", " ").slice(0, 16)} />
        <Row label="Email" value={booking.email} />
        <Row label="WhatsApp" value={booking.whatsapp} />
        <Row label="Country" value={booking.country} />
        <Row label="Party" value={booking.party} />
        <Row label="Stay" value={booking.stay_slug} />
        <Row
          label="Dates"
          value={`${booking.check_in} → ${booking.check_out}`}
        />
        <Row label="Requested window" value={booking.requested_window} />
        <Row label="Drawing here" value={booking.drawing} />
        <Row label="Comfort level" value={booking.comfort} />
        <Row label="Limits / allergies" value={booking.limits} />
        <Row label="Honour protocols" value={booking.protocols} />
        <Row label="Digital sunset" value={booking.digital_sunset} />
        <Row label="Ready to set down" value={booking.burden} />
        <Row label="Policies acknowledged" value={booking.policies_ok} />
        <Row label="Complementary-care acknowledged" value={booking.complementary_ok} />
        {booking.approved_at && (
          <Row
            label="Approved"
            value={booking.approved_at.replace("T", " ").slice(0, 16)}
          />
        )}
      </dl>

      <div className="mt-6">
        <BookingActions id={booking.id} status={booking.status} />
      </div>
    </div>
  );
}
