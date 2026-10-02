import { describe, expect, it } from "vitest";
import {
  assertAvailable,
  AvailabilityConflictError,
  blockedDayWithin,
  dayWithin,
  findConflict,
  isDateString,
  rangesOverlap,
} from "@/lib/booking/availability";

describe("rangesOverlap (half-open nights)", () => {
  it("flags sharing at least one night", () => {
    expect(rangesOverlap("2026-11-01", "2026-11-05", "2026-11-04", "2026-11-07")).toBe(true);
    expect(rangesOverlap("2026-11-01", "2026-11-05", "2026-11-02", "2026-11-03")).toBe(true);
    expect(rangesOverlap("2026-11-01", "2026-11-05", "2026-10-28", "2026-11-20")).toBe(true);
  });

  it("allows back-to-back stays (checkout day = next check-in)", () => {
    expect(rangesOverlap("2026-11-01", "2026-11-05", "2026-11-05", "2026-11-08")).toBe(false);
    expect(rangesOverlap("2026-11-05", "2026-11-08", "2026-11-01", "2026-11-05")).toBe(false);
  });

  it("allows fully separate ranges", () => {
    expect(rangesOverlap("2026-11-01", "2026-11-05", "2026-11-06", "2026-11-09")).toBe(false);
  });
});

describe("dayWithin / blockedDayWithin", () => {
  it("counts nights, not the checkout day", () => {
    expect(dayWithin("2026-11-01", "2026-11-01", "2026-11-05")).toBe(true);
    expect(dayWithin("2026-11-04", "2026-11-01", "2026-11-05")).toBe(true);
    expect(dayWithin("2026-11-05", "2026-11-01", "2026-11-05")).toBe(false);
  });

  it("finds a blocked day inside the window", () => {
    expect(
      blockedDayWithin(
        { check_in: "2026-11-01", check_out: "2026-11-05" },
        ["2026-10-30", "2026-11-03"],
      ),
    ).toBe("2026-11-03");
    expect(
      blockedDayWithin({ check_in: "2026-11-01", check_out: "2026-11-05" }, ["2026-11-05"]),
    ).toBeNull();
  });
});

describe("findConflict / assertAvailable", () => {
  const free = [
    { check_in: "2026-11-10", check_out: "2026-11-14" },
    { check_in: "2026-12-20", check_out: "2026-12-28" },
  ];

  it("returns null when free, the range when taken", () => {
    expect(
      findConflict({ check_in: "2026-11-01", check_out: "2026-11-05" }, free),
    ).toBeNull();
    const hit = findConflict({ check_in: "2026-11-13", check_out: "2026-11-16" }, free);
    expect(hit).toEqual({ check_in: "2026-11-10", check_out: "2026-11-14" });
  });

  it("accepts a free window", () => {
    expect(() =>
      assertAvailable({ check_in: "2026-11-01", check_out: "2026-11-05" }, free, []),
    ).not.toThrow();
  });

  it("rejects overlap with AvailabilityConflictError", () => {
    expect(() =>
      assertAvailable({ check_in: "2026-12-25", check_out: "2026-12-30" }, free, []),
    ).toThrow(AvailabilityConflictError);
  });

  it("rejects a blocked day and names it", () => {
    try {
      assertAvailable({ check_in: "2026-11-01", check_out: "2026-11-05" }, free, [
        "2026-11-02",
      ]);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AvailabilityConflictError);
      expect((err as AvailabilityConflictError).conflictingDay).toBe("2026-11-02");
    }
  });

  it("rejects malformed and reversed dates", () => {
    expect(() =>
      assertAvailable({ check_in: "nope", check_out: "2026-11-05" }, [], []),
    ).toThrow("YYYY-MM-DD");
    expect(() =>
      assertAvailable({ check_in: "2026-11-05", check_out: "2026-11-01" }, [], []),
    ).toThrow("Check-out must be after check-in");
  });
});

describe("isDateString", () => {
  it("accepts only YYYY-MM-DD", () => {
    expect(isDateString("2026-11-01")).toBe(true);
    expect(isDateString("2026-11-1")).toBe(false);
    expect(isDateString("01/11/2026")).toBe(false);
  });
});
