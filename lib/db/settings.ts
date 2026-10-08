import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { DEFAULT_SETTINGS } from "@/lib/booking/pricing";
import type { Settings } from "@/lib/db/types";

export const settingsValueSchema = z.object({
  stay_prices: z
    .object({
      essential: z.object({ solo: z.number(), couple: z.number() }),
      master: z.object({ solo: z.number(), couple: z.number() }),
      buyout: z.object({
        base: z.number(),
        extraGuest: z.number(),
        maxGuests: z.number(),
      }),
    })
    .optional(),
  deposit_percent: z.number().min(1).max(100).optional(),
  ugx_rate: z.number().min(1).optional(),
  // Fixed voucher prices in USD. Empty = vouchers are not on sale. Capped at 12
  // entries so a fat-fingered paste cannot turn the page into a menu of 400
  // prices; each must be a sane whole amount (>= 1, at most 2 decimals).
  voucher_amounts_usd: z
    .array(
      z
        .number()
        .min(1, "Voucher amounts must be at least 1 USD")
        .max(100_000, "Voucher amounts must be at most 100,000 USD")
        .refine((n) => Number.isInteger(n * 100), "Use at most 2 decimal places"),
    )
    .max(12, "At most 12 voucher amounts")
    .optional(),
  // Days an "approved" booking is held while awaiting the deposit.
  hold_days: z.number().int().min(1).max(60).optional(),
});

type SettingsRows = { key: string; value: unknown }[];

function fromRows(rows: SettingsRows): Settings {
  const bag: Record<string, unknown> = {};
  for (const row of rows) bag[row.key] = row.value;
  const parsed = settingsValueSchema.safeParse(bag);
  if (!parsed.success) {
    // Owner-entered values that fail validation must not break the site:
    // fall back entirely to defaults and let admin surface the error later.
    return DEFAULT_SETTINGS;
  }
  const v = parsed.data;
  return {
    stayPrices: v.stay_prices ?? DEFAULT_SETTINGS.stayPrices,
    depositPercent: v.deposit_percent ?? DEFAULT_SETTINGS.depositPercent,
    ugxRate: v.ugx_rate ?? DEFAULT_SETTINGS.ugxRate,
    voucherAmountsUsd: v.voucher_amounts_usd ?? DEFAULT_SETTINGS.voucherAmountsUsd,
    holdDays: v.hold_days ?? DEFAULT_SETTINGS.holdDays,
  };
}

/**
 * Owner-editable settings from the database.
 * Falls back to DEFAULT_SETTINGS when the database is not configured or a
 * value is missing — the numbers are identical, so pricing never lies.
 */
export async function getSettings(): Promise<Settings> {
  try {
    const db = getDb();
    const { data, error } = await db.from("settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;
    return fromRows(data as SettingsRows);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Owner-save from /admin/settings — partial upsert, validated first. */
export async function saveSettings(
  input: z.infer<typeof settingsValueSchema>,
): Promise<void> {
  const parsed = settingsValueSchema.parse(input);
  const db = getDb();
  const rows: { key: string; value: unknown }[] = [];
  if (parsed.stay_prices) rows.push({ key: "stay_prices", value: parsed.stay_prices });
  if (parsed.deposit_percent !== undefined)
    rows.push({ key: "deposit_percent", value: parsed.deposit_percent });
  if (parsed.ugx_rate !== undefined)
    rows.push({ key: "ugx_rate", value: parsed.ugx_rate });
  if (parsed.voucher_amounts_usd !== undefined) {
    // Sorted + de-duplicated so the public page shows a clean, stable menu.
    const cleaned = [...new Set(parsed.voucher_amounts_usd)].sort((a, b) => a - b);
    rows.push({ key: "voucher_amounts_usd", value: cleaned });
  }
  if (parsed.hold_days !== undefined)
    rows.push({ key: "hold_days", value: parsed.hold_days });
  if (rows.length === 0) return;
  const { error } = await db.from("settings").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(`saveSettings failed: ${error.message}`);
}
