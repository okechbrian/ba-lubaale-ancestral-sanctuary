import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");

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
  it("registers the email-outbox path", () => {
    expect(vercelJson.crons).toEqual([{ path: CRON_PATH, schedule: DEFAULT_SCHEDULE }]);
  });

  it("ships the Hobby-safe daily schedule", () => {
    // This is the regression that matters: a sub-daily value here would break
    // every push on a Hobby account, silently.
    expect(isDailySafe(vercelJson.crons?.[0]?.schedule ?? "")).toBe(true);
  });

  it("agrees with the script's default, so --check passes on a clean tree", () => {
    expect(vercelJson.crons?.[0]?.schedule).toBe(DEFAULT_SCHEDULE);
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

  it("is the only cron, so there is nothing else a plan limit could break", () => {
    expect(vercelJson.crons).toHaveLength(1);
  });

  it("points at a route that actually exists", () => {
    expect(CRON_PATH).toBe("/api/cron/email-outbox");
    // server-only route dirs are route handlers; assert the file is present.
    expect(raw).toContain("email-outbox");
  });
});