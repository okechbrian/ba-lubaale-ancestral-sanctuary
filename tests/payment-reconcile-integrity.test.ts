/**
 * Payment reconciliation integration tests - REAL local Supabase (postgres +
 * PostgREST), no faked database. Run via `npm run test:integrity`.
 *
 * Only the PROVIDER is stubbed: `getTransactionStatus` returns whatever answer
 * the test scripted for a tracking id and records that it was asked. Everything
 * else - the cron route, the sweep, verification, the atomic completion RPC,
 * the webhook claim, the email outbox - runs unmodified.
 *
 * The point of the file is one invariant: a payment is completed ONLY when the
 * provider's own answer says COMPLETED for our currency and amount, by the same
 * atomic path as the IPN, exactly once, however the IPN and the sweep race.
 *
 * Without the env vars the suite SKIPS with a notice - it never fakes a pass.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { GET as cron } from "@/app/api/cron/payment-reconcile/route";
import { POST as ipn } from "@/app/api/payments/ipn/route";
import { POST as recheck } from "@/app/api/admin/payments/[id]/recheck/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { getDb } from "@/lib/db/client";
import { getBooking } from "@/lib/db/bookings";
import { getPaymentById } from "@/lib/db/payments";
import { insertVoucherPurchase } from "@/lib/db/vouchers";
import {
  RECONCILE_MAX_AGE_MS,
  STUCK_AFTER_MS,
  reconcileStuckPayments,
} from "@/lib/payments/reconcile";
import { PesapalApiError } from "@/lib/payments/pesapal";

type Answer = {
  statusCode: number;
  currency?: string | null;
  amount?: number | string | null;
};

// The scripted provider. Unknown tracking ids answer INVALID (0) - "nothing
// landed" - so a leftover row from some other suite is never settled by us.
const provider = vi.hoisted(() => ({
  answers: new Map<string, Answer | Error>(),
  calls: [] as string[],
}));

vi.mock("@/lib/payments/pesapal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/pesapal")>();
  return {
    ...actual,
    getTransactionStatus: vi.fn(async (trackingId: string) => {
      provider.calls.push(trackingId);
      const answer = provider.answers.get(trackingId);
      if (answer instanceof Error) throw answer;
      return answer ?? { statusCode: 0 };
    }),
  };
});

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

if (!HAS_DB) {
  console.warn(
    "[payment-reconcile-integrity] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

const EMAIL = "it-recon@example.test";
const CRON_SECRET = "it-recon-cron-secret";
const ADMIN_SECRET = "unit-test-secret";
const AMOUNT_UGX = 8_580_000;

describe.runIf(HAS_DB)("payment reconciliation (real local Supabase, stubbed provider)", () => {
  let pg: Client;
  const savedEnv: Record<string, string | undefined> = {};
  // 2030 is clear of the 2027-2029 windows other suites use; a 10-day stride
  // keeps this file's approved bookings apart (bookings_no_overlap).
  let window = 0;

  async function seedStay(opts: {
    ageMinutes: number;
    bookingStatus?: "approved" | "pending";
    paymentStatus?: "initiated" | "pending" | "failed" | "cancelled";
  }): Promise<{ bookingId: string; paymentId: string; ref: string }> {
    const db = getDb();
    const checkIn = new Date(Date.UTC(2030, 0, 1 + window * 10));
    const checkOut = new Date(checkIn.getTime() + 4 * 86_400_000);
    window += 1;
    const { data: booking, error: bErr } = await db
      .from("bookings")
      .insert({
        name: `it-recon-${randomUUID().slice(0, 8)}`,
        email: EMAIL,
        country: "Uganda",
        party: "couple",
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
        status: opts.bookingStatus ?? "approved",
      })
      .select("id")
      .single();
    if (bErr) throw new Error(`seed booking failed: ${bErr.message}`);

    const ref = `it-recon-${randomUUID()}`;
    const { data: pay, error: pErr } = await db
      .from("payments")
      .insert({
        booking_id: (booking as { id: string }).id,
        kind: "deposit",
        amount_usd: 2200,
        amount_ugx: AMOUNT_UGX,
        provider: "pesapal",
        provider_ref: ref,
        status: opts.paymentStatus ?? "initiated",
      })
      .select("id")
      .single();
    if (pErr) throw new Error(`seed payment failed: ${pErr.message}`);
    const paymentId = (pay as { id: string }).id;
    await age(paymentId, opts.ageMinutes);
    return { bookingId: (booking as { id: string }).id, paymentId, ref };
  }

  async function age(paymentId: string, minutes: number): Promise<void> {
    await pg.query(
      `update public.payments
          set created_at = now() - make_interval(mins => $2),
              updated_at = now() - make_interval(mins => $2)
        where id = $1`,
      [paymentId, minutes],
    );
  }

  const completed: Answer = {
    statusCode: 1,
    currency: "UGX",
    amount: AMOUNT_UGX,
  };

  async function claims(externalId: string): Promise<{ n: number; type: string | null }> {
    const r = await pg.query(
      `select count(*)::int as n, min(redacted_payload->>'type') as type
         from public.webhook_events
        where provider = 'pesapal' and external_id = $1`,
      [externalId],
    );
    return r.rows[0] as { n: number; type: string | null };
  }

  async function queuedFor(paymentId: string): Promise<string[]> {
    const r = await pg.query(
      "select category from public.email_outbox where payment_id = $1 order by category",
      [paymentId],
    );
    return r.rows.map((x: { category: string }) => x.category);
  }

  function cronRequest(limit = 100): Request {
    return new Request(`http://localhost/api/cron/payment-reconcile?limit=${limit}`, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
  }

  async function sweep(): Promise<{
    status: number;
    body: { items: { paymentId: string; result: string; detail?: string }[] };
  }> {
    const res = await cron(cronRequest());
    return { status: res.status, body: await res.json() };
  }

  function resultFor(
    body: { items: { paymentId: string; result: string }[] },
    paymentId: string,
  ): string | undefined {
    return body.items.find((i) => i.paymentId === paymentId)?.result;
  }

  async function adminRecheck(id: string): Promise<Response> {
    const cookie = `${SESSION_COOKIE}=${encodeURIComponent(
      await createSessionToken(ADMIN_SECRET),
    )}`;
    return recheck(
      new Request(`http://localhost/api/admin/payments/${id}/recheck`, {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  function ipnRequest(ref: string, merchantRef: string): Request {
    return new Request("http://localhost/api/payments/ipn", {
      method: "POST",
      body: JSON.stringify({
        orderTrackingId: ref,
        orderMerchantReference: merchantRef,
        orderNotificationType: "IPNCHANGE",
      }),
    });
  }

  beforeAll(async () => {
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    process.env.ADMIN_SESSION_SECRET = ADMIN_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    for (const k of ["SMTP_USER", "SMTP_PASS", "OWNER_NOTIFY_EMAIL"]) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
    await pg.query("delete from public.bookings where email = $1", [EMAIL]);
    await pg.query(
      "delete from public.webhook_events where external_id like 'it-recon-%' or external_id like 'failed:it-recon-%'",
    );
  }, 30_000);

  afterAll(async () => {
    await pg.query("delete from public.bookings where email = $1", [EMAIL]).catch(() => undefined);
    await pg
      .query(
        "delete from public.webhook_events where external_id like 'it-recon-%' or external_id like 'failed:it-recon-%'",
      )
      .catch(() => undefined);
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pg.end().catch(() => undefined);
  });

  beforeEach(() => {
    provider.answers.clear();
    provider.calls.length = 0;
  });

  it("settles a stuck payment ONLY because the provider verified it - atomically, like the IPN", async () => {
    const s = await seedStay({ ageMinutes: 120 });
    provider.answers.set(s.ref, completed);

    const { status, body } = await sweep();
    expect(status).toBe(200);
    expect(resultFor(body, s.paymentId)).toBe("settled");

    // The provider was asked, with our tracking id, before anything changed.
    expect(provider.calls).toContain(s.ref);

    const pay = await getPaymentById(s.paymentId);
    expect(pay?.status).toBe("completed");
    expect(pay?.paid_at).toBeTruthy();
    expect((await getBooking(s.bookingId))?.status).toBe("paid");

    // Same transaction as the IPN: claim + queued emails landed together.
    expect(await claims(s.ref)).toEqual({ n: 1, type: "RECONCILE:cron" });
    expect(await queuedFor(s.paymentId)).toEqual([
      "payment_received_deposit_guest",
      "prepare_guide_guest",
    ]);
  });

  it("NEVER marks paid without verification: every non-COMPLETED answer leaves the payment untouched", async () => {
    const cases: { label: string; answer: Answer | Error; expected: string }[] = [
      { label: "nothing landed yet (INVALID)", answer: { statusCode: 0 }, expected: "unresolved" },
      { label: "amount mismatch", answer: { statusCode: 1, currency: "UGX", amount: AMOUNT_UGX - 1 }, expected: "rejected" },
      { label: "currency mismatch", answer: { statusCode: 1, currency: "KES", amount: AMOUNT_UGX }, expected: "rejected" },
      { label: "unrecognised status code", answer: { statusCode: 42, currency: "UGX", amount: AMOUNT_UGX }, expected: "rejected" },
      { label: "provider unreachable", answer: new PesapalApiError("boom"), expected: "provider_unavailable" },
    ];

    for (const c of cases) {
      const s = await seedStay({ ageMinutes: 90 });
      provider.answers.set(s.ref, c.answer);
      const before = await getPaymentById(s.paymentId);

      const out = await reconcileStuckPayments({ limit: 100 });
      expect(out.items.find((i) => i.paymentId === s.paymentId)?.result, c.label).toBe(c.expected);

      const after = await getPaymentById(s.paymentId);
      expect(after?.status, c.label).toBe("initiated");
      expect(after?.paid_at, c.label).toBeNull();
      expect((await getBooking(s.bookingId))?.status, c.label).toBe("approved");
      expect(await claims(s.ref), c.label).toEqual({ n: 0, type: null });
      expect(await queuedFor(s.paymentId), c.label).toEqual([]);

      // "Nothing yet" is remembered (rotated to the back of the queue) so a
      // perpetually unresolved payment cannot starve the sweep.
      if (c.expected === "unresolved") {
        expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
          new Date(before!.updated_at).getTime(),
        );
      }
    }
  });

  it("only looks at initiated payments older than 30 min and younger than the max age", async () => {
    const fresh = await seedStay({ ageMinutes: STUCK_AFTER_MS / 60000 - 10 });
    const stale = await seedStay({ ageMinutes: STUCK_AFTER_MS / 60000 + 5 });
    const ancient = await seedStay({ ageMinutes: RECONCILE_MAX_AGE_MS / 60000 + 60 });
    const pending = await seedStay({ ageMinutes: 600, paymentStatus: "pending" });
    const done = await seedStay({ ageMinutes: 600, paymentStatus: "cancelled" });
    for (const s of [fresh, stale, ancient, pending, done]) {
      provider.answers.set(s.ref, completed);
    }

    const { body } = await sweep();
    expect(resultFor(body, stale.paymentId)).toBe("settled");
    for (const skipped of [fresh, ancient, pending, done]) {
      expect(provider.calls).not.toContain(skipped.ref);
      expect((await getPaymentById(skipped.paymentId))?.status).not.toBe("completed");
    }
  });

  it("is idempotent against the IPN: IPN first, then sweep; and a replayed sweep", async () => {
    const s = await seedStay({ ageMinutes: 120 });
    provider.answers.set(s.ref, completed);

    // The IPN lands first (late, but it lands).
    expect((await ipn(ipnRequest(s.ref, s.paymentId))).status).toBe(200);
    expect((await getPaymentById(s.paymentId))?.status).toBe("completed");

    // It is no longer stuck, so the sweep does not even ask the provider.
    provider.calls.length = 0;
    const { body } = await sweep();
    expect(resultFor(body, s.paymentId)).toBeUndefined();
    expect(provider.calls).not.toContain(s.ref);

    // Forcing the check anyway (admin Re-check) is a no-op, not a second apply.
    const res = await adminRecheck(s.paymentId);
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe("already_completed");

    expect(await claims(s.ref)).toMatchObject({ n: 1, type: "IPNCHANGE" });
    expect(await queuedFor(s.paymentId)).toHaveLength(2);
  });

  it("exactly-once under a race: the IPN and the sweep settle the same payment concurrently", async () => {
    const s = await seedStay({ ageMinutes: 120 });
    provider.answers.set(s.ref, completed);

    const [ipnRes, cronRes] = await Promise.all([
      ipn(ipnRequest(s.ref, s.paymentId)),
      cron(cronRequest()),
    ]);
    expect(ipnRes.status).toBe(200);
    expect(cronRes.status).toBe(200);

    expect((await getPaymentById(s.paymentId))?.status).toBe("completed");
    expect((await getBooking(s.bookingId))?.status).toBe("paid");
    // One claim, one set of emails - whichever side won.
    expect((await claims(s.ref)).n).toBe(1);
    expect(await queuedFor(s.paymentId)).toEqual([
      "payment_received_deposit_guest",
      "prepare_guide_guest",
    ]);
  });

  it("a FAILED verdict does not poison a later COMPLETED one (failed claim lives in its own key)", async () => {
    const s = await seedStay({ ageMinutes: 120 });

    // 1. Provider says FAILED: recorded as failed.
    provider.answers.set(s.ref, { statusCode: 2, currency: "UGX", amount: AMOUNT_UGX });
    const first = await sweep();
    expect(resultFor(first.body, s.paymentId)).toBe("failed");
    expect((await getPaymentById(s.paymentId))?.status).toBe("failed");
    expect((await claims(`failed:${s.ref}`)).n).toBe(1);
    expect((await claims(s.ref)).n).toBe(0); // the completion key is untouched

    // 2. The guest retried the same order and paid. Re-check settles it.
    provider.answers.set(s.ref, completed);
    const res = await adminRecheck(s.paymentId);
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe("settled");
    expect((await getPaymentById(s.paymentId))?.status).toBe("completed");
    expect((await getBooking(s.bookingId))?.status).toBe("paid");
    expect(await claims(s.ref)).toEqual({ n: 1, type: "RECONCILE:admin" });
  });

  it("an admin Re-check cannot complete a payment the provider does not confirm", async () => {
    const s = await seedStay({ ageMinutes: 120 });
    provider.answers.set(s.ref, { statusCode: 0 });

    const res = await adminRecheck(s.paymentId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.result).toBe("unresolved");
    expect((await getPaymentById(s.paymentId))?.status).toBe("initiated");

    provider.answers.set(s.ref, new PesapalApiError("down"));
    const down = await adminRecheck(s.paymentId);
    expect(down.status).toBe(503);
    expect((await down.json()).error).toBe("provider_unavailable");
    expect((await getPaymentById(s.paymentId))?.status).toBe("initiated");
  });

  it("admin Re-check route: guarded, validated, and refuses payments with nothing to ask about", async () => {
    // No session.
    const anon = await recheck(
      new Request("http://localhost/api/admin/payments/x/recheck", { method: "POST" }),
      { params: Promise.resolve({ id: randomUUID() }) },
    );
    expect(anon.status).toBe(401);

    expect((await adminRecheck("not-a-uuid")).status).toBe(400);
    expect((await adminRecheck(randomUUID())).status).toBe(404);

    // `pending` = never sent to the provider: there is no tracking id to ask.
    const pending = await seedStay({ ageMinutes: 600, paymentStatus: "pending" });
    const res = await adminRecheck(pending.paymentId);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("not_recheckable");
    expect(provider.calls).not.toContain(pending.ref);
  });

  it("a leftover completion claim that blocks a genuine payment is surfaced, never papered over", async () => {
    const s = await seedStay({ ageMinutes: 120 });
    // The old IPN recorded failures under the bare tracking id.
    await pg.query(
      "insert into public.webhook_events (provider, external_id, processed) values ('pesapal', $1, true)",
      [s.ref],
    );
    provider.answers.set(s.ref, completed);

    const { body } = await sweep();
    expect(resultFor(body, s.paymentId)).toBe("blocked");
    // Not completed, not faked: it stays visible on /admin/payments.
    expect((await getPaymentById(s.paymentId))?.status).toBe("initiated");
    expect((await getBooking(s.bookingId))?.status).toBe("approved");
  });

  it("settles a stuck gift-voucher payment through the same path: one code, one set of emails", async () => {
    const ref = `it-recon-voucher-${randomUUID()}`;
    const { id } = await insertVoucherPurchase({
      amountUsd: 250,
      amountUgx: 975_000,
      providerRef: ref,
      buyerEmail: EMAIL,
      buyerName: "Recon Buyer",
      recipientEmail: null,
    });
    await pg.query("update public.payments set status = 'initiated' where id = $1", [id]);
    await age(id, 180);
    provider.answers.set(ref, { statusCode: 1, currency: "UGX", amount: 975_000 });

    const { body } = await sweep();
    expect(resultFor(body, id)).toBe("settled");

    const vouchers = await pg.query(
      "select count(*)::int as n from public.vouchers where payment_id = $1",
      [id],
    );
    expect(vouchers.rows[0].n).toBe(1);

    // A second sweep and an IPN replay mint nothing more.
    await sweep();
    expect((await ipn(ipnRequest(ref, id))).status).toBe(200);
    const again = await pg.query(
      "select count(*)::int as n from public.vouchers where payment_id = $1",
      [id],
    );
    expect(again.rows[0].n).toBe(1);
    expect(await claims(ref)).toMatchObject({ n: 1, type: "RECONCILE:cron" });
  });

  it("a sweep whose cutoff catches nothing never contacts the provider", async () => {
    const out = await reconcileStuckPayments({
      now: new Date(Date.now() - 400 * 86_400_000), // a year back: nothing is idle that long
      limit: 100,
    });
    expect(out.checked).toBe(0);
    expect(provider.calls).toEqual([]);
  });
});
