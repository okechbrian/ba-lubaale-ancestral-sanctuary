import "server-only";
import {
  getPaymentById,
  listStuckPayments,
  markPaymentChecked,
} from "@/lib/db/payments";
import type { PaymentRow } from "@/lib/db/types";
import { verifyAndSettle, type SettleResult } from "@/lib/payments/settle";

/**
 * Payment reconciliation: closes the gap where a guest paid but the IPN never
 * reached us (provider outage, our deploy, a dropped webhook) and the payment
 * sits `initiated` forever.
 *
 * It owns NO settlement logic. Every payment it touches goes through
 * `verifyAndSettle` — the same function the IPN uses — so nothing is ever
 * marked paid unless Pesapal itself says COMPLETED for the exact currency and
 * amount we asked for, and the atomic completion (claim + payment + booking +
 * queued emails) is the identical transaction.
 */

/** An `initiated` payment is "stuck" once it has been open this long. */
export const STUCK_AFTER_MS = 30 * 60 * 1000;
/** The sweep stops polling a payment this long after it was created. */
export const RECONCILE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const RECONCILE_DEFAULT_LIMIT = 25;
export const RECONCILE_MAX_LIMIT = 100;

export type ReconcileSource = "cron" | "admin";

function claimType(source: ReconcileSource): string {
  return `RECONCILE:${source}`;
}

export interface ReconcileItem {
  paymentId: string;
  result: SettleResult["result"] | "error";
  detail?: string;
}

export interface ReconcileSummary {
  checked: number;
  settled: number;
  failed: number;
  unresolved: number;
  rejected: number;
  blocked: number;
  duplicate: number;
  /** The provider could not be asked; the sweep stops at the first of these. */
  unavailable: number;
  /** A payment threw (database error); the sweep carries on with the rest. */
  errors: number;
  items: ReconcileItem[];
}

function emptySummary(): ReconcileSummary {
  return {
    checked: 0,
    settled: 0,
    failed: 0,
    unresolved: 0,
    rejected: 0,
    blocked: 0,
    duplicate: 0,
    unavailable: 0,
    errors: 0,
    items: [],
  };
}

/**
 * Ask the provider about one payment and settle it if — and only if — the
 * provider verifies it. `initiated` and `failed` payments are re-checkable (a
 * failure can be wrong: a guest may retry the same order and pay). A payment
 * that was only ever `pending` has no provider tracking id yet, and
 * `cancelled` is deliberate, so neither is re-queried.
 */
export type RecheckResult =
  | { found: false }
  | { found: true; recheckable: false; status: PaymentRow["status"] }
  | { found: true; recheckable: true; settle: SettleResult };

export async function recheckPayment(
  paymentId: string,
  source: ReconcileSource,
  now: Date = new Date(),
): Promise<RecheckResult> {
  const payment = await getPaymentById(paymentId);
  if (!payment) return { found: false };
  if (payment.status === "completed") {
    return { found: true, recheckable: true, settle: { result: "already_completed" } };
  }
  if (payment.status !== "initiated" && payment.status !== "failed") {
    return { found: true, recheckable: false, status: payment.status };
  }

  const settle = await verifyAndSettle(payment, {
    trackingId: payment.provider_ref,
    merchantRef: payment.id,
    type: claimType(source),
    mode: "reconcile",
  });
  if (settle.result === "unresolved" && payment.status === "initiated") {
    await markPaymentChecked(payment.id, now);
  }
  return { found: true, recheckable: true, settle };
}

function tally(summary: ReconcileSummary, item: ReconcileItem): void {
  summary.items.push(item);
  switch (item.result) {
    case "settled":
      summary.settled++;
      break;
    case "failed":
      summary.failed++;
      break;
    case "unresolved":
      summary.unresolved++;
      break;
    case "rejected":
      summary.rejected++;
      break;
    case "blocked":
      summary.blocked++;
      break;
    case "duplicate":
    case "already_completed":
      summary.duplicate++;
      break;
    case "provider_unavailable":
      summary.unavailable++;
      break;
    case "error":
      summary.errors++;
      break;
  }
}

/**
 * One sweep over the stuck payments (oldest-looked-at first, capped by
 * `limit`). Sequential on purpose: it is a background job, the provider
 * rate-limits, and each settlement is its own transaction.
 */
export async function reconcileStuckPayments(
  opts: { now?: Date; limit?: number } = {},
): Promise<ReconcileSummary> {
  const now = opts.now ?? new Date();
  const limit = Math.min(
    RECONCILE_MAX_LIMIT,
    Math.max(1, Math.floor(opts.limit ?? RECONCILE_DEFAULT_LIMIT)),
  );

  const stuck = await listStuckPayments({
    now,
    idleMs: STUCK_AFTER_MS,
    maxAgeMs: RECONCILE_MAX_AGE_MS,
    limit,
  });

  const summary = emptySummary();
  for (const payment of stuck) {
    summary.checked++;
    try {
      const settle = await verifyAndSettle(payment, {
        trackingId: payment.provider_ref,
        merchantRef: payment.id,
        type: claimType("cron"),
        mode: "reconcile",
      });
      if (settle.result === "unresolved") {
        await markPaymentChecked(payment.id, now);
      }
      tally(summary, {
        paymentId: payment.id,
        result: settle.result,
        ...(settle.result === "rejected" ? { detail: settle.reason } : {}),
        ...(settle.result === "provider_unavailable"
          ? { detail: settle.message }
          : {}),
      });
      if (settle.result === "provider_unavailable") break;
    } catch (err) {
      console.error(
        `payment reconcile failed for ${payment.id}:`,
        err instanceof Error ? err.message : "unknown",
      );
      tally(summary, {
        paymentId: payment.id,
        result: "error",
        detail: err instanceof Error ? err.message : "unknown",
      });
    }
  }
  return summary;
}
