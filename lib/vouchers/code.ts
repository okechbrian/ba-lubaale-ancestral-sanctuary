import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Voucher codes: 128 bits of CSPRNG output, stored only as a digest.
 *
 * - 16 random bytes = 128 bits. Nobody can enumerate or guess a code, and the
 *   site never derives codes from anything guessable (no sequence, no seed, no
 *   booking id).
 * - The redeemable value is stored as `SHA-256(code)` (`code_hash`). A database
 *   dump, a backup or a leaked `vouchers` table does not yield usable codes.
 * - Comparison of a presented code against a stored digest is constant-time.
 *
 * Presentation: 32 uppercase hex characters in eight groups of four
 * (`1A2B 3C4D …`). Hex keeps the alphabet unambiguous — no O/0, I/1, S/5 — so a
 * guest reading it off an email cannot mistype it into a wrong code.
 */

const CODE_BYTES = 16; // 128 bits
const CODE_HEX_LENGTH = CODE_BYTES * 2; // 32
const GROUP_SIZE = 4;

/** Fresh 128-bit code, formatted for humans. */
export function generateVoucherCode(): string {
  return formatVoucherCode(randomBytes(CODE_BYTES).toString("hex").toUpperCase());
}

/** Group a bare 32-char hex string as `XXXX-XXXX-…`. */
export function formatVoucherCode(hex: string): string {
  const groups: string[] = [];
  for (let i = 0; i < hex.length; i += GROUP_SIZE) {
    groups.push(hex.slice(i, i + GROUP_SIZE));
  }
  return groups.join("-");
}

/**
 * Accept what a human might paste: lowercase, missing or extra dashes, spaces,
 * or a copied line with surrounding text. Anything that is not exactly 32 hex
 * characters once cleaned is rejected — we never "guess" a code.
 */
export function normalizeVoucherCode(input: string): string | null {
  const cleaned = input.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (cleaned.length !== CODE_HEX_LENGTH) return null;
  return cleaned;
}

/** The stored form: uppercase SHA-256 hex of the bare (ungrouped) code. */
export function hashVoucherCode(code: string): string {
  const bare = normalizeVoucherCode(code);
  if (!bare) {
    throw new Error("Voucher code must be 32 hex characters.");
  }
  return createHash("sha256").update(bare, "utf8").digest("hex").toUpperCase();
}

/** Last four characters, for showing an owner which voucher this is. */
export function voucherCodeHint(code: string): string {
  const bare = normalizeVoucherCode(code);
  if (!bare) throw new Error("Voucher code must be 32 hex characters.");
  return bare.slice(-GROUP_SIZE);
}

/**
 * Constant-time equality. Length is compared first (lengths are not secret —
 * a digest is always 64 hex characters), then `timingSafeEqual` so no
 * comparison short-circuits and leaks how many leading characters matched.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** True when `code` hashes to `storedHash`, compared in constant time. */
export function codeMatchesHash(code: string, storedHash: string): boolean {
  const bare = normalizeVoucherCode(code);
  if (!bare) return false;
  return constantTimeEquals(hashVoucherCode(bare), storedHash.toUpperCase());
}