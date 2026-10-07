#!/usr/bin/env node
/**
 * Set the email-outbox cron schedule from the environment.
 *
 * ## Why this script exists
 *
 * The obvious approach — `vercel.json` reading an env var — is not possible.
 * Vercel parses `vercel.json` as static JSON and offers no interpolation; in
 * their own community discussion, staff state there is no solution for putting
 * an environment variable in the `schedule` value. Vercel also registers crons
 * from the uploaded `vercel.json` *before* the build runs, so rewriting the file
 * during `npm run build` would be too late to matter.
 *
 * So the plan-driven decision happens here instead: a deploy-time step reads
 * `EMAIL_OUTBOX_CRON` and writes `vercel.json`. Everything that decides or
 * checks the schedule lives in this one file rather than in prose.
 *
 *   node scripts/set-cron-schedule.mjs            # apply EMAIL_OUTBOX_CRON
 *   node scripts/set-cron-schedule.mjs --check    # verify, exit 1 on drift
 *
 * ## The plan constraint (this is the whole point)
 *
 * Vercel's Hobby plan rejects any cron that fires more than once per day, and
 * it rejects it by failing the **entire deployment**. For git pushes that
 * failure is silent: no deployment is created, so nothing appears in the
 * dashboard's failed list and the branch simply stops getting previews. A
 * Pro plan ($20/mo) lifts the restriction and allows a 5-minute schedule.
 *
 * Default is therefore the daily `0 8 * * *`, which is safe on every plan.
 * Set `EMAIL_OUTBOX_CRON` to the five-minute expression only on a Pro plan.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERCEL_JSON = join(ROOT, "vercel.json");

export const CRON_PATH = "/api/cron/email-outbox";
export const DEFAULT_SCHEDULE = "0 8 * * *"; // daily, 08:00 UTC — valid on every plan
export const ENV_VAR = "EMAIL_OUTBOX_CRON";

/**
 * A cron expression is "daily-safe" when it can fire at most once per UTC day.
 * Vercel only rejects sub-daily expressions on Hobby, so this is the predicate
 * that decides whether a schedule is risky.
 */
export function isDailySafe(schedule) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour] = parts;
  // A specific minute AND a specific hour means once a day. Wildcards, ranges
  // and lists in either position mean the job can fire more often than that.
  const isFixed = (f) => /^\d+$/.test(f);
  return isFixed(minute) && isFixed(hour);
}

function assertValidShape(schedule) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `${ENV_VAR} must be a 5-field cron expression, got ${JSON.stringify(schedule)}`,
    );
  }
  for (const field of parts) {
    // Vercel supports standard 5-field syntax with `*`, lists and ranges; it
    // deliberately does NOT support MON/SUN/JAN/DEC or a combined DOM+DOW.
    if (!/^[\d*/,\-]+$/.test(field)) {
      throw new Error(
        `${ENV_VAR} field ${JSON.stringify(field)} is not a plain cron field ` +
          `(digits, *, ranges, lists). Vercel does not support MON/JAN names.`,
      );
    }
  }
}

/** Read the desired schedule from the environment, defaulting to the safe one. */
export function desiredSchedule(env = process.env) {
  const raw = (env[ENV_VAR] ?? "").trim();
  const schedule = raw || DEFAULT_SCHEDULE;
  assertValidShape(schedule);
  return schedule;
}

/** Current schedule as recorded in vercel.json, or null when absent. */
export function currentSchedule(json = readJson()) {
  const cron = (json.crons ?? []).find((c) => c.path === CRON_PATH);
  return cron?.schedule ?? null;
}

function readJson() {
  try {
    return JSON.parse(readFileSync(VERCEL_JSON, "utf8"));
  } catch {
    return {};
  }
}

function writeSchedule(schedule) {
  const json = readJson();
  const crons = Array.isArray(json.crons) ? json.crons : [];
  const at = crons.findIndex((c) => c.path === CRON_PATH);
  if (at === -1) crons.push({ path: CRON_PATH, schedule });
  else crons[at] = { ...crons[at], schedule };
  writeFileSync(VERCEL_JSON, `${JSON.stringify({ ...json, crons }, null, 2)}\n`, "utf8");
}

function main(argv) {
  const check = argv.includes("--check");

  let schedule;
  try {
    schedule = desiredSchedule();
  } catch (err) {
    console.error(`[cron] ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
    return;
  }

  const current = currentSchedule();

  if (check) {
    if (current !== schedule) {
      console.error(
        `[cron] vercel.json has ${JSON.stringify(current)} but ${ENV_VAR} wants ` +
          `${JSON.stringify(schedule)}. Run: node scripts/set-cron-schedule.mjs`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(`[cron] ok - ${CRON_PATH} at ${JSON.stringify(schedule)}`);
    return;
  }

  if (current === schedule) {
    console.log(`[cron] already ${JSON.stringify(schedule)} - nothing to do`);
    return;
  }

  writeSchedule(schedule);
  console.log(`[cron] ${CRON_PATH}: ${JSON.stringify(current)} -> ${JSON.stringify(schedule)}`);

  if (!isDailySafe(schedule)) {
    console.warn(
      `[cron] WARNING: ${JSON.stringify(schedule)} fires more than once per day. ` +
        `That requires a Vercel Pro plan. On Hobby the deployment will FAIL — ` +
        `and for git pushes it fails SILENTLY (no deployment, nothing in the ` +
        `dashboard).`,
    );
  } else {
    console.log(
      `[cron] ${JSON.stringify(schedule)} is daily-safe: valid on Hobby and Pro.`,
    );
  }
}

// Only run when invoked directly, so tests can import the helpers.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2));
}