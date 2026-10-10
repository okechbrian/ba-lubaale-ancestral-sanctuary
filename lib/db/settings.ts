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

/** One key's stored value could not be used. */
export type SettingsProblem = {
  key: string;
  message: string;
};

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
 * Per-key resolution, reporting which stored keys could not be used.
 *
 * The old `fromRows` bailed out to ALL defaults when any single key failed
 * validation, so one bad `ugx_rate` silently reset the stay prices too. Each
 * key is now validated on its own: a good key is kept, a bad one falls back to
 * its own default and is named in the returned problems, so /admin/settings can
 * say exactly which number is wrong instead of showing a wall of defaults.
 */
function perKey(
  rows: SettingsRows,
): { settings: Settings; problems: SettingsProblem[] } {
  const bag: Record<string, unknown> = {};
  for (const row of rows) bag[row.key] = row.value;
  const problems: SettingsProblem[] = [];
  const pick = <K extends keyof z.infer<typeof settingsValueSchema>>(
    key: K,
    fallback: NonNullable<z.infer<typeof settingsValueSchema>[K]>,
  ): NonNullable<z.infer<typeof settingsValueSchema>[K]> => {
    const raw = bag[key];
    if (raw === undefined || raw === null) return fallback;
    // Validate this one key by parsing a bag that contains only it.
    const single = settingsValueSchema.safeParse({ [key]: raw });
    if (!single.success) {
      problems.push({
        key,
        message: single.error.issues[0]?.message ?? "stored value is not valid",
      });
      return fallback;
    }
    const value = single.data[key];
    return (value === undefined ? fallback : value) as NonNullable<
      z.infer<typeof settingsValueSchema>[K]
    >;
  };

  const stayPrices = pick(
    "stay_prices",
    DEFAULT_SETTINGS.stayPrices,
  ) as Settings["stayPrices"];
  const voucherAmountsUsd = pick(
    "voucher_amounts_usd",
    DEFAULT_SETTINGS.voucherAmountsUsd,
  ) as Settings["voucherAmountsUsd"];

  return {
    settings: {
      stayPrices,
      depositPercent: pick("deposit_percent", DEFAULT_SETTINGS.depositPercent),
      ugxRate: pick("ugx_rate", DEFAULT_SETTINGS.ugxRate),
      voucherAmountsUsd,
      holdDays: pick("hold_days", DEFAULT_SETTINGS.holdDays),
    },
    problems,
  };
}

/**
 * Owner-editable settings from the database.
 * Falls back to DEFAULT_SETTINGS when the database is not configured or a
 * value is missing — the numbers are identical, so pricing never lies.
 *
 * This is the PUBLIC read. It must never throw: /vouchers, all three checkout
 * flows and booking approval depend on it, and a broken price page is worse
 * than a stale one. It also cannot distinguish "the owner has never set these"
 * from "the database did not answer" — which is why /admin/settings uses
 * `getSettingsStrict` instead.
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

/**
 * Why a strict read failed, in words the owner can act on.
 *
 * `unconfigured` means there is no database at all (a deployment problem).
 * `unreadable` means the database exists but did not answer this query — a
 * network blip, a timeout, a 5xx. Both return defaults to the public site;
 * only this function tells the admin console that what it is about to show is
 * not the live truth.
 */
export class SettingsReadError extends Error {
  readonly reason: "unconfigured" | "unreadable";
  constructor(reason: "unconfigured" | "unreadable", message: string) {
    super(message);
    this.name = "SettingsReadError";
    this.reason = reason;
  }
}

export type StrictSettings = {
  settings: Settings;
  /** Stored keys that were present but unusable. Empty on a healthy read. */
  problems: SettingsProblem[];
};

/**
 * The ADMIN read. Unlike `getSettings` this never silently substitutes
 * defaults for a failed read, because /admin/settings writes back every value
 * it is given: showing defaults after a transient database blip and then saving
 * would overwrite the owner's real prices with the defaults, with no error
 * anywhere. It throws `SettingsReadError` instead so the page can refuse the
 * save rather than perform a destructive one.
 *
 * Per-key validation failures are still non-fatal — a bad `ugx_rate` should not
 * hide four good prices — but they are reported in `problems`.
 */
export async function getSettingsStrict(): Promise<StrictSettings> {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    throw new SettingsReadError(
      "unconfigured",
      "No database is configured for this deployment.",
    );
  }
  const { data, error } = await db.from("settings").select("key, value");
  if (error || !data) {
    throw new SettingsReadError(
      "unreadable",
      `The settings table could not be read: ${error?.message ?? "no rows returned"}.`,
    );
  }
  return perKey(data as SettingsRows);
}

export async function getSettingUpdatedAt(key: string): Promise<Date | null> {
  try {
    const db = getDb();
    const { data, error } = await db
      .from("settings")
      .select("updated_at")
      .eq("key", key)
      .maybeSingle();
    if (error || !data || !data.updated_at) return null;
    return new Date(data.updated_at);
  } catch {
    return null;
  }
}

const UGX_REVIEW_DAYS = 30;

/**
 * How stale the UGX rate is. Lives here rather than in the page because
 * `Date.now()` inside a component body is impure (the React compiler
 * rejects it), and this is server-only work anyway.
 */
export async function getUgxRateStaleness(): Promise<{
  stale: boolean;
  days: number | null;
}> {
  const updated = await getSettingUpdatedAt("ugx_rate");
  if (!updated) return { stale: true, days: null };
  const days = Math.floor(
    (Date.now() - updated.getTime()) / (24 * 60 * 60 * 1000),
  );
  return { stale: days > UGX_REVIEW_DAYS, days };
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
