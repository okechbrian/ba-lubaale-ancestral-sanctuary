import { describe, expect, it } from "vitest";
import {
  bookingStatusAfterPayment,
  canCreateCheckout,
  paymentStatusFromRemote,
  verifyRemotePayment,
} from "@/lib/payments/state";

describe("paymentStatusFromRemote", () => {
  it("maps Pesapal status codes", () => {
    expect(paymentStatusFromRemote(1)).toBe("completed");
    expect(paymentStatusFromRemote(2)).toBe("failed");
    expect(paymentStatusFromRemote(3)).toBe("failed"); // REVERSED = money returned
    expect(paymentStatusFromRemote(0)).toBe("failed");
    expect(paymentStatusFromRemote(99)).toBeNull();
  });
});

describe("verifyRemotePayment", () => {
  const ours = { amount_ugx: 1_000_000, currency: "UGX" };

  it("accepts a matching COMPLETED status", () => {
    expect(verifyRemotePayment(ours, { statusCode: 1, currency: "UGX", amount: 1_000_000 })).toEqual({
      ok: true,
      status: "completed",
    });
  });

  it("accepts when the provider omits amount", () => {
    expect(verifyRemotePayment(ours, { statusCode: 1, currency: "UGX", amount: null })).toEqual({
      ok: true,
      status: "completed",
    });
  });

  it("rejects a currency mismatch", () => {
    expect(
      verifyRemotePayment(ours, { statusCode: 1, currency: "KES", amount: 1_000_000 }),
    ).toEqual({ ok: false, reason: "currency_mismatch" });
  });

  it("rejects an amount mismatch", () => {
    expect(
      verifyRemotePayment(ours, { statusCode: 1, currency: "UGX", amount: 999_999 }),
    ).toEqual({ ok: false, reason: "amount_mismatch" });
  });

  it("refuses unrecognized codes instead of guessing", () => {
    expect(verifyRemotePayment(ours, { statusCode: 42, currency: "UGX" })).toEqual({
      ok: false,
      reason: "unknown_code",
    });
  });

  it("handles bigint-style string amounts from PostgREST", () => {
    expect(
      verifyRemotePayment(
        { amount_ugx: "1000000", currency: "UGX" },
        { statusCode: 1, currency: "UGX", amount: "1000000" },
      ),
    ).toEqual({ ok: true, status: "completed" });
  });
});

describe("bookingStatusAfterPayment", () => {
  it("moves approved → paid on a completed deposit", () => {
    expect(bookingStatusAfterPayment("approved", "deposit", "completed")).toBe("paid");
  });

  it("keeps a paid booking paid on completed balance", () => {
    expect(bookingStatusAfterPayment("paid", "balance", "completed")).toBe("paid");
  });

  it("never resurrects pending or declined bookings", () => {
    expect(bookingStatusAfterPayment("pending", "deposit", "completed")).toBe("pending");
    expect(bookingStatusAfterPayment("declined", "deposit", "completed")).toBe("declined");
  });

  it("ignores failed payments", () => {
    expect(bookingStatusAfterPayment("approved", "deposit", "failed")).toBe("approved");
    expect(bookingStatusAfterPayment("approved", "deposit", "pending")).toBe("approved");
  });
});

describe("canCreateCheckout", () => {
  it("allows deposit for an approved booking with no payments", () => {
    expect(canCreateCheckout("approved", "deposit", [])).toBe(true);
  });

  it("allows deposit during the approve action (pending)", () => {
    expect(canCreateCheckout("pending", "deposit", [])).toBe(true);
  });

  it("blocks deposit once completed or when declined", () => {
    expect(
      canCreateCheckout("paid", "deposit", [{ kind: "deposit", status: "completed" }]),
    ).toBe(false);
    expect(canCreateCheckout("declined", "deposit", [])).toBe(false);
    expect(canCreateCheckout("pending", "balance", [])).toBe(false);
  });

  it("requires a completed deposit before balance", () => {
    expect(canCreateCheckout("approved", "balance", [])).toBe(false);
    expect(
      canCreateCheckout("approved", "balance", [
        { kind: "deposit", status: "completed" },
      ]),
    ).toBe(true);
  });

  it("blocks balance once completed", () => {
    expect(
      canCreateCheckout("paid", "balance", [
        { kind: "deposit", status: "completed" },
        { kind: "balance", status: "completed" },
      ]),
    ).toBe(false);
  });

  it("a failed attempt does not block a retry", () => {
    expect(
      canCreateCheckout("approved", "deposit", [{ kind: "deposit", status: "failed" }]),
    ).toBe(true);
  });
});
