import type { BookingRow } from "@/lib/db/types";

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://ba-lubaale.vercel.app";

const yn = (v: boolean) => (v ? "yes" : "no");

/** Guest confirmation: request received, nothing paid yet. */
export function bookingReceivedGuest(
  booking: BookingRow,
): { subject: string; text: string } {
  return {
    subject: "We received your stay request — Ba Lubaale Ancestral Sanctuary",
    text: [
      `Hello ${booking.name},`,
      "",
      "Thank you for your application for a stay at Ba Lubaale Ancestral Sanctuary.",
      "",
      `Requested dates: ${booking.check_in} to ${booking.check_out}`,
      `Requested immersion: ${booking.stay_slug}`,
      "",
      "This request does not take any payment. If the dates work and there is a fit,",
      "the host will approve the request and send you a secure payment link for the",
      "50% deposit.",
      "",
      `If anything is wrong or urgent, reply to this email or write to us at ${SITE()}.`,
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Owner notification: a new request to review in /admin. */
export function ownerNewBooking(booking: BookingRow): { subject: string; text: string } {
  return {
    subject: `New stay request: ${booking.name} (${booking.check_in} → ${booking.check_out})`,
    text: [
      `New booking request #${booking.id}`,
      "",
      `Name: ${booking.name}`,
      `Email: ${booking.email}`,
      `WhatsApp: ${booking.whatsapp || "not given"}`,
      `Country: ${booking.country}`,
      `Party: ${booking.party}`,
      `Stay: ${booking.stay_slug}`,
      `Window: ${booking.check_in} to ${booking.check_out}`,
      booking.requested_window ? `Requested window: ${booking.requested_window}` : "",
      "",
      `Drawing here: ${booking.drawing}`,
      `Comfort level: ${booking.comfort}`,
      `Limits: ${booking.limits || "—"}`,
      `Protocols: ${yn(booking.protocols)}   Digital sunset: ${yn(booking.digital_sunset)}`,
      `Ready to set down: ${booking.burden}`,
      "",
      `Approve, decline or message the guest from ${SITE()}/admin.`,
      "",
      "This is an automated notification from the sanctuary website.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
