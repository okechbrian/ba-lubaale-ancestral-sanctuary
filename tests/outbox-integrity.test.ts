/**
 * Email-outbox integration tests — REAL local Supabase (Postgres + PostgREST),
 * no faked database. Run via `npm run test:integrity`, which exports
 * TEST_SUPABASE_URL / TEST_DATABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY from
 * the running stack (`supabase start && supabase db reset` first).
 *
 * The centrepiece is the failure mode the outbox exists for: **the payment
 * commits and then the sender dies.** The old code sent email after the commit,
 * so a crash in that window left a paid guest with no email and no trace. Here
 * the RPC commits, the test pretends the process was killed before any delivery
 * (nothing is sent), and the processor is then run against the real queue.
 *
 * Only the SMTP transport is injected — every database interaction (the RPC, the
 * claim compare-and-set, backoff bookkeeping, the unique constraint) is real.
 *
 * Without those env vars the suite SKIPS with a notice — it never fakes a pass.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { getDb } from "@/lib/db/client";
import { applyPaymentCompletion } from "@/lib/db/payments";
import { listOutbox, requeueOutboxRow } from "@/lib/db/email-outbox";
import {
  OUTBOX_MAX_ATTEMPTS,
  processEmailOutbox,
  type OutboxSender,
} from "@/lib/email/outbox";
import type { EmailOutboxRow } from "@/lib/db/types";

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

if (!HAS_DB) {
  console.warn(
    "[outbox-integrity] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

/** A transport that records every delivery attempt it is asked to make. */
function recordingSender(
  behaviour: "deliver" | "fail" = "deliver",
): OutboxSender & { calls: EmailOutboxRow[] } {
  const calls: EmailOutboxRow[] = [];
  const sender = async (row: EmailOutboxRow) => {
    calls.push(row);
    return behaviour === "deliver"
      ? { delivered: true }
      : { delivered: false, error: "smtp_connection_refused" };
  };
  return Object.assign(sender, { calls });
}

describe.runIf(HAS_DB)("email outbox (real local Supabase)", () => {
  let pg: Client;
  const savedEnv: Record<string, string | undefined> = {};

  // Approved bookings may never overlap (bookings_no_overlap), so each fixture
  // gets its own window. Day 0 of 2028 is far from the other suites' 2027 dates.
  let windowOffsetDays = 0;

  async function seedBooking(tag: string): Promise<{ id: string }> {
    const db = getDb();
    const checkIn = new Date(Date.UTC(2028, 0, 1 + windowOffsetDays * 10));
    const checkOut = new Date(checkIn.getTime() + 4 * 86_400_000);
    windowOffsetDays += 1;
    const { data, error } = await db
      .from("bookings")
      .insert({
        name: `it-outbox-${tag}`,
        email: "it-outbox@example.test",
        country: "Uganda",
        party: "couple",
        stay_slug: "essential",
        check_in: checkIn.toISOString().slice(0, 10),
        check_out: checkOut.toISOString().slice(0, 10),
        drawing: "integration test fixture",
        comfort: "integration test fixture",
        protocols: true,
        digital_sunset: true,
        burden: "integration test fixture",
        policies_ok: true,
        complementary_ok: true,
        status: "approved",
      })
      .select("id")
      .single();
    if (error) throw new Error(`seedBooking failed: ${error.message}`);
    return data as { id: string };
  }

  async function seedPayment(
    bookingId: string,
    tag: string,
  ): Promise<{ id: string }> {
    const db = getDb();
    const { data, error } = await db
      .from("payments")
      .insert({
        booking_id: bookingId,
        kind: "deposit",
        amount_usd: 1100,
        amount_ugx: 4290000,
        provider: "pesapal",
        provider_ref: `it-outbox-${tag}`,
        status: "initiated",
      })
      .select("id")
      .single();
    if (error) throw new Error(`seedPayment failed: ${error.message}`);
    return data as { id: string };
  }

  const emails = (tag: string) => [
    {
      category: `payment_received_deposit_guest_${tag}`,
      to: "it-outbox@example.test",
      subject: `Deposit received ${tag}`,
      body: "Your stay is confirmed.",
    },
    {
      category: `prepare_guide_guest_${tag}`,
      to: "it-outbox@example.test",
      subject: `How to prepare ${tag}`,
      body: "Digital Sunset. /prepare",
    },
  ];

  async function outboxFor(paymentId: string): Promise<EmailOutboxRow[]> {
    const db = getDb();
    const { data, error } = await db
      .from("email_outbox")
      .select("*")
      .eq("payment_id", paymentId)
      .order("category", { ascending: true });
    if (error) throw new Error(`outboxFor failed: ${error.message}`);
    return (data ?? []) as EmailOutboxRow[];
  }

  beforeAll(async () => {
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    // No SMTP in this run: the processor must never touch a real transport.
    for (const k of ["SMTP_USER", "SMTP_PASS"]) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
  }, 30_000);

  // The queue is shared state (which is the point), so each test starts from
  // an empty one instead of inheriting rows the previous test left queued.
  beforeEach(async () => {
    await pg.query("delete from public.bookings where name like 'it-outbox-%'");
  });

  afterAll(async () => {
    await pg
      .query("delete from public.bookings where name like 'it-outbox-%'")
      .catch(() => undefined);
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pg.end().catch(() => undefined);
  });

  it("queues the emails INSIDE the payment transaction (one row per category)", async () => {
    const tag = randomUUID();
    const booking = await seedBooking(`queue-${tag}`);
    const payment = await seedPayment(booking.id, `queue-${tag}`);

    const applied = await applyPaymentCompletion({
      provider: "pesapal",
      externalId: `it-outbox-queue-${tag}`,
      paymentId: payment.id,
      emails: emails(tag),
    });

    expect(applied.claimed).toBe(true);
    expect(applied.first_completion).toBe(true);
    expect(applied.emails_queued).toBe(2);

    const rows = await outboxFor(payment.id);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.category).sort()).toEqual([
      `payment_received_deposit_guest_${tag}`,
      `prepare_guide_guest_${tag}`,
    ]);
    // Queued, not sent: the row is the durable promise, delivery is separate.
    for (const row of rows) {
      expect(row.status).toBe("pending");
      expect(row.attempts).toBe(0);
      expect(row.sent_at).toBeNull();
      expect(row.booking_id).toBe(booking.id);
    }
  });

  it("rolls the queued emails back with the payment (no orphan promises)", async () => {
    const tag = randomUUID();
    const booking = await seedBooking(`rollback-${tag}`);
    const payment = await seedPayment(booking.id, `rollback-${tag}`);

    // Fault injection: a BEFORE UPDATE trigger makes the booking step of the
    // atomic RPC throw, AFTER the payment update and the email insert would
    // have run. Everything must roll back — including the outbox rows.
    await pg.query(`
      create or replace function public.it_outbox_fail() returns trigger
      language plpgsql as $$ begin raise exception 'boom'; end; $$;`);
    await pg.query(`
      create trigger it_outbox_boom before update on public.bookings
      for each row execute function public.it_outbox_fail();`);

    try {
      await expect(
        applyPaymentCompletion({
          provider: "pesapal",
          externalId: `it-outbox-rollback-${tag}`,
          paymentId: payment.id,
          emails: emails(tag),
        }),
      ).rejects.toThrow();

      expect(await outboxFor(payment.id)).toHaveLength(0);
      const r = await pg.query(
        "select status from public.payments where id = $1",
        [payment.id],
      );
      expect(r.rows[0].status).toBe("initiated"); // untouched
    } finally {
      await pg.query("drop trigger if exists it_outbox_boom on public.bookings");
      await pg.query("drop function if exists public.it_outbox_fail()");
    }
  });

  it("survives the sender dying after commit: exactly one delivery", async () => {
    const tag = randomUUID();
    const booking = await seedBooking(`crash-${tag}`);
    const payment = await seedPayment(booking.id, `crash-${tag}`);

    // The payment settles and the emails are queued... and then the process is
    // "killed": nothing has been delivered, and no code ran after the commit.
    const applied = await applyPaymentCompletion({
      provider: "pesapal",
      externalId: `it-outbox-crash-${tag}`,
      paymentId: payment.id,
      emails: emails(tag),
    });
    expect(applied.emails_queued).toBe(2);

    const queued = await outboxFor(payment.id);
    expect(queued.every((r) => r.status === "pending")).toBe(true);
    expect(queued.every((r) => r.attempts === 0)).toBe(true);

    // The processor runs later (a cron tick) and delivers what was promised.
    const sender = recordingSender();
    const summary = await processEmailOutbox({ sender, limit: 100 });

    expect(summary.sent).toBe(2);
    expect(sender.calls).toHaveLength(2);
    expect(sender.calls.map((c) => c.recipient)).toEqual([
      "it-outbox@example.test",
      "it-outbox@example.test",
    ]);

    const delivered = await outboxFor(payment.id);
    for (const row of delivered) {
      expect(row.status).toBe("sent");
      expect(row.attempts).toBe(1); // exactly one attempt, not a retry storm
      expect(row.sent_at).not.toBeNull();
      expect(row.last_error).toBeNull();
    }

    // Running the processor again must deliver nothing: the rows are no longer
    // pending, so a settled payment can never produce a second email.
    const again = recordingSender();
    const second = await processEmailOutbox({ sender: again, limit: 100 });
    expect(second.claimed).toBe(0);
    expect(again.calls).toHaveLength(0);
  });

  it("retries with backoff after a transport failure, then delivers", async () => {
    const tag = randomUUID();
    const booking = await seedBooking(`retry-${tag}`);
    const payment = await seedPayment(booking.id, `retry-${tag}`);
    await applyPaymentCompletion({
      provider: "pesapal",
      externalId: `it-outbox-retry-${tag}`,
      paymentId: payment.id,
      emails: emails(tag).slice(0, 1), // one row keeps the assertions crisp
    });

    // Attempt 1 fails.
    const failing = recordingSender("fail");
    const first = await processEmailOutbox({ sender: failing, limit: 100 });
    expect(first.retrying).toBe(1);

    let row = (await outboxFor(payment.id))[0];
    expect(row.status).toBe("pending"); // still queued for another try
    expect(row.attempts).toBe(1);
    expect(row.last_error).toBe("smtp_connection_refused");
    const backoffUntil = new Date(row.next_attempt_at).getTime();
    expect(backoffUntil).toBeGreaterThan(Date.now() + 60_000); // >= ~2 minutes

    // Attempt 2 is not due yet — a run inside the backoff window does nothing.
    const tooSoon = recordingSender();
    const skipped = await processEmailOutbox({ sender: tooSoon, limit: 100 });
    expect(skipped.claimed).toBe(0);
    expect(tooSoon.calls).toHaveLength(0);

    // Once the backoff has elapsed the row is delivered.
    const db = getDb();
    await db
      .from("email_outbox")
      .update({ next_attempt_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", row.id);

    const working = recordingSender();
    const second = await processEmailOutbox({ sender: working, limit: 100 });
    expect(second.sent).toBe(1);

    row = (await outboxFor(payment.id))[0];
    expect(row.status).toBe("sent");
    expect(row.attempts).toBe(2);
    expect(row.last_error).toBeNull();
  });

  it("parks a row as failed after the attempt budget, and Resend recovers it", async () => {
    const tag = randomUUID();
    const booking = await seedBooking(`park-${tag}`);
    const payment = await seedPayment(booking.id, `park-${tag}`);
    await applyPaymentCompletion({
      provider: "pesapal",
      externalId: `it-outbox-park-${tag}`,
      paymentId: payment.id,
      emails: emails(tag).slice(0, 1),
    });

    const id = (await outboxFor(payment.id))[0].id;

    // Burn the whole budget, making each row due immediately.
    const db = getDb();
    for (let i = 0; i < OUTBOX_MAX_ATTEMPTS; i++) {
      await db
        .from("email_outbox")
        .update({ next_attempt_at: new Date(Date.now() - 1000).toISOString() })
        .eq("id", id);
      const run = await processEmailOutbox({
        sender: recordingSender("fail"),
        limit: 100,
      });
      expect(run.failed + run.retrying).toBe(1);
    }

    let row = (await outboxFor(payment.id))[0];
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(OUTBOX_MAX_ATTEMPTS);
    expect(row.last_error).toBe("smtp_connection_refused");

    // A parked row is not picked up again on its own — no send, ever again,
    // until a human resends it.
    const idle = recordingSender();
    const idleRun = await processEmailOutbox({ sender: idle, limit: 100 });
    expect(idleRun.claimed).toBe(0);
    expect(idleRun.sent).toBe(0);
    expect(idle.calls).toHaveLength(0);
    expect((await outboxFor(payment.id))[0].status).toBe("failed");

    // The owner's Resend button requeues it and delivers inline.
    const requeued = await requeueOutboxRow(id);
    expect(requeued?.status).toBe("pending");
    expect(requeued?.attempts).toBe(0);
    expect(requeued?.resends).toBe(1);

    const working = recordingSender();
    const resend = await processEmailOutbox({ sender: working, limit: 100 });
    expect(resend.sent).toBe(1);

    row = (await outboxFor(payment.id))[0];
    expect(row.status).toBe("sent");
    expect(row.resends).toBe(1);

    // An already-delivered row is not resendable — the database refuses.
    expect(await requeueOutboxRow(id)).toBeNull();
  });

  it("never queues twice for one payment, even across a replayed webhook", async () => {
    const tag = randomUUID();
    const booking = await seedBooking(`replay-${tag}`);
    const payment = await seedPayment(booking.id, `replay-${tag}`);
    const externalId = `it-outbox-replay-${tag}`;

    const first = await applyPaymentCompletion({
      provider: "pesapal",
      externalId,
      paymentId: payment.id,
      emails: emails(tag),
    });
    expect(first.emails_queued).toBe(2);

    // Pesapal retries the same IPN: the claim is refused, so nothing is queued
    // a second time (the unique (payment_id, category) index backs this up).
    const replay = await applyPaymentCompletion({
      provider: "pesapal",
      externalId,
      paymentId: payment.id,
      emails: emails(tag),
    });
    expect(replay.claimed).toBe(false);
    expect(replay.emails_queued).toBe(0);

    expect(await outboxFor(payment.id)).toHaveLength(2);
  });

  it("lists the queue newest-first for the admin console", async () => {
    // Seed one row so the assertion is about the listing contract, not about
    // whatever an earlier test happened to leave behind.
    const tag = randomUUID();
    const booking = await seedBooking(`list-${tag}`);
    const payment = await seedPayment(booking.id, `list-${tag}`);
    await applyPaymentCompletion({
      provider: "pesapal",
      externalId: `it-outbox-list-${tag}`,
      paymentId: payment.id,
      emails: emails(tag).slice(0, 1),
    });

    const rows = await listOutbox(5);
    expect(rows.length).toBeGreaterThan(0);
    // Newest first — the owner's most recent events are what they need to see.
    const timestamps = rows.map((r) => new Date(r.created_at).getTime());
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
    // Every row the admin can see carries what the UI needs to be honest.
    for (const row of rows) {
      expect(["pending", "sent", "failed"]).toContain(row.status);
      expect(row.recipient).toBeTruthy();
      expect(typeof row.attempts).toBe("number");
    }
  });
});