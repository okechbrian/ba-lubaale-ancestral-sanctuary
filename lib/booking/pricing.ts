import type { PartyType, Settings, StaySlug } from "@/lib/db/types";

/** Settings used until the database row exists — identical to the live site. */
export const DEFAULT_SETTINGS: Settings = {
  stayPrices: {
    essential: { solo: 2200, couple: 3600 },
    master: { solo: 4500, couple: 7200 },
    buyout: { base: 10000, extraGuest: 1500, maxGuests: 8 },
  },
  depositPercent: 50,
  ugxRate: 3900, // owner-confirmable in /admin/settings before go-live
  // Vouchers are off until the owner lists the amounts they want to sell. The
  // site must never invent a voucher price.
  voucherAmountsUsd: [],
  /** (b) Days an "approved" booking is held while awaiting the deposit. */
  holdDays: 3,
};

/** Voucher price lookup: only amounts the owner actually configured. */
export class VoucherPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoucherPriceError";
  }
}

/**
 * Resolve a requested voucher amount against the owner's list. Returns null
 * when vouchers are not on sale at all; throws when an amount is not one of the
 * configured ones (never "rounds up to the nearest" — that would invent a
 * price).
 */
export function voucherAmountUsd(
  amountUsd: number,
  settings: Settings = DEFAULT_SETTINGS,
): number | null {
  const offered = settings.voucherAmountsUsd ?? [];
  if (offered.length === 0) return null;
  const match = offered.find((amount) => amount === amountUsd);
  if (match === undefined) {
    throw new VoucherPriceError(
      "That voucher amount is not on sale. Choose one of the listed amounts.",
    );
  }
  return match;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

/** USD total for a stay + party, from owner-editable settings. */
export function stayAmountUsd(
  stay: StaySlug,
  party: PartyType,
  settings: Settings = DEFAULT_SETTINGS,
  guestCount?: number,
): number {
  const prices = settings.stayPrices;
  switch (stay) {
    case "essential":
    case "master": {
      const tier = prices[stay];
      if (party === "couple" || party === "family") return tier.couple;
      return tier.solo;
    }
    case "buyout": {
      if (guestCount && guestCount > 4) {
        const extra = Math.min(
          guestCount - 4,
          prices.buyout.maxGuests - 4,
        );
        return prices.buyout.base + extra * prices.buyout.extraGuest;
      }
      return prices.buyout.base;
    }
    default:
      throw new PricingError(`Unknown stay: ${stay}`);
  }
}

/** Deposit due at approval (whole USD, half-up like the policies page). */
export function depositAmountUsd(
  totalUsd: number,
  settings: Settings = DEFAULT_SETTINGS,
): number {
  const pct = settings.depositPercent;
  if (pct <= 0 || pct > 100) throw new PricingError(`Bad deposit %: ${pct}`);
  return Math.round((totalUsd * pct) / 100);
}

/** Balance remaining after the deposit. */
export function balanceAmountUsd(
  totalUsd: number,
  settings: Settings = DEFAULT_SETTINGS,
): number {
  return totalUsd - depositAmountUsd(totalUsd, settings);
}

/** Charge amount in UGX at the owner-set rate (Pesapal charges UGX). */
export function ugxAmount(amountUsd: number, settings: Settings = DEFAULT_SETTINGS): number {
  if (settings.ugxRate <= 0) throw new PricingError("Bad UGX rate");
  return Math.round(amountUsd * settings.ugxRate);
}
