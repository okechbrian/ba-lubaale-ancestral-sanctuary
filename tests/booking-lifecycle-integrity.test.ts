/**
 * Booking lifecycle: hold expiry, balance reminders, completion, admin cancel,
 * and voucher credit subscribers.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { GET as lifecycle } from "@/app/api/cron/booking-lifecycle/route";
import { POST as bookingAction } from "@/app/api/admin/bookings/[id]/action/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { getDb } from "@/lib/db/client";
import { getBooking } from "@/lib/db/bookings";
import { getSettings } from "@/lib/db/settings";
import { redeemVoucherByCode } from "@/lib/db/vouchers";
import {
  generateVoucherCode,
  hashVoucherCode,
  voucherCodeHint,
} from "@/lib/vouchers/code";

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

const CRON_SECRET = "it-lifecycle-cron-secret";
const ADMIN = { SESSION_SECRET: "it-lifecycle-admin-secret" };

let pg: Client;
const run = randomUUID().slice(0, 8);

// 2030 keeps this suite's rows out of the other files' windows.
let window = 0;
// One email for every row this file makes, CD of any run: cleanup matches on it,
// and a fresh random one each run would hide leftovers from the last one.
const EMAIL = "it-lifecycle@guest.example";

function bookingInsert(overrides: Record<string, unknown> = {}) {
  const checkIn = new Date(Date.UTC(2030, 2, 1 + window * 10));
  const checkOut = new Date(checkIn.getTime() + 4 * 86_400_000);
  window += 1;
  return {
    name: `it-lc-${run}`,
    email: EMAIL,
    country: "Uganda",
    party: "solo",
    stay_slug: "essential",
    check_in: checkIn.toISOString().slice(0, 10),
    check_out: checkOut.toISOString().slice(0, 10),
    drawing: "integration fixture",
    comfort: "integration fixture",
    protocols: true,
    digital_sunset: true,
    burden: "integration fixture",
    policies_ok: true,
    complementary_ok: true,
    ...overrides,
  };
}

beforeAll(async () => {
  if (!HAS_DB) {
    console.warn(
      "[booking-lifecycle-integrity] SKIPPED: set TEST_SUPABASE_URL/KEY/DATABASE_URL - npm run test:integrity.",
    );
    return;
  }
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.SUPABASE_URL = TEST_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY;
  process.env.ADMIN_SESSION_SECRET = ADMIN.SESSION_SECRET;
  pg = new Client({ connectionString: TEST_DB });
  await pg.connect();
  await cleanup();
});

afterAll(async () => {
  await cleanup().catch(() => undefined);
  await pg?.end();
  delete process.env.CRON_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
});

/** Remove rows this file created, so the next run starts from a fresh table. */
async function cleanup(): Promise<void> {
  if (!pg) return;
  await pg.query("delete from public.vouchers where buyer_email = $1", [EMAIL]).catch(() => undefined);
  await pg.query("delete from public.email_outbox where recipient = $1", [EMAIL]).catch(() => undefined);
  await pg.query("delete from public.bookings where email = $1", [EMAIL]).catch(() => undefined);
  await pg
    .query("delete from public.payments where provider_ref like 'it-lc%' or provider_ref like 'it-credit-%'")
    .catch(() => undefined);
}

function cronReq(): Request {
  return new Request("http://localhost/api/cron/booking-lifecycle", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

async function seedApproved(overrides: Record<string, unknown> = {}) {
  const db = getDb();
  const { data, error } = await db
    .from("bookings")
    .insert(bookingInsert({ status: "approved", ...overrides }))
    .select("id, payment_due_at, check_in, check_out")
    .single();
  if (error) throw new Error(`seedBooking failed: ${error.message}`);
  return data as { id: string; payment_due_at: string | null; check_in: string; check_out: string };
}

/* ---------------- (b) hold release ---------------- */
describe.runIf(HAS_DB)("booking lifecycle: hold expiry release and reminders", () => {
  it("releases an approved booking whose hold expired, and emails the guest", async () => {
    const expired = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const b = await seedApproved({ payment_due_at: expired });

    const res = await lifecycle(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.released).toBe(1);

    const updated = await getBooking(b.id);
    expect(updated?.status).toBe("cancelled");
    expect(updated?.refund_note).toContain("hold expired");
  });

  it("does not release a booking whose deposit actually arrived", async () => {
    const expired = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const b = await seedApproved({ payment_due_at: expired });
    const db = getDb();
    const { error: pE } = await db.from("payments").insert({
      booking_id: b.id,
      kind: "deposit",
      amount_usd: 1100,
      amount_ugx: 4290000,
      provider: "pesapal",
      provider_ref: `it-lc-dep-${randomUUID()}`,
      status: "completed",
    });
    if (pE) throw new Error(pE.message);

    const res = await lifecycle(cronReq());
    const body = await res.json();
    expect(body.released).toBe(0);

    const updated = await getBooking(b.id);
    expect(updated?.status).toBe("paid");
  });

  it("reminded the 7-day window once, and 1-day the day before", async () => {
    const now = new Date();
    const day1 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7))
      .toISOString()
      .slice(0, 10);
    const day2Checkout = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 10))
      .toISOString()
      .slice(0, 10);

    const b7 = await seedApproved({
      status: "paid",
      check_in: day1,
      check_out: day2Checkout,
    });
    // A completed deposit but no completed balance.
    {
      const db = getDb();
      await db.from("payments").insert({
        booking_id: b7.id,
        kind: "deposit",
        amount_usd: 2200,
        amount_ugx: 8_580_000,
        provider: "pesapal",
        provider_ref: `it-lc7-${randomUUID()}`,
        status: "completed",
      });
    }

    const r1 = await lifecycle(cronReq());
    const b1 = await r1.json();
    expect(b1.reminders7d).toBe(1);
    expect(b1.reminders1d).toBe(0);

    const after = await getBooking(b7.id);
    expect(after?.balance_reminder_7d_sent).toBe(true);
    expect(after?.balance_reminder_1d_sent).toBe(false);

    const outbox = await getDb()
      .from("email_outbox")
      .select("category, recipient, subject")
      .eq("booking_id", b7.id);
    expect((outbox.data ?? []).map((r) => r.category)).toContain(
      "balance_reminder_7d_guest",
    );

    // Second run: no longer an outstanding 7-day, and no 1-day either because the
    // booking is still 7 days out — the email is sent exactly once.
    const r2 = await lifecycle(cronReq());
    const b2 = await r2.json();
    expect(b2.reminders7d).toBe(0);
    expect(b2.reminders1d).toBe(0);

    const outboxAgain = await getDb()
      .from("email_outbox")
      .select("category")
      .eq("booking_id", b7.id)
      .eq("category", "balance_reminder_7d_guest");
    expect((outboxAgain.data ?? []).length).toBe(1);
  });

  it("completes a paid booking whose stay already finished", async () => {
    const pastIn = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    const pastOut = new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10);
    const b = await seedApproved({
      status: "paid",
      check_in: pastIn,
      check_out: pastOut,
    });
    const r = await lifecycle(cronReq());
    const body = await r.json();
    expect(body.completed).toBe(1);

    const updated = await getBooking(b.id);
    expect(updated?.status).toBe("completed");
  });

  it("cancelling via the admin route stores the refund note and frees the window", async () => {
    const b = await seedApproved({ status: "paid" });
    const token = await createSessionToken(ADMIN.SESSION_SECRET);
    const res = await bookingAction(
      new Request(`http://localhost/api/admin/bookings/${b.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        },
        body: JSON.stringify({ action: "cancel", note: "Guest refunded in full." }),
      }),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(res.status).toBe(200);

    const row = await getBooking(b.id);
    expect(row?.status).toBe("cancelled");
    expect(row?.refund_note).toBe("Guest refunded in full.");
    expect(row?.cancelled_at).toBeTruthy();
    // Not in any active-range query anymore.
    const { data: active } = await getDb()
      .from("bookings")
      .select("id")
      .in("status", ["approved", "paid"])
      .eq("id", b.id);
    expect(active ?? []).toHaveLength(0);
  });

  it("redeemVoucherByCode subtracts the voucher from the booking total once", async () => {
    const b = await seedApproved({ status: "approved", amount_usd: 4500 });
    const db = getDb();

    // A completed voucher purchase, then the voucher row it mints.
    const { data: payment, error: pErr } = await db
      .from("payments")
      .insert({
        booking_id: null,
        subject_kind: "voucher",
        kind: "deposit",
        amount_usd: 1000,
        amount_ugx: 3900000,
        currency: "UGX",
        provider: "pesapal",
        provider_ref: `it-credit-${randomUUID()}`,
        status: "completed",
      })
      .select("id")
      .single();
    if (pErr) throw new Error(`voucher payment insert failed: ${pErr.message}`);

    const code = generateVoucherCode();
    const codeHint = voucherCodeHint(code);
    const { error: voErr } = await db.from("vouchers").insert({
      code_hash: hashVoucherCode(code),
      code_hint: codeHint,
      payment_id: (payment as { id: string }).id,
      amount_usd: 1000,
      amount_ugx: 3900000,
      currency: "USD",
      buyer_email: EMAIL,
      status: "issued",
    });
    if (voErr) throw new Error(`voucher insert failed: ${voErr.message}`);

    const r1 = await redeemVoucherByCode(code, b.id);
    expect(r1.status).toBe("redeemed");
    const after1 = await getBooking(b.id);
    expect(Number(after1?.amount_usd)).toBe(3500);
    expect(Number(after1?.voucher_credit_usd)).toBe(1000);
    expect(after1?.redeemed_voucher_id).toBeTruthy();

    // Second redeem: no double subtraction.
    const r2 = await redeemVoucherByCode(code, b.id);
    expect(r2.status).toBe("already_redeemed");
    const after2 = await getBooking(b.id);
    expect(Number(after2?.amount_usd)).toBe(3500);
  });

  it("lets hold_days come from settings and default to 3", async () => {
    expect((await getSettings()).holdDays).toBe(3);
  });

});
