import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  howToPrepareGuest,
  subscriberAlreadySubscribedEmail,
  subscriberConfirmEmail,
  subscriberWelcomeEmail,
} from "@/lib/email/templates";
import { prepareDefault } from "@/content/prepare";
import type { BookingRow } from "@/lib/db/types";

// The sanctuary's private number must never appear in any email.
const PRIVATE_PHONE = "0706559119";

const savedSite = process.env.NEXT_PUBLIC_SITE_URL;
beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});
afterAll(() => {
  if (savedSite !== undefined) process.env.NEXT_PUBLIC_SITE_URL = savedSite;
});

const booking: BookingRow = {
  id: "11111111-2222-3333-4444-555555555555",
  created_at: "2027-01-01T00:00:00Z",
  updated_at: "2027-01-01T00:00:00Z",
  name: "Amina Nakato",
  email: "amina@example.com",
  whatsapp: null,
  country: "Uganda",
  requested_window: null,
  party: "solo",
  stay_slug: "master",
  check_in: "2027-08-10",
  check_out: "2027-08-14",
  drawing: "Seeking stillness.",
  comfort: "Comfortable.",
  limits: null,
  protocols: true,
  digital_sunset: true,
  burden: "Stress.",
  policies_ok: true,
  complementary_ok: true,
  status: "approved",
  amount_usd: "4500",
  approved_at: "2027-01-02T00:00:00Z",
  cancelled_at: null,
  refund_note: null,
  payment_due_at: null,
  balance_due_date: null,
  balance_reminder_7d_sent: false,
  balance_reminder_1d_sent: false,
  redeemed_voucher_id: null,
  voucher_credit_usd: null,
};

describe("howToPrepareGuest — built from the SAME content as /prepare", () => {
  const mail = howToPrepareGuest(booking);
  const p = prepareDefault;

  it("greets the guest with their own name and dates", () => {
    expect(mail.text).toContain("Hello Amina Nakato,");
    expect(mail.text).toContain("2027-08-10 to 2027-08-14");
    expect(mail.subject).toContain("2027-08-10 to 2027-08-14");
  });

  it("carries every section heading from content/prepare.ts", () => {
    expect(mail.text).toContain(p.arrival.heading);
    expect(mail.text).toContain(p.packing.heading);
    expect(mail.text).toContain(p.digitalSunset.heading);
    expect(mail.text).toContain(p.substanceFree.heading);
    expect(mail.text).toContain(p.foodProtocol.heading);
    expect(mail.text).toContain(p.photography.heading);
    expect(mail.text).toContain(p.important.heading);
  });

  it("carries EVERY pack and leave-behind item verbatim", () => {
    for (const item of [...p.packing.pack, ...p.packing.leaveBehind]) {
      expect(mail.text).toContain(item);
    }
    for (const para of [
      ...p.arrival.paragraphs,
      p.digitalSunset.body,
      p.substanceFree.body,
      ...p.foodProtocol.paragraphs,
      p.photography.body,
      ...p.important.paragraphs,
    ]) {
      expect(mail.text).toContain(para);
    }
  });

  it("links the full guide and the journey page", () => {
    expect(mail.text).toContain("https://ba-lubaale.vercel.app/prepare");
    expect(mail.text).toContain("https://ba-lubaale.vercel.app/arrive");
  });

  it("stays inside the content locks: no private phone, no invented prices", () => {
    expect(mail.text).not.toContain(PRIVATE_PHONE);
    expect(mail.text).not.toMatch(/\$?\d{1,2},?\d{3}\s*USD/);
    expect(mail.text).not.toMatch(/UGX\s+\d/);
    expect(mail.text).not.toMatch(/2200|3600|4500|7200|10000|1500/);
  });
});

describe("subscriber emails — every marketing mail carries a way out", () => {
  it("confirm email links /subscribe/confirm and explains double opt-in", () => {
    const mail = subscriberConfirmEmail("TOKEN123");
    expect(mail.text).toContain(
      "https://ba-lubaale.vercel.app/subscribe/confirm?token=TOKEN123",
    );
    expect(mail.text).toContain("Nothing is ever sent until you confirm");
    expect(mail.text).toContain("ignore this email");
    expect(mail.text).not.toContain(PRIVATE_PHONE);
  });

  it("welcome email (sent on confirm) carries the unsubscribe link", () => {
    const mail = subscriberWelcomeEmail("UNSUB456");
    expect(mail.text).toContain(
      "https://ba-lubaale.vercel.app/subscribe/unsubscribe?token=UNSUB456",
    );
    expect(mail.subject).toContain("subscribed");
    expect(mail.text).not.toContain(PRIVATE_PHONE);
  });

  it("already-subscribed email carries the unsubscribe link too", () => {
    const mail = subscriberAlreadySubscribedEmail("UNSUB789");
    expect(mail.text).toContain(
      "https://ba-lubaale.vercel.app/subscribe/unsubscribe?token=UNSUB789",
    );
    expect(mail.text).toContain("already on the sanctuary mailing list");
    expect(mail.text).not.toContain(PRIVATE_PHONE);
  });

  it("respects NEXT_PUBLIC_SITE_URL when it is set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sanctuary.example";
    try {
      const mail = subscriberConfirmEmail("T");
      expect(mail.text).toContain("https://sanctuary.example/subscribe/confirm");
    } finally {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
  });
});
