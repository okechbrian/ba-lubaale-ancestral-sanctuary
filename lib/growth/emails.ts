import "server-only";
import type { OutboxEmailInput } from "@/lib/db/email-outbox";

/**
 * Emails a group enquiry owes. Queued in `email_outbox` like every other
 * transactional mail, so a slow or broken SMTP server cannot lose an enquiry
 * that is already recorded in the database.
 *
 * Nothing is quoted or promised: no price, no availability, no reply deadline.
 */
export function prepareGroupInquiryEmails(input: {
  name: string;
  email: string;
  organisation?: string | null;
  groupSize?: number | null;
  window?: string | null;
  message: string;
}): OutboxEmailInput[] {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://ba-lubaale.vercel.app";
  const lines = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.organisation ? `Organisation: ${input.organisation}` : null,
    input.groupSize ? `Group size: ${input.groupSize}` : null,
    input.window ? `Window considered: ${input.window}` : null,
    "",
    input.message,
  ].filter((line): line is string => line !== null);

  const emails: OutboxEmailInput[] = [
    {
      category: "group_inquiry_owner",
      to: process.env.OWNER_NOTIFY_EMAIL ?? "",
      subject: `Group enquiry — ${input.organisation || input.name}`,
      body: [
        "A group enquiry came in through /for-groups.",
        "",
        ...lines,
        "",
        "Reply by email, straight to them.",
        `Full record: ${site}/admin/inquiries`,
      ].join("\n"),
    },
  ];

  // Courtesy confirmation to whoever wrote in. It promises nothing except that
  // the enquiry was received.
  emails.push({
    category: "group_inquiry_acknowledgement",
    to: input.email,
    subject: "We have your enquiry — Ba Lubaale Ancestral Sanctuary",
    body: [
      `Hello ${input.name},`,
      "",
      "Thank you for writing about a group visit. Your enquiry has been received",
      "and read by us.",
      "",
      "We will reply by email with an honest answer — including if the answer is",
      "that it will not work, which is more useful to you than a slow maybe.",
      "",
      "Nothing is booked and nothing has been paid.",
      "",
      "With care,",
      "Queen Nalubaale",
      "Ba Lubaale Ancestral Sanctuary",
    ].join("\n"),
  });

  return emails.filter((e) => e.to !== "");
}