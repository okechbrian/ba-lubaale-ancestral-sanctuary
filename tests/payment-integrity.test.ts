/**
 * Payment-integrity integration tests — REAL local Supabase (postgres +
 * PostgREST), no faked database. Run via `npm run test:integrity` which
 * exports TEST_SUPABASE_URL / TEST_DATABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY
 * from the running stack (`supabase start && supabase db reset` first).
 *
 * Without those env vars the suite SKIPS with a notice — it never fakes a pass.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { POST as bookingAction } from "@/app/api/admin/bookings/[id]/action/route";
import { SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { getDb } from "@/lib/db/client";
import {
  OverlappingBookingError,
  getBooking,
  updateBookingStatus,
} from "@/lib/db/bookings";
import { applyPaymentCompletion, getPaymentById } from "@/lib/db/payments";

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

if (!HAS_DB) {
  console.warn(
    "[payment-integrity] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

interface SeedBooking {
  tag: string;
  status: "pending" | "approved" | "declined" | "paid";
  check_in: string;
  check_out: string;
}

async function seedBooking(seed: SeedBooking): Promise<{ id: string }> {
  const db = getDb();
  const { data, error } = await db
    .from("bookings")
    .insert({
      name: `it-fix-${seed.tag}`,
      email: "it-fixtures@example.test",
      country: "Uganda",
      party: "couple",
      stay_slug: "essential",
      check_in: seed.check_in,
      check_out: seed.check_out,
      drawing: "integration test fixture",
      comfort: "integration test fixture",
      protocols: true,
      digital_sunset: true,
      burden: "integration test fixture",
      policies_ok: true,
      complementary_ok: true,
      status: seed.status,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedBooking failed: ${error.message}`);
  return data as { id: string };
}

async function seedPayment(bookingId: string, tag: string): Promise<{ id: string }> {
  const db = getDb();
  const { data, error } = await db
    .from("payments")
    .insert({
      booking_id: bookingId,
      kind: "deposit",
      amount_usd: 2200,
      amount_ugx: 8580000,
      provider: "pesapal",
      provider_ref: `it-${tag}`,
      status: "initiated",
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedPayment failed: ${error.message}`);
  return data as { id: string };
}

describe.runIf(HAS_DB)("payment integrity (real local Supabase)", () => {
  let pg: Client;

  async function claimCount(externalId: string): Promise<number> {
    const r = await pg.query(
      "select count(*)::int as n from public.webhook_events where provider = 'pesapal' and external_id = $1",
      [externalId],
    );
    return r.rows[0].n as number;
  }

  beforeAll(async () => {
    // Route order in lib/db/client reads env at call time — set ours first.
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    process.env.ADMIN_SESSION_SECRET = "unit-test-secret";
    // Config-only: the approve-route overlap check short-circuits BEFORE
    // createOrReuseCheckout, so these credentials are never sent anywhere.
    process.env.PESAPAL_ENV = "sandbox";
    process.env.PESAPAL_CONSUMER_KEY = "test-key-never-sent";
    process.env.PESAPAL_CONSUMER_SECRET = "test-secret-never-sent";
    process.env.PESAPAL_IPN_URL = "http://localhost/api/payments/ipn";

    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
    // Leftovers from a crashed run would trip the overlap constraint.
    await pg.query("delete from public.bookings where name like 'it-fix-%'");
    await pg.query("drop trigger if exists it_booking_fail on public.bookings");
    await pg.query("drop function if exists public.it_booking_fail()");
  }, 30_000);

  afterAll(async () => {
    await pg.query("drop trigger if exists it_booking_fail on public.bookings").catch(() => undefined);
    await pg.query("drop function if exists public.it_booking_fail()").catch(() => undefined);
    await pg.query("delete from public.bookings where name like 'it-fix-%'").catch(() => undefined);
    await pg.end().catch(() => undefined);
  });

  it("payment completes but booking update throws -> nothing commits; retry fully recovers", async () => {
    const uid = randomUUID();
    const booking = await seedBooking({
      tag: `atomic-${uid}`,
      status: "approved",
      check_in: "2027-06-01",
      check_out: "2027-06-05",
    });
    const payment = await seedPayment(booking.id, `atomic-${uid}`);

    // Fault injection: a BEFORE UPDATE trigger makes the booking step of the
    // atomic RPC throw — AFTER the payment update already executed inside the
    // same transaction. This is the classic "payment marked, booking stuck"
    // split that used to be possible with multi-statement applies.
    await pg.query(`
      create or replace function public.it_booking_fail() returns trigger
      language plpgsql as $fn$
      begin
        raise exception 'injected booking update failure';
      end;
      $fn$;
      create trigger it_booking_fail before update on public.bookings
        for each row when (new.id = '${booking.id}')
        execute function public.it_booking_fail();
    `);

    const args = {
      provider: "pesapal",
      externalId: `it-${uid}`,
      paymentId: payment.id,
      redactedPayload: { source: "integration-test" },
    };

    // (a) first attempt fails inside the booking step …
    await expect(applyPaymentCompletion(args)).rejects.toThrow(
      /injected booking update failure/,
    );

    // … and NOTHING was committed: payment still initiated, booking still
    // approved, idempotency claim gone — i.e. the IPN may honestly 503 and
    // the provider's retry can re-run the whole apply.
    const payAfterFail = await getPaymentById(payment.id);
    expect(payAfterFail?.status).toBe("initiated");
    expect(payAfterFail?.paid_at).toBeNull();
    expect((await getBooking(booking.id))?.status).toBe("approved");
    expect(await claimCount(`it-${uid}`)).toBe(0);

    // (b) the transient fault clears (as it would between provider retries) …
    await pg.query("drop trigger it_booking_fail on public.bookings");
    await pg.query("drop function public.it_booking_fail()");

    // … and the retry fully recovers: one transaction does claim + payment +
    // booking together.
    const applied = await applyPaymentCompletion(args);
    expect(applied).toMatchObject({
      claimed: true,
      first_completion: true,
      payment_status: "completed",
      booking_status: "paid",
    });

    const payDone = await getPaymentById(payment.id);
    expect(payDone?.status).toBe("completed");
    expect(payDone?.paid_at).toBeTruthy();
    expect((await getBooking(booking.id))?.status).toBe("paid");
    expect(await claimCount(`it-${uid}`)).toBe(1);

    // (c) a duplicate delivery is acknowledged and changes nothing.
    const dup = await applyPaymentCompletion(args);
    expect(dup.claimed).toBe(false);
    expect(await claimCount(`it-${uid}`)).toBe(1);
    expect((await getBooking(booking.id))?.status).toBe("paid");
  });

  it("two overlapping approvals -> the second fails (409 + constraint backstop)", async () => {
    const uid = randomUUID();
    const first = await seedBooking({
      tag: `overlap-a-${uid}`,
      status: "approved",
      check_in: "2027-07-10",
      check_out: "2027-07-15",
    });
    const second = await seedBooking({
      tag: `overlap-b-${uid}`,
      status: "pending",
      check_in: "2027-07-12",
      check_out: "2027-07-17", // overlaps [2027-07-10, 2027-07-15)
    });

    // (1) the approve endpoint refuses with a clear 409 — reached through the
    // real route, real admin session, real database. The Pesapal config env
    // only passes the configuration gate; the overlap check returns before
    // createOrReuseCheckout, so no provider request is made.
    const cookie = `${SESSION_COOKIE}=${encodeURIComponent(
      await createSessionToken("unit-test-secret"),
    )}`;
    const res = await bookingAction(
      new Request(`http://localhost/api/admin/bookings/${second.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ id: second.id }) },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("overlapping_booking");
    expect((await getBooking(second.id))?.status).toBe("pending"); // untouched

    // (2) race backstop: a direct approval — exactly what a second,
    // concurrent approve action issues — is refused by the EXCLUDE
    // constraint itself (bookings_no_overlap), mapped to the same error:
    await expect(
      updateBookingStatus(second.id, "approved", {
        amount_usd: 2200,
        approved_at: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(OverlappingBookingError);
    expect((await getBooking(second.id))?.status).toBe("pending");
    expect((await getBooking(first.id))?.status).toBe("approved");

    // (3) the constraint does not over-block: back-to-back stays are legal
    // (half-open [check_in, check_out) — checkout day is the next check-in):
    const third = await seedBooking({
      tag: `overlap-c-${uid}`,
      status: "pending",
      check_in: "2027-07-15",
      check_out: "2027-07-19",
    });
    const approved = await updateBookingStatus(third.id, "approved");
    expect(approved.status).toBe("approved");
  });
});
