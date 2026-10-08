import { describe, expect, it } from "vitest";
import {
  CRON_PATH,
  DEFAULT_SCHEDULE,
  ENV_VAR,
  currentSchedule,
  desiredSchedule,
  isDailySafe,
} from "../scripts/set-cron-schedule.mjs";
import vercelConfig from "../vercel.json";

/**
 * The cron schedule is a deploy-time decision driven by `EMAIL_OUTBOX_CRON`
 * (Vercel cannot interpolate env into vercel.json). Two failure modes are worth
 * locking down, both of which fail *quietly*:
 *
 * 1. A sub-daily schedule shipped on Hobby fails the whole deployment, silently
 *    for git pushes — no failed deployment object is created, so nothing shows in
 *    the dashboard and the branch just stops getting previews.
 * 2. Docs drifting from `vercel.json` would tell an operator to set something
 *    that is not what actually runs.
 *
 * These tests read the real files, so the README/vercel.json claims below are
 * verified rather than asserted in prose.
 */
const vercelJson = vercelConfig as { crons?: { path: string; schedule: string }[] };

describe("schedule decision", () => {
  it("defaults to the daily schedule, which is valid on every plan", () => {
    expect(DEFAULT_SCHEDULE).toBe("0 8 * * *");
    expect(isDailySafe(DEFAULT_SCHEDULE)).toBe(true);
  });

  it("reads the environment variable, and falls back when unset or blank", () => {
    const saved = process.env[ENV_VAR];
    try {
      process.env[ENV_VAR] = "*/5 * * * *";
      expect(desiredSchedule(process.env)).toBe("*/5 * * * *");

      process.env[ENV_VAR] = "";
      expect(desiredSchedule(process.env)).toBe(DEFAULT_SCHEDULE);

      delete process.env[ENV_VAR];
      expect(desiredSchedule(process.env)).toBe(DEFAULT_SCHEDULE);

      // A stray whitespace-only value must not become an invalid expression.
      process.env[ENV_VAR] = "   ";
      expect(desiredSchedule(process.env)).toBe(DEFAULT_SCHEDULE);
    } finally {
      if (saved === undefined) delete process.env[ENV_VAR];
      else process.env[ENV_VAR] = saved;
    }
  });

  it("rejects malformed and non-standard cron expressions instead of writing them", () => {
    const bad = [
      "every 5 minutes",
      "0 8 * *", // 4 fields
      "0 8 * * * *", // 6 fields
      "0 8 * * MON", // Vercel does not support names
      "*/5 * * *", // 4 fields
    ];
    for (const value of bad) {
      const env = { ...process.env, [ENV_VAR]: value };
      expect(() => desiredSchedule(env), `should reject ${JSON.stringify(value)}`).toThrow();
    }
  });

  it("classifies daily vs sub-daily so the script can warn", () => {
    expect(isDailySafe("0 8 * * *")).toBe(true);
    expect(isDailySafe("30 23 * * *")).toBe(true);
    expect(isDailySafe("*/5 * * * *")).toBe(false);
    expect(isDailySafe("0 8,20 * * *")).toBe(false);
  });
});

describe("shipped vercel.json", () => {
  const byPath = (p: string) => vercelJson.crons?.find((c) => c.path === p);

  it("registers the email-outbox path on the daily default", () => {
    expect(byPath(CRON_PATH)?.schedule).toBe(DEFAULT_SCHEDULE);
  });

  it("registers the payment-reconcile sweep, also daily on Hobby", () => {
    expect(byPath("/api/cron/payment-reconcile")?.schedule).toBe("30 7 * * *");
  });

  it("ships only daily-safe schedules for every cron", () => {
    // This is the regression that matters: any sub-daily value would break
    // every push on a Hobby account, silently.
    expect(vercelJson.crons?.length).toBeGreaterThan(0);
    for (const cron of vercelJson.crons ?? []) {
      expect(isDailySafe(cron.schedule), cron.path).toBe(true);
    }
  });

  it("agrees with what the script would read from a bare environment", () => {
    // The actual --check contract: no env var set must mean "leave it alone".
    const saved = process.env[ENV_VAR];
    try {
      delete process.env[ENV_VAR];
      expect(desiredSchedule(process.env)).toBe(currentSchedule());
    } finally {
      if (saved === undefined) delete process.env[ENV_VAR];
      else process.env[ENV_VAR] = saved;
    }
  });

  it("points at cron routes", () => {
    for (const cron of vercelJson.crons ?? []) {
      expect(cron.path).toMatch(/^\/api\/cron\//);
    }
  });
});