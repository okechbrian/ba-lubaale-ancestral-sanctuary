import { describe, expect, it } from "vitest";
import {
  balanceAmountUsd,
  DEFAULT_SETTINGS,
  depositAmountUsd,
  PricingError,
  stayAmountUsd,
  ugxAmount,
} from "@/lib/booking/pricing";

describe("stayAmountUsd (figures must match /immersions)", () => {
  it("essential: 2,200 solo / 3,600 couple", () => {
    expect(stayAmountUsd("essential", "solo")).toBe(2200);
    expect(stayAmountUsd("essential", "couple")).toBe(3600);
    expect(stayAmountUsd("essential", "family")).toBe(3600);
  });

  it("master: 4,500 solo / 7,200 couple", () => {
    expect(stayAmountUsd("master", "solo")).toBe(4500);
    expect(stayAmountUsd("master", "couple")).toBe(7200);
  });

  it("buyout: 10,000 up to 4, +1,500 per extra, max 8", () => {
    expect(stayAmountUsd("buyout", "buyout")).toBe(10000);
    expect(stayAmountUsd("buyout", "buyout", DEFAULT_SETTINGS, 5)).toBe(11500);
    expect(stayAmountUsd("buyout", "buyout", DEFAULT_SETTINGS, 8)).toBe(16000);
    expect(stayAmountUsd("buyout", "buyout", DEFAULT_SETTINGS, 12)).toBe(16000);
  });
});

describe("deposit / balance / UGX", () => {
  it("50% deposit per /policies, balance is the rest", () => {
    expect(depositAmountUsd(2200)).toBe(1100);
    expect(balanceAmountUsd(2200)).toBe(1100);
    expect(depositAmountUsd(4500)).toBe(2250);
    expect(balanceAmountUsd(4500)).toBe(2250);
    expect(depositAmountUsd(10000)).toBe(5000);
  });

  it("rounds half-up for odd totals", () => {
    expect(depositAmountUsd(2201)).toBe(1101); // 1100.5 -> 1101
  });

  it("converts to UGX at the owner-set rate", () => {
    expect(ugxAmount(2200)).toBe(2200 * 3900);
    expect(ugxAmount(1100)).toBe(1100 * 3900);
  });

  it("rejects a broken deposit percent", () => {
    const bad = { ...DEFAULT_SETTINGS, depositPercent: 0 };
    expect(() => depositAmountUsd(2200, bad)).toThrow(PricingError);
  });
});
