import { afterEach, describe, expect, it } from "vitest";
import { DatabaseNotConfiguredError, getDb } from "@/lib/db/client";
import {
  getSettings,
  getSettingsStrict,
  SettingsReadError,
} from "@/lib/db/settings";
import { DEFAULT_SETTINGS } from "@/lib/booking/pricing";

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const saved: Record<string, string | undefined> = {};

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (key in saved) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
      delete saved[key];
    }
  }
});

function clearDbEnv() {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
}

describe("getDb without credentials", () => {
  it("throws DatabaseNotConfiguredError instead of faking a client", () => {
    clearDbEnv();
    expect(() => getDb()).toThrow(DatabaseNotConfiguredError);
    expect(() => getDb()).toThrow(/SUPABASE_URL/);
  });
});

describe("getSettings without credentials", () => {
  it("falls back to defaults (same numbers as the live site)", async () => {
    clearDbEnv();
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.stayPrices.essential.solo).toBe(2200);
    expect(settings.depositPercent).toBe(50);
  });

  // The public read is used by /vouchers, all three checkout flows and booking
  // approval. It must never throw: a stale price page is better than a broken
  // one, because a checkout that cannot read its amount fails outright.
  it("never throws, whatever the database does", async () => {
    clearDbEnv();
    await expect(getSettings()).resolves.toBeTruthy();
  });
});

describe("getSettingsStrict", () => {
  it("throws an unconfigured error when there is no database", async () => {
    clearDbEnv();
    await expect(getSettingsStrict()).rejects.toThrow(SettingsReadError);
    await expect(getSettingsStrict()).rejects.toThrow(/no database/i);
  });

  /**
   * The whole reason this function exists. `getSettings` cannot tell "the owner
   * has never changed these numbers" from "the database did not answer", and
   * /admin/settings writes back whatever it is shown — so a silent fallback
   * there turns one transient blip into a silent overwrite of real prices.
   * The strict read refuses instead, which is what lets the page disable Save.
   */
  it("refuses rather than substituting defaults for a failed read", async () => {
    clearDbEnv();
    let thrown: unknown;
    try {
      await getSettingsStrict();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(SettingsReadError);
    expect((thrown as SettingsReadError).reason).toBe("unconfigured");
  });
});
