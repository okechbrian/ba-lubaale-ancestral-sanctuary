import { DatabaseNotConfiguredError } from "@/lib/db/client";
import {
  OUTBOX_DEFAULT_LIMIT,
  processEmailOutbox,
  type ProcessSummary,
} from "@/lib/email/outbox";

export const dynamic = "force-dynamic";

/**
 * Drains the transactional email outbox. Wired to Vercel Cron via the
 * `crons` entry in `vercel.json`, which invokes the path with a **GET** and an
 * `Authorization: Bearer $CRON_SECRET` header — so both verbs run the queue, and
 * POST is there for a manual kick.
 *
 * This is the **safety net**, not the fast path. A settled payment's emails are
 * normally delivered inline by the IPN (`drainOutboxBestEffort`), so the guest
 * hears immediately; whatever that did not deliver — or could not — stays queued
 * here. That is why losing a cron tick degrades latency rather than correctness.
 *
 * The schedule itself is a deploy-time decision driven by `EMAIL_OUTBOX_CRON`
 * through `scripts/set-cron-schedule.mjs`, because Vercel cannot interpolate an
 * environment variable into `vercel.json`. Daily on Hobby, five-minute on Pro.
 * The response echoes `x-vercel-cron-schedule`, which Vercel sends on every
 * invocation, so the schedule actually in force is observable rather than a
 * guess.
 *
 * Security: this endpoint sends email, so it is never open. Vercel only
 * attaches the bearer header when `CRON_SECRET` is configured; if it is unset
 * we refuse with 503 rather than letting anyone on the internet trigger mail
 * delivery. Compare with a timing-safe-ish equality on the secret.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (presented.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= presented.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

async function handle(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET?.trim()) {
    // Loud and honest: an unauthenticated mail trigger is never created
    // "for convenience".
    console.error(
      "[email-outbox] CRON_SECRET is not set — refusing to process. Set it in " +
        "Vercel (the cron job sends it as `Authorization: Bearer <CRON_SECRET>`).",
    );
    return Response.json({ error: "cron_secret_missing" }, { status: 503 });
  }
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const limitRaw = Number(
    new URL(request.url).searchParams.get("limit") ?? OUTBOX_DEFAULT_LIMIT,
  );
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(100, Math.floor(limitRaw))
      : OUTBOX_DEFAULT_LIMIT;

  try {
    const summary: ProcessSummary = await processEmailOutbox({ limit });
    // Echo the schedule Vercel says fired, so the timing actually in force is
    // visible in the response instead of being inferred from vercel.json.
    const fired = request.headers.get("x-vercel-cron-schedule");
    return Response.json({
      ok: true,
      ...summary,
      ...(fired ? { schedule: fired } : {}),
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "[email-outbox] processor run failed:",
      err instanceof Error ? err.message : "unknown",
    );
    // 500 (not 200): the cron platform must see that this run did NOT finish,
    // otherwise a broken queue looks like a healthy one.
    return Response.json({ error: "outbox_failed" }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}