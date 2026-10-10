import { afterEach, describe, expect, it, vi } from "vitest";
import { getSettingsStrict, SettingsReadError } from "@/lib/db/settings";
import { DEFAULT_SETTINGS } from "@/lib/booking/pricing";

/**
 * Per-key settings resolution.
 *
 * `fromRows` used to bail out to ALL defaults when any single stored key failed
 * validation, so one bad `ugx_rate` silently reset the stay prices as well. The
 * strict read now validates each key on its own: good keys survive, the bad one
 * falls back to its own default and is named in `problems`, so /admin/settings
 * can say exactly which number is wrong.
 *
 * The database is mocked rather than absent, because "the query failed" and
 * "a stored value is invalid" are the two cases that matter here and neither can
 * be produced by simply clearing the env vars.
 */
const from = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    from: () => ({ select: () => ({ ...from() }) }),
  }),
  DatabaseNotConfiguredError: class extends Error {},
}));

const GOOD_ROWS = [
  { key: "ugx_rate", value: 4100 },
  { key: "deposit_percent", value: 60 },
  { key: "hold_days", value: 7 },
  {
    key: "stay_prices",
    value: {
      essential: { solo: 2400, couple: 3900 },
      master: { solo: 4800, couple: 7600 },
      buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
    },
  },
];

afterEach(() => {
  from.mockReset();
});

describe("getSettingsStrict — per-key resolution", () => {
  it("returns every stored value when all of them are valid", async () => {
    from.mockReturnValue({ data: GOOD_ROWS, error: null });
    const { settings, problems } = await getSettingsStrict();
    expect(problems).toEqual([]);
    expect(settings.ugxRate).toBe(4100);
    expect(settings.depositPercent).toBe(60);
    expect(settings.holdDays).toBe(7);
    expect(settings.stayPrices.essential.solo).toBe(2400);
  });

  it("keeps the good keys when ONE key is invalid", async () => {
    from.mockReturnValue({
      data: [...GOOD_ROWS, { key: "ugx_rate", value: "not a number" }],
      error: null,
    });
    const { settings, problems } = await getSettingsStrict();
    // The point of the change: these are NOT reset to defaults any more.
    expect(settings.depositPercent).toBe(60);
    expect(settings.holdDays).toBe(7);
    expect(settings.stayPrices.master.couple).toBe(7600);
    // Only the bad key falls back.
    expect(settings.ugxRate).toBe(DEFAULT_SETTINGS.ugxRate);
    expect(problems).toHaveLength(1);
    expect(problems[0].key).toBe("ugx_rate");
  });

  it("names every key it could not use", async () => {
    from.mockReturnValue({
      data: [
        { key: "ugx_rate", value: "nope" },
        { key: "deposit_percent", value: 900 },
        { key: "hold_days", value: -3 },
        ...GOOD_ROWS.filter(
          (r) => !["ugx_rate", "deposit_percent", "hold_days"].includes(r.key),
        ),
      ],
      error: null,
    });
    const { problems } = await getSettingsStrict();
    const keys = problems.map((p) => p.key).sort();
    expect(keys).toEqual(["deposit_percent", "hold_days", "ugx_rate"]);
    for (const p of problems) expect(p.message).toBeTruthy();
  });

  it("falls back per key for a bad stay_prices block without losing the rest", async () => {
    from.mockReturnValue({
      data: [
        ...GOOD_ROWS.filter((r) => r.key !== "stay_prices"),
        { key: "stay_prices", value: { essential: { solo: "cheap" } } },
      ],
      error: null,
    });
    const { settings, problems } = await getSettingsStrict();
    expect(problems.map((p) => p.key)).toEqual(["stay_prices"]);
    expect(settings.stayPrices).toEqual(DEFAULT_SETTINGS.stayPrices);
    // The independent keys are untouched.
    expect(settings.ugxRate).toBe(4100);
    expect(settings.depositPercent).toBe(60);
  });

  it("uses defaults for keys that were never stored at all, with no problem flagged", async () => {
    from.mockReturnValue({ data: [{ key: "ugx_rate", value: 4100 }], error: null });
    const { settings, problems } = await getSettingsStrict();
    expect(problems).toEqual([]);
    expect(settings.ugxRate).toBe(4100);
    expect(settings.depositPercent).toBe(DEFAULT_SETTINGS.depositPercent);
    expect(settings.voucherAmountsUsd).toEqual(DEFAULT_SETTINGS.voucherAmountsUsd);
  });

  it("accepts an empty voucher list as a deliberate 'not on sale'", async () => {
    from.mockReturnValue({
      data: [{ key: "voucher_amounts_usd", value: [] }],
      error: null,
    });
    const { settings, problems } = await getSettingsStrict();
    expect(problems).toEqual([]);
    expect(settings.voucherAmountsUsd).toEqual([]);
  });

  it("throws an unreadable error when the query itself fails", async () => {
    from.mockReturnValue({ data: null, error: { message: "connection reset" } });
    await expect(getSettingsStrict()).rejects.toThrow(SettingsReadError);
    let thrown: SettingsReadError | null = null;
    try {
      await getSettingsStrict();
    } catch (err) {
      thrown = err as SettingsReadError;
    }
    expect(thrown?.reason).toBe("unreadable");
    expect(thrown?.message).toContain("connection reset");
  });

  it("treats an empty table as a real 'nothing overridden yet', not an error", async () => {
    // Worth being precise about, because it looks like the failure case and is
    // not one. An empty table is a TRUE reading: the owner has never changed a
    // number, so the defaults ARE the live settings and writing them back
    // overwrites nothing. Only a query that actually failed is an error — that
    // case is covered above. Treating an empty table as a failure would leave
    // a fresh deployment permanently unable to save its first settings.
    from.mockReturnValue({ data: [], error: null });
    const { settings, problems } = await getSettingsStrict();
    expect(problems).toEqual([]);
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});