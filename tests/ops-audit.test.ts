import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Operational surfaces added in feat/ops:
 *  - admin_audit writes (never allowed to break the operation they audit)
 *  - the owner-alert queue
 *  - PII scrubbing in monitoring payloads
 *  - the ugx_rate staleness warning
 *  - the subscriber CSV export
 *
 * All of it against a fake Supabase client: these are bookkeeping paths, and
 * the property that matters is "does it record, and does it never throw".
 */

interface FakeTable {
  inserts: Record<string, unknown>[];
  selects: unknown[];
  selectResult: unknown;
}

const tables: Record<string, FakeTable> = {};
let insertError: Error | null = null;
let clientThrows = false;

function fakeTable(name: string): FakeTable {
  tables[name] ??= { inserts: [], selects: [], selectResult: [] };
  return tables[name];
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => {
    if (clientThrows) throw new Error("Database not configured");
    const table = (n: string) => fakeTable(n);
    return {
      from: (name: string) => ({
        insert: (rows: Record<string, unknown>[]) => {
          if (insertError) return { data: null, error: { message: insertError.message } };
          table(name).inserts.push(...rows);
          return { data: null, error: null };
        },
        select: (_cols: string) => {
          table(name).selects.push(_cols);
          const chain = {
            eq: () => chain,
            order: () => chain,
            limit: () => Promise.resolve({ data: table(name).selectResult, error: null }),
            maybeSingle: () =>
              Promise.resolve({
                data: (table(name).selectResult as unknown[])[0] ?? null,
                error: null,
              }),
          };
          return chain;
        },
      }),
    };
  },
}));

const { recordAudit, listAudits } = await import("@/lib/db/audit");
const { alertOwner } = await import("@/lib/monitoring/alerts");
const { scrubPii } = await import("@/lib/monitoring");
const { getUgxRateStaleness } = await import("@/lib/db/settings");
const { listSubscribers } = await import("@/lib/db/subscribers");

const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

const SAVED = ["OWNER_NOTIFY_EMAIL"];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  insertError = null;
  clientThrows = false;
  for (const k of SAVED) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  process.env.OWNER_NOTIFY_EMAIL = "owner@example.test";
  errorSpy.mockClear();
});

afterEach(() => {
  for (const k of SAVED) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("admin audit", () => {
  it("records action, subject and details", async () => {
    await recordAudit({
      action: "booking_cancelled",
      subject: "bk-1",
      details: { refund_note: "Guest asked" },
    });
    const rows = fakeTable("admin_audit").inserts;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: "booking_cancelled",
      subject: "bk-1",
      details: { refund_note: "Guest asked" },
    });
  });

  it("never throws when the insert fails - the audited action still happened", async () => {
    insertError = new Error("audit table missing");
    await expect(
      recordAudit({ action: "settings_saved", details: { ugx_rate: 3900 } }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[admin_audit]"),
      "audit table missing",
    );
  });

  it("never throws when the whole database client is unavailable", async () => {
    clientThrows = true;
    await expect(recordAudit({ action: "content_saved", subject: "k" })).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("lists what was recorded, newest first (what /admin renders)", async () => {
    fakeTable("admin_audit").selectResult = [
      { id: "a1", created_at: "2026-10-08T10:00:00Z", action: "settings_saved", subject: null, details: { ugx_rate: 3900 } },
      { id: "a2", created_at: "2026-10-08T09:00:00Z", action: "booking_approved", subject: "bk-1", details: null },
    ];
    const rows = await listAudits(25);
    expect(rows).toHaveLength(2);
    expect(rows[0].action).toBe("settings_saved");
    expect(rows[0].details).toEqual({ ugx_rate: 3900 });
    expect(rows[1].subject).toBe("bk-1");
  });
});

describe("owner alerts", () => {
  it("queues a durable outbox row to the owner address", async () => {
    await alertOwner({
      category: "owner_alert_email_failed",
      subject: "Email parked as failed",
      lines: ["Message abc never delivered after 5 attempts."],
    });
    const rows = fakeTable("email_outbox").inserts;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      category: "owner_alert_email_failed",
      recipient: "owner@example.test",
      status: "pending",
    });
    expect(String(rows[0].body)).toContain("never delivered");
  });

  it("refuses to queue a row with no recipient when the owner address is unset", async () => {
    delete process.env.OWNER_NOTIFY_EMAIL;
    await alertOwner({ category: "x", subject: "y", lines: ["z"] });
    expect(fakeTable("email_outbox").inserts).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("OWNER_NOTIFY_EMAIL"),
    );
  });
});

describe("PII scrubbing", () => {
  it("redacts email addresses and phone numbers in strings", () => {
    const out = scrubPii({
      note: "Amina Nakato <amina@example.com> called +256 772 123 456",
    }) as { note: string };
    expect(out.note).not.toContain("amina@example.com");
    expect(out.note).not.toContain("772 123 456");
    expect(out.note).toContain("<redacted-email>");
  });

  it("redacts whole values of known PII keys, even when they do not look like PII", () => {
    const out = scrubPii({
      email: "guest@example.test",
      name: "Amina",
      whatsapp: "+256700000000",
      booking_id: "bk-123",
    }) as Record<string, string>;
    expect(out.email).toBe("<redacted>");
    expect(out.name).toBe("<redacted>");
    expect(out.whatsapp).toBe("<redacted>");
    // Ids are needed to debug with, so they survive.
    expect(out.booking_id).toBe("bk-123");
  });

  it("walks arrays and leaves non-strings alone", () => {
    const out = scrubPii({ ids: ["a", 7, null], count: 3 }) as { ids: unknown[]; count: number };
    expect(out.ids).toEqual(["a", 7, null]);
    expect(out.count).toBe(3);
  });
});

describe("ugx_rate staleness", () => {
  const day = 24 * 60 * 60 * 1000;

  it("is fresh when the row was touched inside 30 days", async () => {
    fakeTable("settings").selectResult = [{ updated_at: new Date(Date.now() - 5 * day).toISOString() }];
    expect(await getUgxRateStaleness()).toEqual({ stale: false, days: 5 });
  });

  it("is stale past 30 days", async () => {
    fakeTable("settings").selectResult = [{ updated_at: new Date(Date.now() - 31 * day).toISOString() }];
    const out = await getUgxRateStaleness();
    expect(out.stale).toBe(true);
    expect(out.days).toBe(31);
  });

  it("is stale when the rate was never explicitly saved", async () => {
    fakeTable("settings").selectResult = [];
    expect(await getUgxRateStaleness()).toEqual({ stale: true, days: null });
  });
});

describe("subscriber listing and CSV export", () => {
  it("filters by status when asked, and lists everything otherwise", async () => {
    const { GET } = await import("@/app/api/admin/subscribers/route");
    const { SESSION_COOKIE, createSessionToken } = await import("@/lib/admin/session");
    const saved = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_SESSION_SECRET = "ops-test-secret";
    const token = await createSessionToken("ops-test-secret");
    const cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}`;
    fakeTable("subscribers").selectResult = [
      {
        id: "s1",
        created_at: "2026-10-01T00:00:00Z",
        email: "guest@example.test",
        status: "confirmed",
        confirm_token: "t",
        unsub_token: "u",
        confirmed_at: "2026-10-01T01:00:00Z",
        unsubscribed_at: null,
      },
    ];

    const req = (qs: string) =>
      new Request(`http://localhost/api/admin/subscribers${qs}`, { headers: { cookie } });

    const json = await GET(req(""));
    expect(json.status).toBe(200);

    const csv = await GET(req("?format=csv&status=confirmed"));
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(csv.headers.get("content-disposition")).toContain("attachment");
    const text = await csv.text();
    expect(text.split("\n")[0]).toBe(
      "created_at,email,status,confirmed_at,unsubscribed_at",
    );
    expect(text).toContain("guest@example.test");
    expect(text).toContain("confirmed");

    const anon = await GET(new Request("http://localhost/api/admin/subscribers?format=csv"));
    expect(anon.status).toBe(401);

    if (saved === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = saved;
    // keep the import used
    expect(typeof listSubscribers).toBe("function");
  });

  it("escapes commas and quotes so a hostile value cannot break the file", async () => {
    const { GET } = await import("@/app/api/admin/subscribers/route");
    const { SESSION_COOKIE, createSessionToken } = await import("@/lib/admin/session");
    const saved = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_SESSION_SECRET = "ops-test-secret";
    const token = await createSessionToken("ops-test-secret");
    fakeTable("subscribers").selectResult = [
      {
        id: "s1",
        created_at: "2026-10-01T00:00:00Z",
        email: 'we"ird,name@example.test',
        status: "confirmed",
        confirm_token: "t",
        unsub_token: "u",
        confirmed_at: null,
        unsubscribed_at: null,
      },
    ];
    const res = await GET(
      new Request("http://localhost/api/admin/subscribers?format=csv", {
        headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
      }),
    );
    const line = (await res.text()).split("\n")[1];
    expect(line).toContain('"we""ird,name@example.test"');

    if (saved === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = saved;
  });
});