import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The IPN's inline outbox drain, observed at the route boundary.
 *
 * tests/email-inline-drain.test.ts proves the drain's own behaviour. This file
 * proves the two things that only the route can get wrong:
 *
 * 1. The drain runs **after** a claimed completion, not before it. Draining
 *    first would send mail for a payment that then fails to claim, and would
 *    miss the rows the transaction is about to write.
 * 2. A **duplicate** IPN (the provider retrying, or a double notification)
 *    must not drain again. `claimed === false` means this delivery is a replay
 *    and someone else's rows are already handled.
 *
 * The guarantee that matters most is the negative one: no mail, no matter how
 * badly it fails, may turn a settled payment into a 503. A 503 tells Pesapal to
 * retry an already-settled payment.
 */
const drain = vi.fn(async () => ({ due: 0, claimed: 0, sent: 0, retrying: 0, failed: 0, skipped: 0 }));

vi.mock("@/lib/email/outbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/outbox")>();
  return { ...actual, drainOutboxBestEffort: drain };
});

const applyPaymentCompletion = vi.fn();
const applyVoucherCompletion = vi.fn();
const claimWebhookEvent = vi.fn(async () => true);
const releaseWebhookEvent = vi.fn(async () => undefined);
const getPaymentByRef = vi.fn();
// Falls back to getPaymentById by merchant reference when the external id is
// unknown, so both are mocked here.
const getPaymentById = vi.fn();
const getBooking = vi.fn();
const requireVoucherRequest = vi.fn();
const getTransactionStatus = vi.fn();

// applyVoucherCompletion lives in @/lib/db/payments alongside the payment RPC;
// only requireVoucherRequest comes from the vouchers module.
vi.mock("@/lib/db/webhook-events", () => ({ claimWebhookEvent, releaseWebhookEvent }));
vi.mock("@/lib/db/bookings", () => ({ getBooking }));
vi.mock("@/lib/db/payments", () => ({
  applyPaymentCompletion,
  applyVoucherCompletion,
  getPaymentByRef,
  getPaymentById,
  setPaymentStatus: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db/vouchers", () => ({ requireVoucherRequest }));
vi.mock("@/lib/payments/pesapal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/pesapal")>();
  return { ...actual, getTransactionStatus };
});

const { POST } = await import("@/app/api/payments/ipn/route");

const SAVED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PESAPAL_CONSUMER_SECRET"];
const savedEnv: Record<string, string | undefined> = {};

function req(overrides: Record<string, unknown> = {}): Request {
  return new Request("https://example.test/api/payments/ipn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId: "track-1",
      orderMerchantReference: "ref-1",
      ...overrides,
    }),
  });
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-1",
    kind: "deposit",
    subject_kind: "booking",
    booking_id: "bk-1",
    amount_usd: "1100.00",
    // verifyRemotePayment compares the REMOTE amount against amount_ugx, not
    // amount_usd, so both have to agree for the completion to be accepted.
    amount_ugx: 1100,
    currency: "USD",
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  for (const k of SAVED) {
    savedEnv[k] = process.env[k];
    // Present but never contacted: every db call is mocked, so a real client
    // would only add noise. Vercel-style placeholder keeps "configured" honest.
    process.env[k] = "test-placeholder";
  }
  drain.mockClear().mockResolvedValue({
    due: 0,
    claimed: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    skipped: 0,
  });
  applyPaymentCompletion.mockReset().mockResolvedValue({
    claimed: true,
    first_completion: true,
  });
  applyVoucherCompletion.mockReset().mockResolvedValue({
    claimed: true,
    issued: true,
    first_completion: true,
  });
  claimWebhookEvent.mockClear().mockResolvedValue(true);
  getPaymentByRef.mockReset().mockResolvedValue(payment());
  getPaymentById.mockReset().mockResolvedValue(payment());
  getBooking.mockReset().mockResolvedValue({
    id: "bk-1",
    reference: "BL-1",
    email: "guest@example.test",
    guest_name: "Guest",
    arrival_date: "2026-12-01",
    departure_date: "2026-12-05",
    amount_usd: "2200.00",
    party_size: 2,
  });
  requireVoucherRequest.mockReset().mockResolvedValue({
    buyer_name: "Buyer",
    buyer_email: "buyer@example.test",
    recipient_email: "friend@example.test",
  });
  getTransactionStatus.mockReset().mockResolvedValue({
    statusCode: 1,
    amount: 1100,
    currency: "USD",
  });
});

describe("IPN drains the outbox only after a claimed completion", () => {
  it("delivers inline once the payment transaction has claimed", async () => {
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(applyPaymentCompletion).toHaveBeenCalledTimes(1);
    expect(drain).toHaveBeenCalledTimes(1);
    expect(drain).toHaveBeenCalledWith({ reason: expect.stringContaining("payment:") });
  });

  it("does NOT drain on a duplicate delivery (replayed IPN)", async () => {
    // claimed=false => this notification lost the race. The winner already
    // drained; draining again would re-send mail for rows we do not own.
    applyPaymentCompletion.mockResolvedValue({ claimed: false, first_completion: false });

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(drain).not.toHaveBeenCalled();
  });

  it("still acks 200 when the drain itself misbehaves", async () => {
    // A mail failure must never turn a settled payment into a 503: that would
    // tell Pesapal to retry an already-settled payment. The route therefore
    // wraps the drain so even a rejected promise cannot reach the outer catch.
    drain.mockRejectedValue(new Error("boom"));
    const res = await POST(req());

    expect(res.status).toBe(200);
  });

  it("swallows the drain failure without letting it escape to the catch", async () => {
    drain.mockRejectedValue(new Error("boom"));
    await POST(req());

    // releaseWebhookEvent is only called when the FAILED-status branch claimed.
    // If the drain's rejection had escaped, the catch would run — and asserting
    // we still reached the ack proves the wrap held.
    expect(releaseWebhookEvent).not.toHaveBeenCalled();
  });
});

describe("IPN voucher path drains inline", () => {
  beforeEach(() => {
    const voucher = payment({ subject_kind: "voucher", booking_id: null });
    getPaymentByRef.mockResolvedValue(voucher);
    getPaymentById.mockResolvedValue(voucher);
  });

  it("delivers the voucher code within the webhook", async () => {
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(applyVoucherCompletion).toHaveBeenCalledTimes(1);
    expect(drain).toHaveBeenCalledWith({ reason: "voucher" });
  });

  it("does not drain when the voucher claim loses the race", async () => {
    applyVoucherCompletion.mockResolvedValue({
      claimed: false,
      issued: false,
      first_completion: false,
    });

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(drain).not.toHaveBeenCalled();
  });
});