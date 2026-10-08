import "server-only";
import type { OutboxEmailInput } from "@/lib/db/email-outbox";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://ba-lubaale-ancestral-sanctuary.vercel.app"
  );
}

export function prepareFireCircleReceivedEmails(input: {
  name: string;
  email: string;
  message: string;
}): OutboxEmailInput[] {
  const owner = process.env.OWNER_NOTIFY_EMAIL ?? "";
  const emails: OutboxEmailInput[] = [
    {
      category: "fire_circle_received_guest",
      to: input.email,
      subject: "Your fire circle request — Ba Lubaale",
      body: [
        `Hello ${input.name},`,
        "",
        "Your request for the monthly fire circle has been received.",
        "Nothing is reserved and nothing has been paid.",
        "If there is a place, you will receive a seat link and the fee.",
        "",
        "Queen Nalubaale",
        "Ba Lubaale Ancestral Sanctuary",
      ].join("\n"),
    },
  ];
  if (owner) {
    emails.push({
      category: "fire_circle_received_owner",
      to: owner,
      subject: `Fire circle request — ${input.name}`,
      body: [
        "A fire circle request came in.",
        "",
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        "",
        input.message,
        "",
        `${siteUrl()}/admin/fire-circle`,
      ].join("\n"),
    });
  }
  return emails;
}

export function prepareFireCircleApprovedEmail(input: {
  name: string;
  email: string;
  token: string;
  feeUsd: number;
}): OutboxEmailInput {
  const link = `${siteUrl()}/fire-circle/seat/${input.token}`;
  return {
    category: "fire_circle_approved_guest",
    to: input.email,
    subject: "A seat is open — the fire circle",
    body: [
      `Hello ${input.name},`,
      "",
      "There is a place for you at the monthly fire circle.",
      `The fee is USD ${input.feeUsd}.`,
      "Open this link to pay. The way in for the evening appears only after payment.",
      "",
      link,
      "",
      "Queen Nalubaale",
    ].join("\n"),
  };
}

export function prepareFireCircleDeclinedEmail(input: {
  name: string;
  email: string;
}): OutboxEmailInput {
  return {
    category: "fire_circle_declined_guest",
    to: input.email,
    subject: "The fire circle — Ba Lubaale",
    body: [
      `Hello ${input.name},`,
      "",
      "This month's circle is not a fit.",
      "Nothing has been paid.",
      "",
      "Queen Nalubaale",
    ].join("\n"),
  };
}

export function prepareFireCirclePaidEmail(input: {
  name: string;
  email: string;
}): OutboxEmailInput {
  return {
    category: "fire_circle_paid_guest",
    to: input.email,
    subject: "Your fire circle seat is paid",
    body: [
      `Hello ${input.name},`,
      "",
      "Your seat is paid.",
      "Open the same seat link from the approval email.",
      "The way in for the evening is on that page, once it has been placed.",
      "",
      "Queen Nalubaale",
    ].join("\n"),
  };
}
