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

/** Host approved the request — deposit amount stated, secure link to follow. */
export function bookingApprovedGuest(
  booking: BookingRow,
  amounts: { totalUsd: number; depositUsd: number; depositPercent: number },
): { subject: string; text: string } {
  return {
    subject: `Your stay request is approved — ${booking.check_in} to ${booking.check_out}`,
    text: [
      `Hello ${booking.name},`,
      "",
      "Good news: your request has been approved.",
      "",
      `Stay: ${booking.stay_slug}`,
      `Dates: ${booking.check_in} to ${booking.check_out}`,
      `Total: $${amounts.totalUsd.toLocaleString("en-US")} USD`,
      `Deposit due now (${amounts.depositPercent}%): $${amounts.depositUsd.toLocaleString("en-US")} USD`,
      `Balance later: $${(
        amounts.totalUsd - amounts.depositUsd
      ).toLocaleString("en-US")} USD`,
      "",
      "A secure payment link for the deposit will arrive by this email shortly.",
      "Do not send money through any other channel — only use the link that",
      "comes from this address.",
      "",
      `Questions? Reply to this email or see ${SITE()}.`,
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Host declined the request — short, honest, no invented reasons. */
export function bookingDeclinedGuest(booking: BookingRow): { subject: string; text: string } {
  return {
    subject: `About your stay request (${booking.check_in} to ${booking.check_out})`,
    text: [
      `Hello ${booking.name},`,
      "",
      "Thank you for your application and for the care you put into it.",
      "",
      "We are not able to host this request at this time. This may be about",
      "dates, capacity, or fit — we hope you understand that not every request",
      "can be accepted.",
      "",
      "You are welcome to apply again for different dates through the website.",
      "",
      "With respect,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}
