/**
 * Voucher integration tests — REAL local Supabase, no faked database.
 * Run via `npm run test:integrity` (supabase start && supabase db reset first).
 *
 * The double-issue guarantee is the point of this file: a replayed IPN, a second
 * webhook id for the same payment, and a concurrent issue attempt must all leave
 * exactly ONE voucher row with ONE code. Everything else (atomicity, the code
 * never being stored in the clear, redemption) supports that.
 *
 * Without the env vars the suite SKIPS with a notice — it never fakes a pass.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { getDb } from "@/lib/db/client";
import { applyVoucherCompletion } from "@/lib/db/payments";
import { insertVoucherPayment, insertVoucherRequest } from "@/lib/db/vouchers";
import {
  findVoucherByCode,
  redeemVoucherByCode,
  voidVoucher,
  listVouchers,
} from "@/lib/db/vouchers";
import {
  generateVoucherCode,
  hashVoucherCode,
  voucherCodeHint,
} from "@/lib/vouchers/code";
import { prepareVoucherEmails } from "@/lib/vouchers/emails";
import type { VoucherRow } from "@/lib/db/types";

// The IPN needs the provider's ANSWER, not the provider. Everything else runs
// unmodified: verification, the atomic RPC, code generation and issuance.
vi.mock("@/lib/payments/pesapal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/pesapal")>();
  return { ...actual, getTransactionStatus: vi.fn(async () => ({ statusCode: 1 })) };
});

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

if (!HAS_DB) {
  console.warn(
    "[vouchers-integrity] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

describe.runIf(HAS_DB)("vouchers (real local Supabase)", () => {
  let pg: Client;
  const savedEnv: Record<string, string | undefined> = {};

  // Approved bookings may never overlap (bookings_no_overlap), so each fixture
  // gets its own window. Day 0 of 2028 is clear of the 2027 dates used by the
  // other suites.
  let windowOffsetDays = 0;

  /** A completed voucher purchase, ready for the issue RPC. */
  async function seedVoucherPayment(opts: {
    amountUsd?: number;
    buyerEmail?: string;
    recipientEmail?: string | null;
    buyerName?: string | null;
  } = {}) {
    const amountUsd = opts.amountUsd ?? 250;
    const payment = await insertVoucherPayment({
      amountUsd,
      amountUgx: Math.round(amountUsd * 3900),
      providerRef: `it-voucher-${randomUUID()}`,
      buyerEmail: opts.buyerEmail ?? "it-buyer@example.test",
      recipientEmail: opts.recipientEmail ?? null,
    });
    await insertVoucherRequest({
      paymentId: payment.id,
      amountUsd,
      buyerEmail: opts.buyerEmail ?? "it-buyer@example.test",
      buyerName: opts.buyerName ?? "Test Buyer",
      recipientEmail: opts.recipientEmail ?? null,
    });
    return payment;
  }

  async function seedBooking(tag: string): Promise<{ id: string }> {
    const db = getDb();
    // 2029 is clear of the 2027/2028 windows the other suites use; the 10-day
    // stride keeps two bookings inside this file apart.
    const checkIn = new Date(Date.UTC(2029, 0, 1 + windowOffsetDays * 10));
    const checkOut = new Date(checkIn.getTime() + 4 * 86_400_000);
    windowOffsetDays += 1;
    void tag;
    const { data, error } = await db
      .from("bookings")
      .insert({
        name: `it-voucher-${tag}`,
        email: "it-buyer@example.test",
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
        status: "approved",
      })
      .select("id")
      .single();
    if (error) throw new Error(`seedBooking failed: ${error.message}`);
    return data as { id: string };
  }

  /** Issue a voucher the way the IPN does: fresh code, digest, queued emails. */
  async function issue(
    paymentId: string,
    externalId: string,
    code = generateVoucherCode(),
    recipientEmail: string | null = null,
  ) {
    const emails = prepareVoucherEmails({
      formattedCode: code,
      amountUsd: 250,
      buyerEmail: "it-buyer@example.test",
      buyerName: "Test Buyer",
      recipientEmail,
      codeHint: voucherCodeHint(code),
    });
    const applied = await applyVoucherCompletion({
      provider: "pesapal",
      externalId,
      paymentId,
      codeHash: hashVoucherCode(code),
      codeHint: voucherCodeHint(code),
      buyerEmail: "it-buyer@example.test",
      recipientEmail: null,
      emails,
    });
    return { applied, code };
  }

  async function vouchersFor(paymentId: string): Promise<VoucherRow[]> {
    const db = getDb();
    const { data, error } = await db
      .from("vouchers")
      .select("*")
      .eq("payment_id", paymentId);
    if (error) throw new Error(`vouchersFor failed: ${error.message}`);
    return (data ?? []) as VoucherRow[];
  }

  beforeAll(async () => {
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    savedEnv.OWNER_NOTIFY_EMAIL = process.env.OWNER_NOTIFY_EMAIL;
    delete process.env.OWNER_NOTIFY_EMAIL; // keeps the owner email out of counts
    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
  }, 30_000);

  // No per-test cleanup: these files run in PARALLEL workers against ONE local
  // database, so deleting mid-run would cascade away rows another file still
  // needs. Every assertion is scoped to this suite's own payment ids instead,
  // and the fixtures are removed in afterAll.

  afterAll(async () => {
    await pg
      .query("delete from public.bookings where name like 'it-voucher-%'")
      .catch(() => undefined);
    await pg
      .query("delete from public.payments where provider_ref like 'it-voucher-%'")
      .catch(() => undefined);
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pg.end().catch(() => undefined);
  });

  it("issues exactly one voucher with a unique code on the first IPN", async () => {
    const payment = await seedVoucherPayment();
    const { applied, code } = await issue(payment.id, `it-ext-${randomUUID()}`);

    expect(applied.claimed).toBe(true);
    expect(applied.issued).toBe(true);
    expect(applied.payment_status).toBe("completed");
    expect(applied.voucher_id).toBeTruthy();

    const rows = await vouchersFor(payment.id);
    expect(rows).toHaveLength(1);
    const voucher = rows[0];
    expect(voucher.status).toBe("issued");
    // The amount is copied from the payment, which the owner priced.
    expect(Number(voucher.amount_usd)).toBe(250);
    expect(voucher.buyer_email).toBe("it-buyer@example.test");
    // The code itself is NOT stored — only its digest and a 4-char hint.
    expect(voucher.code_hash).toBe(hashVoucherCode(code));
    expect(voucher.code_hint).toBe(voucherCodeHint(code));
    expect(JSON.stringify(voucher)).not.toContain(code);
    expect(JSON.stringify(voucher)).not.toContain(code.replace(/-/g, ""));
  });

  it("replayed IPN with the same webhook id issues NO second code", async () => {
    const payment = await seedVoucherPayment();
    const externalId = `it-ext-${randomUUID()}`;
    const { code } = await issue(payment.id, externalId);

    // Pesapal retries the identical event.
    const replay = await issue(payment.id, externalId);
    expect(replay.applied.claimed).toBe(false);
    expect(replay.applied.issued).toBe(false);

    const rows = await vouchersFor(payment.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).toBe(hashVoucherCode(code)); // the FIRST code stands
  });

  it("a DIFFERENT webhook id for the same payment still issues no second code", async () => {
    const payment = await seedVoucherPayment();
    const first = await issue(payment.id, `it-ext-${randomUUID()}`);
    expect(first.applied.issued).toBe(true);

    // A second, previously-unseen event (provider retry with a new id, a manual
    // replay, an attacker guessing our endpoint). The claim passes — the event
    // IS new — so the payment-completion check is what must stop the issue.
    const second = await issue(payment.id, `it-ext-${randomUUID()}`);
    expect(second.applied.claimed).toBe(true);
    expect(second.applied.first_completion).toBe(false);
    expect(second.applied.issued).toBe(false);

    const rows = await vouchersFor(payment.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).toBe(hashVoucherCode(first.code));
  });

  it("concurrent issue attempts for one payment yield exactly one voucher", async () => {
    const payment = await seedVoucherPayment();
    // Different webhook ids AND different codes, fired together: the unique
    // payment_id index is the final backstop against any interleaving.
    const results = await Promise.all([
      issue(payment.id, `it-ext-${randomUUID()}`, generateVoucherCode()),
      issue(payment.id, `it-ext-${randomUUID()}`, generateVoucherCode()),
      issue(payment.id, `it-ext-${randomUUID()}`, generateVoucherCode()),
    ]);

    expect(results.filter((r) => r.applied.issued)).toHaveLength(1);
    const rows = await vouchersFor(payment.id);
    expect(rows).toHaveLength(1);
  });

  it("queues the buyer's email (and a gift copy) in the same transaction", async () => {
    const payment = await seedVoucherPayment({
      buyerEmail: "it-buyer@example.test",
      recipientEmail: "it-friend@example.test",
    });
    const { code } = await issue(
      payment.id,
      `it-ext-${randomUUID()}`,
      generateVoucherCode(),
      "it-friend@example.test",
    );

    // Scoped to the payment, not the whole table: another suite may have rows.
    const r = await pg.query(
      `select category, recipient, body, status
         from public.email_outbox
        where payment_id = $1
        order by category`,
      [payment.id],
    );
    const categories = r.rows.map((x: { category: string }) => x.category);
    expect(categories).toContain("voucher_issued_buyer");
    expect(categories).toContain("voucher_issued_recipient");

    const buyer = r.rows.find((x: { category: string }) => x.category === "voucher_issued_buyer");
    expect(buyer.recipient).toBe("it-buyer@example.test");
    // The code travels in the queued mail — that is why the outbox exists.
    expect(buyer.body).toContain(code);
    expect(buyer.status).toBe("pending");
    // Content locks: no private phone number, no invented prices.
    expect(buyer.body).not.toContain("0706559119");
    expect(buyer.body).not.toContain("2200");
  });

  it("sends one copy when the recipient is the buyer", async () => {
    const payment = await seedVoucherPayment({
      buyerEmail: "it-buyer@example.test",
      recipientEmail: "IT-BUYER@example.test", // same address, different case
    });
    await issue(payment.id, `it-ext-${randomUUID()}`);

    const r = await pg.query(
      `select category from public.email_outbox where payment_id = $1`,
      [payment.id],
    );
    const categories = r.rows.map((x: { category: string }) => x.category);
    expect(categories).toContain("voucher_issued_buyer");
    expect(categories).not.toContain("voucher_issued_recipient");
  });

  it("never stores the code in the clear, anywhere in the row", async () => {
    const payment = await seedVoucherPayment();
    const { code } = await issue(payment.id, `it-ext-${randomUUID()}`);
    const bare = code.replace(/-/g, "");

    const r = await pg.query("select * from public.vouchers where payment_id = $1", [
      payment.id,
    ]);
    const serialised = JSON.stringify(r.rows);
    expect(serialised).not.toContain(code);
    expect(serialised.toUpperCase()).not.toContain(bare);
    // But the digest does match — proof we hashed rather than dropped it.
    expect(serialised).toContain(hashVoucherCode(code));
  });

  it("finds a voucher by code, formatted or not, and rejects near-misses", async () => {
    const payment = await seedVoucherPayment();
    const { code } = await issue(payment.id, `it-ext-${randomUUID()}`);

    const found = await findVoucherByCode(code);
    expect(found?.code_hash).toBe(hashVoucherCode(code));
    expect((await findVoucherByCode(code.toLowerCase()))?.id).toBe(found?.id);
    expect((await findVoucherByCode(code.replace(/-/g, "")))?.id).toBe(found?.id);

    // A code that was never issued, and a mutation of a real one.
    expect(await findVoucherByCode(generateVoucherCode())).toBeNull();
    expect(
      await findVoucherByCode(`${code.slice(0, -1)}${code.endsWith("9") ? "8" : "9"}`),
    ).toBeNull();
    expect(await findVoucherByCode("garbage")).toBeNull();
  });

  it("redeems against a booking, and only once", async () => {
    const payment = await seedVoucherPayment();
    const { code } = await issue(payment.id, `it-ext-${randomUUID()}`);
    const booking = await seedBooking(randomUUID().slice(0, 8));

    const first = await redeemVoucherByCode(code, booking.id);
    expect(first.status).toBe("redeemed");
    expect(first.voucher?.redeemed_booking_id).toBe(booking.id);
    expect(first.voucher?.redeemed_at).not.toBeNull();

    // Same booking again is not a new redemption, and a different booking is
    // refused outright — a spent voucher cannot be re-pointed.
    const again = await redeemVoucherByCode(code, booking.id);
    expect(again.status).toBe("already_redeemed");
    const other = await seedBooking(randomUUID().slice(0, 8));
    const elsewhere = await redeemVoucherByCode(code, other.id);
    expect(elsewhere.status).toBe("already_redeemed");

    const rows = await vouchersFor(payment.id);
    expect(rows[0].status).toBe("redeemed");
    expect(rows[0].redeemed_booking_id).toBe(booking.id);
  });

  it("refuses an unknown code without saying whether the voucher exists", async () => {
    const outcome = await redeemVoucherByCode(generateVoucherCode(), randomUUID());
    expect(outcome.status).toBe("not_found");
  });

  it("voids an issued voucher, and refuses to void a redeemed one", async () => {
    const payment = await seedVoucherPayment();
    const { code } = await issue(payment.id, `it-ext-${randomUUID()}`);

    const voided = await voidVoucher((await findVoucherByCode(code))!.id, "duplicate purchase");
    expect(voided?.status).toBe("void");
    expect(voided?.void_reason).toBe("duplicate purchase");

    // A void voucher cannot be redeemed.
    expect((await redeemVoucherByCode(code, randomUUID())).status).toBe("void");

    // And one already redeemed cannot be voided away.
    const payment2 = await seedVoucherPayment();
    const second = await issue(payment2.id, `it-ext-${randomUUID()}`);
    const booking = await seedBooking(randomUUID().slice(0, 8));
    await redeemVoucherByCode(second.code, booking.id);
    expect(
      await voidVoucher((await findVoucherByCode(second.code))!.id, "too late"),
    ).toBeNull();
  });

  it("lists issued vouchers for the admin console", async () => {
    const payment = await seedVoucherPayment();
    const { code } = await issue(
      payment.id,
      `it-ext-${randomUUID()}`,
      generateVoucherCode(),
    );
    const voucherId = (await findVoucherByCode(code))!.id;

    // Scope to our own voucher: the listing is global (the admin console sees
    // everything), and other suites share this database.
    const rows = await listVouchers(200);
    const mine = rows.filter((r) => r.id === voucherId);
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe("issued");
    expect(mine[0].buyer_email).toBe("it-buyer@example.test");

    // The contract the admin UI depends on.
    for (const row of mine) {
      expect(["issued", "redeemed", "void"]).toContain(row.status);
      expect(row.code_hint).toHaveLength(4);
      // The listing itself must never leak a redeemable code.
      expect(JSON.stringify(row)).not.toContain(code);
    }
  });
});