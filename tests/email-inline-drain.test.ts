import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailOutboxRow } from "@/lib/db/types";
import type { OutboxSender } from "@/lib/email/outbox";

/**
 * The inline outbox drain: one best-effort delivery attempt made by the IPN
 * immediately after a payment or voucher settles, so the guest hears about it
 * within the webhook rather than at the next cron tick.
 *
 * Two properties matter more than speed here.
 *
 * 1. **It must never throw.** The payment is already committed and the emails
 *    are already durable. A mail failure is not a reason to tell the provider
 *    the payment failed, because it would then retry an already-settled one.
 *
 * 2. **It must not attempt anything when SMTP is unconfigured.** The processor
 *    classifies `smtp_not_configured` as *terminal* and parks the row for a
 *    manual resend. Draining with no transport would therefore permanently park
 *    rows that should stay `pending` and go out on the cron as soon as SMTP is
 *    configured. That is the regression these tests exist to prevent.
 *
 * The storage layer is mocked so the state machine is exercised as pure logic,
 * matching tests/email-outbox.test.ts. The real database path is covered by
 * tests/outbox-integrity.test.ts.
 */
interface OutboxStorage {
  listDueOutbox: (limit: number, nowIso: string) => Promise<EmailOutboxRow[]>;
  claimOutboxRow: (id: string) => Promise<EmailOutboxRow | null>;
  markOutboxSent: (id: string) => Promise<void>;
  markOutboxFailed: (
    id: string,
    error: string,
    opts: { terminal: boolean; nextAttemptAt: string },
  ) => Promise<void>;
}

const storage = {
  listDueOutbox: vi
    .fn<OutboxStorage["listDueOutbox"]>()
    .mockImplementation(async (limit) => dueRows.slice(0, limit)),
  claimOutboxRow: vi.fn<OutboxStorage["claimOutboxRow"]>(async (id) => {
    const found = dueRows.find((r) => r.id === id);
    return found ? { ...found, attempts: found.attempts + 1 } : null;
  }),
  markOutboxSent: vi.fn<OutboxStorage["markOutboxSent"]>(async () => undefined),
  markOutboxFailed: vi.fn<OutboxStorage["markOutboxFailed"]>(
    async () => undefined,
  ),
} satisfies OutboxStorage;

vi.mock("@/lib/db/email-outbox", () => storage);

const { OUTBOX_INLINE_LIMIT, drainOutboxBestEffort } = await import(
  "@/lib/email/outbox"
);

const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

let dueRows: EmailOutboxRow[] = [];

function row(overrides: Partial<EmailOutboxRow> = {}): EmailOutboxRow {
  return {
    id: "row-1",
    created_at: "2026-10-07T00:00:00.000Z",
    updated_at: "2026-10-07T00:00:00.000Z",
    category: "payment_received_deposit_guest",
    recipient: "guest@example.test",
    subject: "Your stay is confirmed",
    body: "Body",
    booking_id: null,
    payment_id: null,
    status: "pending",
    attempts: 0,
    resends: 0,
    last_error: null,
    next_attempt_at: "2026-10-07T00:00:00.000Z",
    sent_at: null,
    ...overrides,
  };
}

const working: OutboxSender = async () => ({ delivered: true });
const failing: OutboxSender = async () => ({
  delivered: false,
  error: "smtp_rejected",
});

const SAVED = ["SMTP_USER", "SMTP_PASS"];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  dueRows = [];
  for (const k of SAVED) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  // The real query applies LIMIT in SQL, so the double has to honour the limit
  // too — otherwise a test would silently pass while ignoring it.
  storage.listDueOutbox
    .mockReset()
    .mockImplementation(async (limit) => dueRows.slice(0, limit));
  storage.claimOutboxRow.mockReset().mockImplementation(async (id: string) => {
    const found = dueRows.find((r) => r.id === id);
    return found ? { ...found, attempts: found.attempts + 1 } : null;
  });
  storage.markOutboxSent.mockReset().mockResolvedValue(undefined);
  storage.markOutboxFailed.mockReset().mockResolvedValue(undefined);
  errorSpy.mockClear();
  logSpy.mockClear();
});

afterEach(() => {
  for (const k of SAVED) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("inline drain — delivered when the transport works", () => {
  it("marks the row sent inside the same pass", async () => {
    dueRows = [row()];
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit", sender: working });

    expect(storage.markOutboxSent).toHaveBeenCalledWith("row-1");
    expect(storage.markOutboxFailed).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ due: 1, claimed: 1, sent: 1 });
  });

  it("delivers the voucher category too, which is the case that matters most", async () => {
    // A voucher's raw code exists nowhere but that email body, so a buyer who
    // does not hear today holds an unusable code.
    dueRows = [row({ category: "voucher_issued_buyer" })];
    const summary = await drainOutboxBestEffort({ reason: "voucher", sender: working });
    expect(summary?.sent).toBe(1);
  });

  it("delivers up to the inline limit and leaves the rest for the cron", async () => {
    dueRows = Array.from({ length: 8 }, (_, i) =>
      row({ id: `row-${i}`, next_attempt_at: "2026-10-07T00:00:00.000Z" }),
    );
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit", sender: working });

    expect(summary?.sent).toBe(OUTBOX_INLINE_LIMIT);
    expect(storage.listDueOutbox).toHaveBeenCalledWith(
      OUTBOX_INLINE_LIMIT,
      expect.any(String),
    );
    // The overflow is untouched: still pending, nothing failed it.
    expect(storage.markOutboxSent).toHaveBeenCalledTimes(OUTBOX_INLINE_LIMIT);
    expect(storage.markOutboxFailed).not.toHaveBeenCalled();
  });

  it("honours an explicit limit", async () => {
    dueRows = Array.from({ length: 4 }, (_, i) => row({ id: `r${i}` }));
    const summary = await drainOutboxBestEffort({
      reason: "test",
      limit: 2,
      sender: working,
    });
    expect(summary?.sent).toBe(2);
  });
});

describe("inline drain — still queued when the transport fails", () => {
  it("does not mark the row sent; it requeues with backoff", async () => {
    dueRows = [row()];
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit", sender: failing });

    expect(storage.markOutboxSent).not.toHaveBeenCalled();
    expect(storage.markOutboxFailed).toHaveBeenCalledWith(
      "row-1",
      "smtp_rejected",
      expect.objectContaining({ terminal: false }),
    );
    // Still pending, so the cron (or the next IPN) picks it up.
    expect(summary).toMatchObject({ sent: 0, retrying: 1, failed: 0 });
  });

  it("a throwing transport is a failed delivery, not a dead queue", async () => {
    dueRows = [row()];
    const thrower: OutboxSender = async () => {
      throw new Error("socket hang up");
    };
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit", sender: thrower });

    expect(storage.markOutboxSent).not.toHaveBeenCalled();
    expect(summary?.sent).toBe(0);
    expect(summary?.retrying).toBe(1);
  });
});

describe("inline drain — never throws", () => {
  it("swallows a backend failure and returns null", async () => {
    storage.listDueOutbox.mockRejectedValue(
      new Error("Database not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"),
    );
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit", sender: working });

    // A thrown drain must never reach the webhook's own error handling, which
    // would 503 and invite the provider to retry a settled payment.
    expect(summary).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("inline drain"),
      expect.stringContaining("Database not configured"),
    );
  });

  it("swallows a failure recording the outcome", async () => {
    dueRows = [row()];
    storage.markOutboxSent.mockRejectedValue(new Error("write failed"));
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit", sender: working });

    expect(summary).not.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("inline drain — does not attempt when SMTP is unconfigured", () => {
  it("leaves every row pending instead of parking it", async () => {
    // THE regression guard. With no SMTP credentials the real sender reports
    // `smtp_not_configured`, which the processor treats as terminal — so an
    // unguarded inline pass would mark these rows `failed` and require a manual
    // resend, even though they are perfectly deliverable once SMTP is set.
    dueRows = [row()];
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit" });

    expect(summary).toBeNull();
    expect(storage.listDueOutbox).not.toHaveBeenCalled();
    expect(storage.claimOutboxRow).not.toHaveBeenCalled();
    expect(storage.markOutboxFailed).not.toHaveBeenCalled();
    expect(storage.markOutboxSent).not.toHaveBeenCalled();
  });

  it("treats half-configured SMTP as not configured", async () => {
    process.env.SMTP_USER = "someone@example.test";
    process.env.SMTP_PASS = "   ";
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit" });
    expect(summary).toBeNull();
    expect(storage.listDueOutbox).not.toHaveBeenCalled();
  });

  it("attempts once a transport is configured", async () => {
    // Same guard, opened: with credentials present the drain is allowed to try.
    // The queue is empty so no SMTP connection is made.
    process.env.SMTP_USER = "someone@example.test";
    process.env.SMTP_PASS = "app-password";
    dueRows = [];
    const summary = await drainOutboxBestEffort({ reason: "payment:deposit" });

    expect(summary).toMatchObject({ due: 0, sent: 0 });
    expect(storage.listDueOutbox).toHaveBeenCalled();
  });
});