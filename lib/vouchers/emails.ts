import "server-only";
import {
  voucherIssuedBuyer,
  voucherIssuedRecipient,
  voucherSoldOwner,
} from "@/lib/email/templates";
import type { OutboxEmailInput } from "@/lib/db/email-outbox";

export interface PrepareVoucherInput {
  /** The raw code, already formatted for display. */
  formattedCode: string;
  amountUsd: number;
  buyerEmail: string;
  buyerName?: string | null;
  recipientEmail?: string | null;
  codeHint: string;
}

/**
 * The emails a paid voucher owes, queued inside the issue transaction.
 *
 * The buyer's address may or may not be an owner of this email loop — the owner
 * address is whatever OWNER_NOTIFY_EMAIL says (the same convention every other
 * template follows), so no address is ever hard-coded here. The owner's copy
 * carries only the fingerprint, never the code: the owner can void and reissue,
 * but cannot read a guest's voucher out of the admin console.
 */
export function prepareVoucherEmails(input: PrepareVoucherInput): OutboxEmailInput[] {
  const emails: OutboxEmailInput[] = [];

  emails.push({
    category: "voucher_issued_buyer",
    to: input.buyerEmail,
    ...wrap(
      voucherIssuedBuyer({
        formattedCode: input.formattedCode,
        amountUsd: input.amountUsd,
        buyerName: input.buyerName,
      }),
    ),
  });

  // Only when the buyer named someone else — never send a gift twice.
  if (
    input.recipientEmail &&
    input.recipientEmail.toLowerCase() !== input.buyerEmail.toLowerCase()
  ) {
    emails.push({
      category: "voucher_issued_recipient",
      to: input.recipientEmail,
      ...wrap(
        voucherIssuedRecipient({
          formattedCode: input.formattedCode,
          amountUsd: input.amountUsd,
          giftedTo: input.buyerName ?? input.buyerEmail ?? null,
        }),
      ),
    });
  }

  const owner = process.env.OWNER_NOTIFY_EMAIL;
  if (owner) {
    emails.push({
      category: "voucher_issued_owner",
      to: owner,
      ...wrap(
        voucherSoldOwner({
          amountUsd: input.amountUsd,
          buyerEmail: input.buyerEmail,
          recipientEmail: input.recipientEmail ?? null,
          codeHint: input.codeHint,
        }),
      ),
    });
  }

  return emails;
}

function wrap(email: { subject: string; text: string }): {
  subject: string;
  body: string;
} {
  return { subject: email.subject, body: email.text };
}