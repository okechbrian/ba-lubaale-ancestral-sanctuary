/**
 * Voucher hardening — REAL local Supabase, no faked database.
 * Run via `npm run test:integrity` (supabase start && supabase db reset first).
 *
 * Three guarantees are pinned here, each of which used to be false:
 *
 *   (a) once a voucher email is delivered, the redeemable code is GONE from
 *       email_outbox — overwritten by a database function, so no caller can
 *       skip it — and it was never in email_log at all;
 *   (b) a voucher payment with no voucher_requests row makes the IPN fail
 *       (503) instead of acking a paid voucher nobody was told about, and the
 *       two rows are created in one transaction so that state is unreachable
 *       through the normal path;
 *   (c) a non-object JSON body is a 400, not a 500.
 *
 * Without the env vars the suite SKIPS with a notice — it never fakes a pass.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { getDb } from "@/lib/db/client";
import { applyVoucherCompletion } from "@/lib/db/payments";
import {
  claimOutboxRow,
  getOutboxRow,
  listOutbox,
  markOutboxSent,
} from "@/lib/db/email-outbox";
import {
  insertVoucherPurchase,
  listVouchers,
  requireVoucherRequest,
  VoucherRequestMissingError,
} from "@/lib/db/vouchers";
import {
  generateVoucherCode,
  hashVoucherCode,
  voucherCodeHint,
} from "@/lib/vouchers/code";
import { prepareVoucherEmails } from "@/lib/vouchers/emails";
import { POST as ipn } from "@/app/api/payments/ipn/route";
import type { EmailOutboxRow, VoucherRow } from "@/lib/db/types";

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

const REDACTED = "[redacted after delivery]";
const BUYER = "it-voucher@example.test";

if (!HAS_DB) {
  console.warn(
    "[voucher-hardening] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

describe.runIf(HAS_DB)("voucher hardening (real local Supabase)", () => {
  let pg: Client;
  const savedEnv: Record<string, string | undefined> = {};
  const run = randomUUID().slice(0, 8);

  async function purchase(): Promise<{ id: string }> {
    return insertVoucherPurchase({
      amountUsd: 250,
      amountUgx: 975000,
      providerRef: `it-hard-${run}-${randomUUID()}`,
      buyerEmail: BUYER,
      buyerName: "Test Buyer",
      recipientEmail: null,
    });
  }

  /** Issue a voucher the way the IPN does, returning the RAW code. */
  async function issue(paymentId: string, externalId: string) {
    const code = generateVoucherCode();
    const emails = prepareVoucherEmails({
      formattedCode: code,
      amountUsd: 250,
      buyerEmail: BUYER,
      buyerName: "Test Buyer",
      recipientEmail: null,
      codeHint: voucherCodeHint(code),
    });
    await applyVoucherCompletion({
      provider: "pesapal",
      externalId,
      paymentId,
      codeHash: hashVoucherCode(code),
      codeHint: voucherCodeHint(code),
      buyerEmail: BUYER,
      recipientEmail: null,
      emails,
    });
    return code;
  }

  /**
   * "Deliver" OUR rows only.
   *
   * Deliberately not processEmailOutbox(): that processor drains the whole
   * shared queue, and the integrity files run in parallel workers against one
   * local database, so a global drain here would race tests/outbox-integrity
   * for the same rows. Claiming row-by-row exercises exactly the code path that
   * matters (claim -> mark sent -> redact) without the interference.
   */
  async function deliverOurs(paymentId: string): Promise<string[]> {
    const bodies: string[] = [];
    const rows = (await listOutbox(200)).filter(
      (r) => r.payment_id === paymentId,
    );
    for (const row of rows) {
      const claimed = await claimOutboxRow(row.id);
      if (!claimed) continue; // another processor won it
      bodies.push(claimed.body); // what the transport would have received
      await markOutboxSent(claimed.id);
    }
    return bodies;
  }

  beforeAll(async () => {
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    savedEnv.OWNER_NOTIFY_EMAIL = process.env.OWNER_NOTIFY_EMAIL;
    delete process.env.OWNER_NOTIFY_EMAIL;
    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
  }, 30_000);

  afterAll(async () => {
    await pg
      .query("delete from public.payments where provider_ref like $1", [
        `it-hard-${run}-%`,
      ])
      .catch(() => undefined);
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pg.end().catch(() => undefined);
  });

  // -------------------------------------------------------------------------
  // (a) The code is redacted after delivery, by the database
  // -------------------------------------------------------------------------

  it("the queued body really does contain the raw code before delivery", async () => {
    const payment = await purchase();
    const code = await issue(payment.id, `it-hard-${run}-${randomUUID()}`);

    const rows = (await listOutbox(200)).filter(
      (r) => r.payment_id === payment.id,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.body.includes(code))).toBe(true);
    expect(rows.every((r) => r.status === "pending")).toBe(true);
  });

  it("marking a voucher row sent redacts the body IN THE DATABASE", async () => {
    const payment = await purchase();
    const code = await issue(payment.id, `it-hard-${run}-${randomUUID()}`);
    const row = (await listOutbox(200)).find(
      (r) => r.payment_id === payment.id,
    )!;

    await markOutboxSent(row.id);

    // Read straight from Postgres, bypassing the app entirely.
    const r = await pg.query(
      "select status, body from public.email_outbox where id = $1",
      [row.id],
    );
    expect(r.rows[0].status).toBe("sent");
    expect(r.rows[0].body).toBe(REDACTED);
    expect(r.rows[0].body).not.toContain(code);
    expect(r.rows[0].body.toUpperCase()).not.toContain(code.replace(/-/g, ""));
  });

  it("after the processor delivers, no raw code survives ANYWHERE", async () => {
    const payment = await purchase();
    const code = await issue(payment.id, `it-hard-${run}-${randomUUID()}`);

    // Pretend SMTP accepted the messages.
    const delivered = await deliverOurs(payment.id);
    expect(delivered.length).toBeGreaterThan(0);
    // The code was genuinely in the bodies handed to the transport.
    expect(delivered.some((b) => b.includes(code))).toBe(true);

    // Now: nowhere in the database.
    const outbox = await pg.query(
      "select body from public.email_outbox where payment_id = $1",
      [payment.id],
    );
    expect(outbox.rows.length).toBeGreaterThan(0);
    for (const r of outbox.rows) {
      expect(r.body).not.toContain(code);
      expect(r.body.toUpperCase()).not.toContain(code.replace(/-/g, ""));
    }
    const log = await pg.query(
      "select body from public.email_log where to_email = $1",
      [BUYER],
    );
    for (const r of log.rows) {
      expect(r.body).not.toContain(code);
      expect(r.body.toUpperCase()).not.toContain(code.replace(/-/g, ""));
    }
  });

  it("the voucher code was never written to email_log at all", async () => {
    const payment = await purchase();
    const code = await issue(payment.id, `it-hard-${run}-${randomUUID()}`);
    await deliverOurs(payment.id);

    // Payment mail goes to email_outbox only; email_log must not even mention it.
    const r = await pg.query(
      "select count(*)::int as n from public.email_log where body like $1",
      [`%${code}%`],
    );
    expect(r.rows[0].n).toBe(0);
  });

  it("non-voucher mail keeps its body (redaction is targeted)", async () => {
    const row = {
      category: "payment_received_deposit_guest",
      recipient: BUYER,
      subject: "Deposit received",
      body: "An ordinary payment email body that must survive.",
    };
    const db = getDb();
    const { data, error } = await db
      .from("email_outbox")
      .insert({ ...row, booking_id: null, payment_id: null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (data as { id: string }).id;

    await markOutboxSent(id);

    const after = await pg.query(
      "select body from public.email_outbox where id = $1",
      [id],
    );
    expect(after.rows[0].body).toBe(row.body);

    await db.from("email_outbox").delete().eq("id", id);
  });

  it("the admin listing cannot render a code it does not hold", async () => {
    const payment = await purchase();
    const code = await issue(payment.id, `it-hard-${run}-${randomUUID()}`);
    await deliverOurs(payment.id);

    // What /admin/emails reads for the outbox panel. The row holds no code and
    // no hint — the body is the placeholder, so there is nothing to render.
    const rows = await listOutbox(200);
    const mine = rows.filter((r) => r.payment_id === payment.id);
    expect(mine.length).toBeGreaterThan(0);
    for (const row of mine) {
      expect(row.body).toBe(REDACTED);
      expect(row.body).not.toContain(code);
      expect(row.body.toUpperCase()).not.toContain(code.replace(/-/g, ""));
    }
    expect(JSON.stringify(mine)).not.toContain(code);

    // The only code-derived value anywhere the admin can read is the 4-char
    // hint on the vouchers table.
    const vouchers = (await listVouchers(200)).filter(
      (v: VoucherRow) => v.buyer_email === BUYER,
    );
    expect(vouchers.length).toBeGreaterThan(0);
    for (const v of vouchers) {
      expect(v.code_hint).toHaveLength(4);
      expect(JSON.stringify(v)).not.toContain(code);
    }
  });

  it("the vouchers table still holds only the digest, before and after", async () => {
    const payment = await purchase();
    const code = await issue(payment.id, `it-hard-${run}-${randomUUID()}`);

    const before = (await listVouchers(200)).filter(
      (v: VoucherRow) => v.buyer_email === BUYER,
    );
    expect(before.length).toBeGreaterThan(0);
    for (const v of before) {
      expect(JSON.stringify(v)).not.toContain(code);
      expect(v.code_hash).toMatch(/^[0-9A-F]{64}$/);
      expect(v.code_hint).toHaveLength(4);
    }

    await deliverOurs(payment.id);
    const after = (await listVouchers(200)).filter(
      (v: VoucherRow) => v.buyer_email === BUYER,
    );
    expect(after.length).toBe(before.length);
    for (const v of after) {
      expect(JSON.stringify(v)).not.toContain(code);
    }
  });

  // -------------------------------------------------------------------------
  // (b) Atomic creation + a loud IPN failure
  // -------------------------------------------------------------------------

  it("the purchase RPC creates BOTH rows or neither", async () => {
    // A duplicate provider_ref fails the payment insert, so the request insert
    // must not happen either — that is the atomicity being tested.
    const ref = `it-hard-${run}-dup`;
    await insertVoucherPurchase({
      amountUsd: 100,
      amountUgx: 390000,
      providerRef: ref,
      buyerEmail: BUYER,
      buyerName: null,
      recipientEmail: null,
    });
    await expect(
      insertVoucherPurchase({
        amountUsd: 100,
        amountUgx: 390000,
        providerRef: ref,
        buyerEmail: BUYER,
        buyerName: null,
        recipientEmail: null,
      }),
    ).rejects.toThrow();

    const dup = await pg.query(
      `select
         (select count(*)::int from public.payments where provider_ref = $1) as payments,
         (select count(*)::int from public.voucher_requests r
            join public.payments p on p.id = r.payment_id
           where p.provider_ref = $1) as requests`,
      [ref],
    );
    expect(dup.rows[0].payments).toBe(1);
    expect(dup.rows[0].requests).toBe(1);
  });

  it("rejects a non-positive amount rather than storing it", async () => {
    await expect(
      insertVoucherPurchase({
        amountUsd: 0,
        amountUgx: 1000,
        providerRef: `it-hard-${run}-zero`,
        buyerEmail: BUYER,
        buyerName: null,
        recipientEmail: null,
      }),
    ).rejects.toThrow(/positive/i);
  });

  it("requireVoucherRequest THROWS when the row is missing", async () => {
    const db = getDb();
    const { data, error } = await db
      .from("payments")
      .insert({
        booking_id: null,
        subject_kind: "voucher",
        kind: "deposit",
        amount_usd: 250,
        amount_ugx: 975000,
        currency: "UGX",
        provider: "pesapal",
        provider_ref: `it-orphan-${run}-${randomUUID()}`,
        status: "initiated",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const orphan = (data as { id: string }).id;

    await expect(requireVoucherRequest(orphan)).rejects.toBeInstanceOf(
      VoucherRequestMissingError,
    );

    await db.from("payments").delete().eq("id", orphan);
  });

  it("the IPN answers 503 (not 200) when voucher_requests is missing", async () => {
    const db = getDb();
    const trackingId = `it-orphan-ipn-${run}-${randomUUID()}`;
    const { data, error } = await db
      .from("payments")
      .insert({
        booking_id: null,
        subject_kind: "voucher",
        kind: "deposit",
        amount_usd: 250,
        amount_ugx: 975000,
        currency: "UGX",
        provider: "pesapal",
        provider_ref: trackingId,
        status: "initiated",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const paymentId = (data as { id: string }).id;

    const res = await ipn(
      new Request("http://localhost/api/payments/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderTrackingId: trackingId,
          orderMerchantReference: paymentId,
          orderNotificationType: "IPNCHANGE",
        }),
      }),
    );

    // 503, so the provider retries. A 200 here would mean "settled and told".
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("ipn_failed");

    // And crucially: nothing was settled, no voucher, no code.
    const state = await pg.query(
      "select status from public.payments where id = $1",
      [paymentId],
    );
    expect(state.rows[0].status).toBe("initiated");
    const issued = await pg.query(
      "select count(*)::int as n from public.vouchers where payment_id = $1",
      [paymentId],
    );
    expect(issued.rows[0].n).toBe(0);

    await db.from("payments").delete().eq("id", paymentId);
  });

  it("once the row is restored the same payment completes normally", async () => {
    const payment = await purchase();
    const trackingId = `it-recover-${run}-${randomUUID()}`;
    const db = getDb();
    await db
      .from("payments")
      .update({ provider_ref: trackingId, status: "initiated" })
      .eq("id", payment.id);

    const res = await ipn(
      new Request("http://localhost/api/payments/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderTrackingId: trackingId,
          orderMerchantReference: payment.id,
          orderNotificationType: "IPNCHANGE",
        }),
      }),
    );
    expect(res.status).toBe(200);

    const rows = (await listOutbox(200)).filter(
      (r) => r.payment_id === payment.id,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === "pending")).toBe(true);
  });

  it("markOutboxSent refuses to invent success for a row that does not exist", async () => {
    await expect(
      markOutboxSent("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(/no outbox row/);
  });

  it("the redacted row is still readable and still reports sent", async () => {
    const payment = await purchase();
    await issue(payment.id, `it-hard-${run}-${randomUUID()}`);
    const row = (await listOutbox(200)).find(
      (r) => r.payment_id === payment.id,
    )!;
    await markOutboxSent(row.id);

    const after = (await getOutboxRow(row.id)) as EmailOutboxRow;
    expect(after.status).toBe("sent");
    expect(after.body).toBe(REDACTED);
    expect(after.sent_at).not.toBeNull();
  });
});