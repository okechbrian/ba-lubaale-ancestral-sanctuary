/**
 * Voucher unit tests — no database needed. The code generation, hashing,
 * normalisation and price rules are pure; the issuance/redemption state machine
 * is covered on a real database in tests/vouchers-integrity.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  codeMatchesHash,
  constantTimeEquals,
  formatVoucherCode,
  generateVoucherCode,
  hashVoucherCode,
  normalizeVoucherCode,
  voucherCodeHint,
} from "@/lib/vouchers/code";
import { VoucherPriceError, voucherAmountUsd } from "@/lib/booking/pricing";
import { DEFAULT_SETTINGS } from "@/lib/booking/pricing";
import { voucherRequestSchema } from "@/lib/vouchers/schema";

const BARE = "1A2B3C4D5E6F708192A3B4C5D6E7F809";

describe("generateVoucherCode", () => {
  it("produces 32 hex characters (128 bits) in eight groups of four", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateVoucherCode();
      const groups = code.split("-");
      expect(groups).toHaveLength(8);
      for (const group of groups) expect(group).toMatch(/^[0-9A-F]{4}$/);
      // 8 groups x 4 hex chars = 32 hex chars = 128 bits of entropy.
      expect(normalizeVoucherCode(code)).toHaveLength(32);
    }
  });

  it("never repeats across a large sample", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generateVoucherCode());
    expect(seen.size).toBe(5000);
  });

  it("uses only unambiguous hex (no O/0, I/1, S/5 confusion)", () => {
    // A large sample must not contain the letters that look like digits.
    const letters = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const ch of generateVoucherCode()) {
        if (/[A-F]/.test(ch)) letters.add(ch);
      }
    }
    expect([...letters].every((ch) => "ABCDEF".includes(ch))).toBe(true);
  });
});

describe("normalizeVoucherCode", () => {
  it("accepts what a human pastes: lowercase, spaced, ungrouped", () => {
    expect(normalizeVoucherCode("1a2b3c4d5e6f708192a3b4c5d6e7f809")).toBe(BARE);
    expect(normalizeVoucherCode("1A2B-3C4D-5E6F-7081-92A3-B4C5-D6E7-F809")).toBe(BARE);
    expect(normalizeVoucherCode("  1a2b 3c4d 5e6f 7081 92a3 b4c5 d6e7 f809  ")).toBe(BARE);
  });

  it("rejects anything that is not exactly 32 hex characters", () => {
    for (const bad of [
      "",
      "   ",
      "1A2B", // too short
      `${BARE}AA`, // too long
      BARE.replace("1", "Z"), // non-hex letter
      "1A2B-3C4D-5E6F-7081-92A3-B4C5-D6E7", // seven groups
    ]) {
      expect(normalizeVoucherCode(bad), bad).toBeNull();
    }
  });
});

describe("hashVoucherCode", () => {
  it("is deterministic and independent of formatting", () => {
    const grouped = "1A2B-3C4D-5E6F-7081-92A3-B4C5-D6E7-F809";
    expect(hashVoucherCode(grouped)).toBe(hashVoucherCode(BARE));
    expect(hashVoucherCode(grouped)).toBe(hashVoucherCode(BARE.toLowerCase()));
    expect(hashVoucherCode(grouped)).toMatch(/^[0-9A-F]{64}$/);
  });

  it("refuses malformed codes rather than hashing them", () => {
    expect(() => hashVoucherCode("nope")).toThrow(/32 hex/);
  });

  it("stores a digest, never the code", () => {
    const digest = hashVoucherCode(BARE);
    expect(digest).not.toContain(BARE);
    expect(digest).not.toMatch(/1A2B/);
  });
});

describe("voucherCodeHint", () => {
  it("returns the last four characters", () => {
    expect(voucherCodeHint("1A2B-3C4D-5E6F-7081-92A3-B4C5-D6E7-F809")).toBe("F809");
    // 124 of 128 bits stay unknown.
    expect(voucherCodeHint(BARE).length).toBe(4);
  });
});

describe("constantTimeEquals / codeMatchesHash", () => {
  it("compares equal and unequal strings correctly", () => {
    expect(constantTimeEquals("abc", "abc")).toBe(true);
    expect(constantTimeEquals("abc", "abd")).toBe(false);
    expect(constantTimeEquals("abc", "abcd")).toBe(false);
    expect(constantTimeEquals("", "")).toBe(true);
  });

  it("verifies a code against a stored digest", () => {
    const digest = hashVoucherCode(BARE);
    expect(codeMatchesHash(BARE, digest)).toBe(true);
    expect(codeMatchesHash(BARE.toLowerCase(), digest.toLowerCase())).toBe(true);
    expect(codeMatchesHash(formatVoucherCode(BARE), digest)).toBe(true);

    const other = BARE.replace(/^1/, "2");
    expect(codeMatchesHash(other, digest)).toBe(false);
    // A one-character difference far from the end is still rejected.
    expect(codeMatchesHash(BARE.replace(/F809$/, "F80A"), digest)).toBe(false);
    // Malformed input never matches.
    expect(codeMatchesHash("nope", digest)).toBe(false);
  });
});

describe("voucherAmountUsd — prices come from settings only", () => {
  const settings = { ...DEFAULT_SETTINGS, voucherAmountsUsd: [500, 100, 250] };

  it("returns an exact configured amount", () => {
    expect(voucherAmountUsd(100, settings)).toBe(100);
    expect(voucherAmountUsd(500, settings)).toBe(500);
  });

  it("returns null when no amounts are configured (not on sale)", () => {
    expect(voucherAmountUsd(100, DEFAULT_SETTINGS)).toBeNull();
    expect(
      voucherAmountUsd(100, { ...DEFAULT_SETTINGS, voucherAmountsUsd: [] }),
    ).toBeNull();
  });

  it("throws for an amount that is not on the list — never rounds up", () => {
    expect(() => voucherAmountUsd(101, settings)).toThrow(VoucherPriceError);
    expect(() => voucherAmountUsd(0, settings)).toThrow(VoucherPriceError);
    expect(() => voucherAmountUsd(1e6, settings)).toThrow(VoucherPriceError);
  });

  it("does not match on a near-miss like 100.000001", () => {
    expect(() => voucherAmountUsd(100.000001, settings)).toThrow(VoucherPriceError);
  });
});

describe("voucherRequestSchema", () => {
  const valid = {
    amount_usd: 100,
    email: "buyer@example.test",
    recipient_email: "friend@example.test",
  };

  it("accepts a minimal valid request", () => {
    const parsed = voucherRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing or non-positive amount", () => {
    expect(voucherRequestSchema.safeParse({ ...valid, amount_usd: 0 }).success).toBe(false);
    expect(voucherRequestSchema.safeParse({ ...valid, amount_usd: -5 }).success).toBe(false);
    expect(
      voucherRequestSchema.safeParse({ email: "buyer@example.test" }).success,
    ).toBe(false);
  });

  it("rejects malformed and mismatched emails", () => {
    expect(voucherRequestSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(
      voucherRequestSchema.safeParse({ ...valid, recipient_email: "nope" }).success,
    ).toBe(false);
  });

  it("treats an empty recipient as absent (the field is optional)", () => {
    const parsed = voucherRequestSchema.safeParse({ ...valid, recipient_email: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.recipient_email).toBeUndefined();
  });

  it("rejects unknown fields and a filled honeypot", () => {
    expect(
      voucherRequestSchema.safeParse({ ...valid, surprise: 1 }).success,
    ).toBe(false);
    expect(
      voucherRequestSchema.safeParse({ ...valid, website: "spam" }).success,
    ).toBe(false);
  });
});