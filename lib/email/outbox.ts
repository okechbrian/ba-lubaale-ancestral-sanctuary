import "server-only";
import {
  claimOutboxRow,
  listDueOutbox,
  markOutboxFailed,
  markOutboxSent,
} from "@/lib/db/email-outbox";
import type { EmailOutboxRow } from "@/lib/db/types";
import { getEmailSender, isEmailTransportConfigured } from "@/lib/email/sender";

/**
 * Transactional outbox processor.
 *
 * The IPN no longer sends payment email itself — it only queues rows inside
 * the payment transaction (see migration 20261002000005). This drains the
 * queue: claim, send, record. It is safe to run concurrently because claiming
 * is a database compare-and-set, and safe to run twice because a delivered row
 * is never pending again.
 *
 * Delivery semantics, honestly stated: **at-least-once**. A row is only
 * `sent` after the SMTP call returns, so a processor killed between "SMTP
 * accepted the message" and "row marked sent" will resend on the next run. The
 * database guarantees one row per (payment, category) — that is as close to
 * exactly-once as SMTP allows without provider-side idempotency keys.
 */

/** Attempts before a row is parked as `failed` for manual resend. */
export const OUTBOX_MAX_ATTEMPTS = 5;

/** Longest backoff between attempts (minutes). */
export const OUTBOX_MAX_BACKOFF_MIN = 60;

/** Rows drained per run — keeps a cron tick well inside its time budget. */
export const OUTBOX_DEFAULT_LIMIT = 25;

/**
 * Exponential backoff: 2, 4, 8, 16, 32 … capped at 60 minutes. Deterministic
 * and unit-tested; no jitter, because a queue this small does not need it and
 * predictable timings are easier to reason about.
 */
export function backoffMinutes(attempts: number): number {
  const n = Math.max(1, Math.floor(attempts));
  return Math.min(OUTBOX_MAX_BACKOFF_MIN, 2 ** n);
}

export function backoffDate(attempts: number, from: Date): Date {
  return new Date(from.getTime() + backoffMinutes(attempts) * 60_000);
}

/** Overridable transport, so tests never need a live SMTP server. */
export type OutboxSender = (
  row: EmailOutboxRow,
) => Promise<{ delivered: boolean; error?: string }>;

export interface ProcessSummary {
  /** Rows whose backoff had elapsed. */
  due: number;
  /** Rows this run took exclusive ownership of. */
  claimed: number;
  sent: number;
  /** Failed but still retrying (status stays pending). */
  retrying: number;
  /** Attempt budget spent — parked as `failed` for the owner to resend. */
  failed: number;
  /** Lost the claim race to another processor. */
  skipped: number;
}

const defaultSender: OutboxSender = async (row) => {
  const result = await getEmailSender().send({
    to: row.recipient,
    subject: row.subject,
    text: row.body,
  });
  return { delivered: result.delivered, error: result.error };
};

/**
 * Drain up to `limit` due rows. Never throws for a single bad row: one
 * poisonous email must not stop the queue. A missing database propagates as
 * `DatabaseNotConfiguredError` (the honest 503 path in the route).
 */
export async function processEmailOutbox(
  opts: { limit?: number; sender?: OutboxSender; now?: Date } = {},
): Promise<ProcessSummary> {
  const limit = opts.limit ?? OUTBOX_DEFAULT_LIMIT;
  const send = opts.sender ?? defaultSender;
  const now = opts.now ?? new Date();

  const summary: ProcessSummary = {
    due: 0,
    claimed: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    skipped: 0,
  };

  const due = await listDueOutbox(limit, now.toISOString());
  summary.due = due.length;

  for (const candidate of due) {
    let row: EmailOutboxRow | null = null;
    try {
      row = await claimOutboxRow(candidate.id);
    } catch (err) {
      console.error(
        `[email-outbox] claim failed for ${candidate.id}:`,
        err instanceof Error ? err.message : "unknown",
      );
      summary.skipped += 1;
      continue;
    }
    if (!row) {
      summary.skipped += 1; // another processor owns it
      continue;
    }
    summary.claimed += 1;

    let result: { delivered: boolean; error?: string };
    try {
      result = await send(row);
    } catch (err) {
      // A transport that throws is a failed delivery, not a crashed queue.
      result = {
        delivered: false,
        error: err instanceof Error ? err.message : "sender_threw",
      };
    }

    try {
      if (result.delivered) {
        await markOutboxSent(row.id);
        summary.sent += 1;
        continue;
      }

      const error = result.error ?? "send_failed";
      // No mail server configured is not a transient fault: retrying on a
      // timer would just fill the log. Park it so the owner can fix SMTP and
      // press Resend.
      const terminal =
        error === "smtp_not_configured" || row.attempts >= OUTBOX_MAX_ATTEMPTS;
      await markOutboxFailed(row.id, error, {
        terminal,
        nextAttemptAt: backoffDate(row.attempts, now).toISOString(),
      });
      if (terminal) summary.failed += 1;
      else summary.retrying += 1;
      console.error(
        `[email-outbox] ${row.category} -> ${row.recipient} failed ` +
          `(attempt ${row.attempts}/${OUTBOX_MAX_ATTEMPTS}): ${error}` +
          (terminal ? " — parked, needs a manual resend" : " — retrying"),
      );
    } catch (err) {
      summary.retrying += 1;
      console.error(
        `[email-outbox] could not record outcome for ${row.id}:`,
        err instanceof Error ? err.message : "unknown",
      );
    }
  }

  return summary;
}

/**
 * How many rows an inline drain may deliver inside one webhook request.
 *
 * Bounded on purpose: this runs while the provider waits for our ack, so a
 * large backlog must never turn into a slow webhook. Anything beyond the
 * limit stays queued for the cron.
 */
export const OUTBOX_INLINE_LIMIT = 5;

/**
 * Deliver a few queued emails right now, inline, and never throw.
 *
 * Used by the IPN so a guest hears about a settled payment within the webhook
 * rather than waiting for the next cron tick. The cron remains the safety net:
 * whatever this does not deliver is still queued, and anything it fails is
 * retried there.
 *
 * Two rules make it safe to call from a webhook:
 *
 * 1. **It never throws.** The payment is already committed and the emails are
 *    durably queued. A mail failure is not a reason to tell the provider the
 *    payment failed, because it would then be retried against an
 *    already-settled payment. So this swallows everything and logs loudly.
 *
 * 2. **It does nothing at all when SMTP is unconfigured.** This one is
 *    subtle and matters: `processEmailOutbox` treats `smtp_not_configured` as a
 *    *terminal* failure and parks the row for a manual resend. Draining inline
 *    with no mail transport would therefore permanently park rows that are
 *    currently safely `pending` and would have gone out on the cron the moment
 *    SMTP was configured. Not attempting anything keeps that promise.
 */
export async function drainOutboxBestEffort(opts: {
  /** Short label for logs, e.g. `payment:deposit`. */
  reason: string;
  limit?: number;
  sender?: OutboxSender;
  now?: Date;
}): Promise<ProcessSummary | null> {
  // An injected sender is a test double that decides its own outcome, so only
  // skip when the REAL transport is the thing that is missing.
  if (!opts.sender && !isEmailTransportConfigured()) {
    return null;
  }
  try {
    const summary = await processEmailOutbox({
      limit: opts.limit ?? OUTBOX_INLINE_LIMIT,
      ...(opts.sender ? { sender: opts.sender } : {}),
      ...(opts.now ? { now: opts.now } : {}),
    });
    if (summary.sent > 0 || summary.failed > 0 || summary.retrying > 0) {
      console.log(
        `[email-outbox] inline drain (${opts.reason}): sent=${summary.sent} ` +
          `retrying=${summary.retrying} failed=${summary.failed} ` +
          `skipped=${summary.skipped} — anything left stays queued for the cron.`,
      );
    }
    return summary;
  } catch (err) {
    console.error(
      `[email-outbox] inline drain (${opts.reason}) threw; the webhook still ` +
        `acks and the cron retries:`,
      err instanceof Error ? err.message : "unknown",
    );
    return null;
  }
}