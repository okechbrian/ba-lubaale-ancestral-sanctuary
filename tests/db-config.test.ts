import { afterEach, describe, expect, it } from "vitest";
import { DatabaseNotConfiguredError, getDb } from "@/lib/db/client";
import { getSettings } from "@/lib/db/settings";
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
});
