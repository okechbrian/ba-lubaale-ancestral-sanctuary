import type { BookingRow } from "@/lib/db/types";
import { prepareDefault } from "@/content/prepare";

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

/** Host approved the request — deposit link included. */
export function bookingApprovedGuest(
  booking: BookingRow,
  amounts: { totalUsd: number; depositUsd: number; depositPercent: number },
  paymentUrl: string,
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
      "Pay the deposit securely here (cards, MTN MoMo, Airtel Money):",
      paymentUrl,
      "",
      "The link opens Pesapal's hosted payment page. Do not send money through",
      "any other channel — only through this link.",
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

/** Secure hosted-checkout link (Pesapal) for deposit or balance. */
export function paymentLinkGuest(
  booking: BookingRow,
  info: {
    kind: "deposit" | "balance";
    amountUsd: number;
    amountUgx: number;
    url: string;
  },
): { subject: string; text: string } {
  const label = info.kind === "deposit" ? "Deposit" : "Balance";
  return {
    subject: `${label} payment link — $${info.amountUsd.toLocaleString("en-US")} USD (payable in UGX)`,
    text: [
      `Hello ${booking.name},`,
      "",
      `Your ${label.toLowerCase()} for the stay (${booking.check_in} to ${booking.check_out}):`,
      `$${info.amountUsd.toLocaleString("en-US")} USD`,
      `Charge in UGX: ${info.amountUgx.toLocaleString("en-US")} UGX`,
      "",
      "Pay securely here (cards, MTN MoMo, Airtel Money):",
      info.url,
      "",
      "The link opens Pesapal's hosted payment page. Do not send money through",
      "any other channel — only through this link.",
      "",
      "If the link has expired or anything looks wrong, reply to this email and",
      "a fresh one will be sent.",
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Deposit completed — booking confirmed, balance figure stated. */
export function depositReceivedGuest(
  booking: BookingRow,
  amounts: { totalUsd: number; depositUsd: number },
): { subject: string; text: string } {
  return {
    subject: `Deposit received — your stay is confirmed (${booking.check_in})`,
    text: [
      `Hello ${booking.name},`,
      "",
      "Your deposit has been received. Your stay is confirmed:",
      "",
      `Dates: ${booking.check_in} to ${booking.check_out}`,
      `Total: $${amounts.totalUsd.toLocaleString("en-US")} USD`,
      `Paid now: $${amounts.depositUsd.toLocaleString("en-US")} USD`,
      `Balance remaining: $${(
        amounts.totalUsd - amounts.depositUsd
      ).toLocaleString("en-US")} USD (due before arrival — a separate link will arrive closer to the date)`,
      "",
      "Please start planning your arrival: the boat connection and what to bring",
      `are described at ${SITE()}/arrive.`,
      "",
      "With joy,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/**
 * How-to-prepare guide, auto-sent when the deposit clears. Built from the
 * SAME content/prepare.ts that renders /prepare, so page and email can never
 * drift apart. No prices, no phone numbers — protocol text and links only.
 */
export function howToPrepareGuest(
  booking: BookingRow,
): { subject: string; text: string } {
  const p = prepareDefault;
  return {
    subject: `How to prepare for your stay (${booking.check_in} to ${booking.check_out})`,
    text: [
      `Hello ${booking.name},`,
      "",
      `Your deposit is received and your stay (${booking.check_in} to ${booking.check_out})`,
      "is confirmed. Here is everything to know before you arrive — always",
      `current at ${SITE()}/prepare.`,
      "",
      `${p.arrival.heading}`,
      ...p.arrival.paragraphs,
      "",
      `${p.arrival.link.label}: ${SITE()}${p.arrival.link.href}`,
      "",
      `${p.packing.heading}`,
      "",
      `${p.packing.packTitle}:`,
      ...p.packing.pack.map((item) => `- ${item}`),
      "",
      `${p.packing.leaveTitle}:`,
      ...p.packing.leaveBehind.map((item) => `- ${item}`),
      "",
      `${p.digitalSunset.heading}`,
      p.digitalSunset.body,
      "",
      `${p.substanceFree.heading}`,
      p.substanceFree.body,
      "",
      `${p.foodProtocol.heading}`,
      ...p.foodProtocol.paragraphs,
      "",
      `${p.photography.heading}`,
      p.photography.body,
      "",
      `${p.important.heading}`,
      ...p.important.paragraphs,
      "",
      `Full guide: ${SITE()}/prepare`,
      "",
      "With joy,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Balance completed — fully paid. */
export function balanceReceivedGuest(
  booking: BookingRow,
  totalUsd: number,
): { subject: string; text: string } {
  return {
    subject: `Fully paid — see you soon (${booking.check_in})`,
    text: [
      `Hello ${booking.name},`,
      "",
      "Your balance payment has been received. Your stay is now fully paid:",
      "",
      `Dates: ${booking.check_in} to ${booking.check_out}`,
      `Total paid: $${totalUsd.toLocaleString("en-US")} USD`,
      "",
      `Arrival details: ${SITE()}/arrive — do not book flights until the boat is confirmed.`,
      "",
      "With joy,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Owner notification: money arrived. */
export function ownerPaymentReceived(
  booking: BookingRow,
  payment: { kind: string; amount_usd: string | number; amount_ugx: string | number },
): { subject: string; text: string } {
  return {
    subject: `Payment received: $${Number(payment.amount_usd).toLocaleString("en-US")} USD ${payment.kind} — ${booking.name}`,
    text: [
      `${payment.kind} payment completed for booking #${booking.id}`,
      "",
      `Guest: ${booking.name} (${booking.email})`,
      `Dates: ${booking.check_in} to ${booking.check_out}`,
      `Amount: $${Number(payment.amount_usd).toLocaleString("en-US")} USD`,
      `Charged: ${Number(payment.amount_ugx).toLocaleString("en-US")} UGX`,
      "",
      `Booking status: ${booking.status}`,
      `Review anytime: ${SITE()}/admin`,
      "",
      "This is an automated notification from the sanctuary website.",
    ].join("\n"),
  };
}

/** Double opt-in: the link that actually adds the address to the list. */
export function subscriberConfirmEmail(confirmToken: string): {
  subject: string;
  text: string;
} {
  const confirmUrl = `${SITE()}/subscribe/confirm?token=${confirmToken}`;
  return {
    subject: "Confirm your subscription — Ba Lubaale Ancestral Sanctuary",
    text: [
      "Hello,",
      "",
      "Someone asked to add this address to the sanctuary mailing list.",
      "",
      "Confirm the subscription here:",
      confirmUrl,
      "",
      "Nothing is ever sent until you confirm. If you did not request this,",
      "ignore this email — the address simply stays off the list.",
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Sent once, when the confirm link is clicked. Carries the unsubscribe link. */
export function subscriberWelcomeEmail(unsubToken: string): {
  subject: string;
  text: string;
} {
  const unsubUrl = `${SITE()}/subscribe/unsubscribe?token=${unsubToken}`;
  return {
    subject: "You're subscribed — Ba Lubaale Ancestral Sanctuary",
    text: [
      "Hello,",
      "",
      "You are on the list. Expect occasional notes from the sanctuary:",
      "stories from the land and the household, and the dates we open.",
      "",
      "Leave the list at any time here:",
      unsubUrl,
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

/** Address already confirmed — a fresh request changes nothing. */
export function subscriberAlreadySubscribedEmail(unsubToken: string): {
  subject: string;
  text: string;
} {
  const unsubUrl = `${SITE()}/subscribe/unsubscribe?token=${unsubToken}`;
  return {
    subject: "You're already subscribed — Ba Lubaale Ancestral Sanctuary",
    text: [
      "Hello,",
      "",
      "This address is already on the sanctuary mailing list, so there was",
      "nothing new to confirm.",
      "",
      "Leave the list at any time here:",
      unsubUrl,
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  };
}

export interface VoucherEmailInput {
  /** Pre-formatted for display, e.g. "1A2B 3C4D …". */
  formattedCode: string;
  amountUsd: number;
  /** Who bought it — used only for a personal line. */
  buyerName?: string | null;
  /** Set when the voucher is a gift for someone else. */
  giftedTo?: string | null;
}

function voucherBodyLines(v: VoucherEmailInput): string[] {
  return [
    "Your voucher code:",
    "",
    v.formattedCode,
    "",
    `Value: USD ${v.amountUsd}`,
    "",
    "Keep this code safe — it is the only way to use the voucher, and we cannot",
    "send it again (we store only a fingerprint of it, never the code itself).",
    "",
    "To use it, tell us the code when you apply for a stay and we will apply the",
    "voucher against your booking.",
    "",
    v.giftedTo
      ? `This voucher is a gift for ${v.giftedTo}.`
      : "You can pass it on to someone else if you wish — just forward this email.",
    "",
    "With care,",
    "Queen Nalubaale",
    "Ba Lubaale Ancestral Sanctuary",
  ];
}

/** Buyer: the voucher they just paid for. */
export function voucherIssuedBuyer(v: VoucherEmailInput): {
  subject: string;
  text: string;
} {
  const hello = v.buyerName?.trim() ? `Hello ${v.buyerName.trim()},` : "Hello,";
  return {
    subject: "Your Ba Lubaale voucher",
    text: [hello, "", "Thank you — your voucher is ready.", "", ...voucherBodyLines(v)].join(
      "\n",
    ),
  };
}

/** Optional second recipient, when the buyer is gifting the voucher. */
export function voucherIssuedRecipient(v: VoucherEmailInput): {
  subject: string;
  text: string;
} {
  return {
    subject: "Someone has given you a Ba Lubaale voucher",
    text: [
      "Hello,",
      "",
      "Someone has bought you a voucher for a stay at Ba Lubaale Ancestral Sanctuary.",
      "",
      ...voucherBodyLines(v),
    ].join("\n"),
  };
}

/** Owner: a voucher was sold. Contains no code — only the fingerprint. */
export function voucherSoldOwner(v: {
  amountUsd: number;
  buyerEmail: string;
  recipientEmail: string | null;
  codeHint: string;
}): { subject: string; text: string } {
  return {
    subject: `Voucher sold — USD ${v.amountUsd}`,
    text: [
      "A voucher was paid for and issued.",
      "",
      `Amount: USD ${v.amountUsd}`,
      `Buyer: ${v.buyerEmail}`,
      v.recipientEmail ? `Gift recipient: ${v.recipientEmail}` : "Gift recipient: none",
      `Code fingerprint: ...${v.codeHint}`,
      "",
      "The code itself is not stored and cannot be retrieved — if the buyer loses",
      "the email, void the voucher and issue a new one from /admin/vouchers.",
      "",
      `Review it at ${SITE()}/admin/vouchers.`,
    ].join("\n"),
  };
}
