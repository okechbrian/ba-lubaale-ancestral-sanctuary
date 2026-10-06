import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailOutboxRow } from "@/lib/db/types";

// The processor's storage layer is mocked so the retry/backoff/state machine is
// tested as pure logic. The real database path (claim CAS, backoff column,
// exactly-once queueing) is covered by tests/outbox-integrity.test.ts.
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

// Fake storage; `queue()` sets the rows the next claim will hand back.
const storage = {
  listDueOutbox: vi.fn<OutboxStorage["listDueOutbox"]>(
    async () => dueRows,
  ),
  claimOutboxRow: vi.fn<OutboxStorage["claimOutboxRow"]>(async (id) => {
    const found = dueRows.find((r) => r.id === id);
    // Mirrors claim_email_outbox: the queued row with the attempt counted.
    return found ? { ...found, attempts: found.attempts + 1 } : null;
  }),
  markOutboxSent: vi.fn<OutboxStorage["markOutboxSent"]>(async () => undefined),
  markOutboxFailed: vi.fn<OutboxStorage["markOutboxFailed"]>(
    async () => undefined,
  ),
} satisfies OutboxStorage;

vi.mock("@/lib/db/email-outbox", () => storage);

const {
  OUTBOX_MAX_ATTEMPTS,
  backoffDate,
  backoffMinutes,
  processEmailOutbox,
} = await import("@/lib/email/outbox");

const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

/** Rows the fake queue reports as due. */
let dueRows: EmailOutboxRow[] = [];

/** Queue rows for this test. */
function queue(...rows: EmailOutboxRow[]): void {
  dueRows = rows;
}

function row(overrides: Partial<EmailOutboxRow> = {}): EmailOutboxRow {
  return {
    id: "row-1",
    created_at: "2026-10-03T00:00:00.000Z",
    updated_at: "2026-10-03T00:00:00.000Z",
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
    next_attempt_at: "2026-10-03T00:00:00.000Z",
    sent_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  dueRows = [];
  // Restore the default behaviour: individual tests override one mock, and
  // mockClear alone would leave that override in place for the next test.
  storage.listDueOutbox.mockReset().mockImplementation(async () => dueRows);
  storage.claimOutboxRow.mockReset().mockImplementation(async (id: string) => {
    const found = dueRows.find((r) => r.id === id);
    // Mirrors claim_email_outbox: the queued row with the attempt counted.
    return found ? { ...found, attempts: found.attempts + 1 } : null;
  });
  storage.markOutboxSent.mockReset().mockResolvedValue(undefined);
  storage.markOutboxFailed.mockReset().mockResolvedValue(undefined);
  errorSpy.mockClear();
});

describe("backoff schedule", () => {
  it("doubles per attempt and caps at an hour", () => {
    expect([1, 2, 3, 4, 5, 6].map(backoffMinutes)).toEqual([2, 4, 8, 16, 32, 60]);
    expect(backoffMinutes(30)).toBe(60);
    expect(backoffMinutes(0)).toBe(2); // never a zero-delay retry storm
  });

  it("adds the delay to the given instant", () => {
    const from = new Date("2026-10-03T12:00:00.000Z");
    expect(backoffDate(3, from).toISOString()).toBe("2026-10-03T12:08:00.000Z");
  });
});

describe("processEmailOutbox — happy path", () => {
  it("sends due rows once each and marks them sent", async () => {
    queue(row({ id: "a" }), row({ id: "b" }));
    const send = vi.fn().mockResolvedValue({ delivered: true });

    const summary = await processEmailOutbox({ sender: send });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((c) => (c[0] as EmailOutboxRow).id)).toEqual([
      "a",
      "b",
    ]);
    expect(storage.markOutboxSent).toHaveBeenCalledTimes(2);
    expect(storage.markOutboxFailed).not.toHaveBeenCalled();
    expect(summary).toEqual({
      due: 2,
      claimed: 2,
      sent: 2,
      retrying: 0,
      failed: 0,
      skipped: 0,
    });
  });

  it("passes the queued recipient/subject/body to the transport", async () => {
    queue(row({ recipient: "guest@example.test", subject: "Confirmed", body: "Hi" }));
    const send = vi.fn().mockResolvedValue({ delivered: true });

    await processEmailOutbox({ sender: send });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: "guest@example.test",
        subject: "Confirmed",
        body: "Hi",
      }),
    );
  });
});

describe("processEmailOutbox — failures, retries and parking", () => {
  it("requeues a failed row with the exponential backoff", async () => {
    // One prior attempt queued => the claim makes it attempt 2 => 4 minutes.
    queue(row({ attempts: 1 }));
    const send = vi
      .fn()
      .mockResolvedValue({ delivered: false, error: "smtp_timeout" });
    const now = new Date("2026-10-03T12:00:00.000Z");

    const summary = await processEmailOutbox({ sender: send, now });

    expect(storage.markOutboxFailed).toHaveBeenCalledWith("row-1", "smtp_timeout", {
      terminal: false,
      nextAttemptAt: backoffDate(2, now).toISOString(),
    });
    expect(summary.retrying).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it("parks the row as failed once the attempt budget is spent", async () => {
    queue(row({ attempts: OUTBOX_MAX_ATTEMPTS - 1 }));
    const send = vi
      .fn()
      .mockResolvedValue({ delivered: false, error: "smtp_rejected" });

    const summary = await processEmailOutbox({ sender: send });

    expect(storage.markOutboxSent).not.toHaveBeenCalled();
    expect(storage.markOutboxFailed).toHaveBeenCalledWith(
      "row-1",
      "smtp_rejected",
      expect.objectContaining({ terminal: true }),
    );
    expect(summary.failed).toBe(1);
    expect(summary.retrying).toBe(0);
  });

  it("parks immediately when no mail server is configured (not a retry storm)", async () => {
    queue(row({ attempts: 1 }));
    const send = vi
      .fn()
      .mockResolvedValue({ delivered: false, error: "smtp_not_configured" });

    const summary = await processEmailOutbox({ sender: send });

    expect(storage.markOutboxFailed).toHaveBeenCalledWith(
      "row-1",
      "smtp_not_configured",
      expect.objectContaining({ terminal: true }),
    );
    expect(summary.failed).toBe(1);
  });

  it("treats a throwing transport as a failed delivery, not a dead queue", async () => {
    queue(row());
    const send = vi.fn().mockRejectedValue(new Error("socket hang up"));

    const summary = await processEmailOutbox({ sender: send });

    expect(storage.markOutboxSent).not.toHaveBeenCalled();
    expect(storage.markOutboxFailed).toHaveBeenCalledWith(
      "row-1",
      "socket hang up",
      expect.objectContaining({ terminal: false }),
    );
    expect(summary.retrying).toBe(1);
  });

  it("skips a row another processor already claimed", async () => {
    queue(row({ id: "mine" }), row({ id: "theirs" }));
    storage.claimOutboxRow.mockImplementation(async (id: string) =>
      id === "mine" ? row({ id, attempts: 1 }) : null,
    );
    const send = vi.fn().mockResolvedValue({ delivered: true });

    const summary = await processEmailOutbox({ sender: send });

    expect(send).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ due: 2, claimed: 1, skipped: 1, sent: 1 });
  });

  it("keeps draining after a row's bookkeeping fails", async () => {
    queue(row({ id: "bad" }), row({ id: "good" }));
    storage.markOutboxSent.mockImplementation(async (id) => {
      if (id === "bad") throw new Error("db write failed");
    });
    const send = vi.fn().mockResolvedValue({ delivered: true });

    const summary = await processEmailOutbox({ sender: send });

    expect(send).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ sent: 1, retrying: 1 });
  });

  it("skips a row whose claim itself fails", async () => {
    queue(row());
    storage.claimOutboxRow.mockRejectedValue(new Error("rest timeout"));
    const send = vi.fn();

    const summary = await processEmailOutbox({ sender: send });

    expect(send).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ due: 1, claimed: 0, skipped: 1 });
  });

  it("does nothing at all when the queue is empty", async () => {
    const send = vi.fn();
    const summary = await processEmailOutbox({ sender: send });
    expect(send).not.toHaveBeenCalled();
    expect(summary.due).toBe(0);
  });
});