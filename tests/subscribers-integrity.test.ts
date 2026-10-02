/**
 * Subscriber double-opt-in integration tests — REAL local Supabase, no
 * faked database. Same runner as payment-integrity:
 *   supabase start && supabase db reset
 *   npm run test:integrity
 *
 * Without TEST_* env vars the suite SKIPS with a notice — never a faked pass.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { POST as subscribe } from "@/app/api/subscribers/route";
import { GET as confirm } from "@/app/subscribe/confirm/route";
import { GET as unsubscribe } from "@/app/subscribe/unsubscribe/route";

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

if (!HAS_DB) {
  console.warn(
    "[subscribers-integrity] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

const EMAIL = "it-fix-subscriber@example.test";
const OTHER_IP = "203.0.113.44";

function postSubscribe(
  email: string,
  ip: string,
): Promise<Response> {
  return subscribe(
    new Request("http://localhost/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ email }),
    }),
  );
}

function link(url: string): Promise<Response> {
  const req = new Request(url);
  return url.includes("/unsubscribe") ? unsubscribe(req) : confirm(req);
}

describe.runIf(HAS_DB)("subscriber double opt-in (real local Supabase)", () => {
  let pg: Client;
  const savedEnv: Record<string, string | undefined> = {};

  async function row(): Promise<{
    status: string;
    confirm_token: string;
    unsub_token: string;
    confirmed_at: string | null;
    unsubscribed_at: string | null;
  } | null> {
    const r = await pg.query(
      "select status, confirm_token, unsub_token, confirmed_at, unsubscribed_at from public.subscribers where email = $1",
      [EMAIL],
    );
    return (r.rows[0] as never) ?? null;
  }

  async function emails(template: string): Promise<{ n: number; body: string | null }> {
    const count = await pg.query(
      "select count(*)::int as n from public.email_log where to_email = $1 and template = $2",
      [EMAIL, template],
    );
    // Newest body — used to extract the token a link actually shipped with.
    const newest = await pg.query(
      "select body from public.email_log where to_email = $1 and template = $2 order by created_at desc limit 1",
      [EMAIL, template],
    );
    return {
      n: (count.rows[0] as { n: number }).n,
      body: (newest.rows[0] as { body: string } | undefined)?.body ?? null,
    };
  }

  function tokenFrom(body: string | null, kind: "confirm" | "unsubscribe"): string {
    const match = body?.match(
      new RegExp(`/subscribe/${kind}\\?token=([A-Za-z0-9_-]+)`),
    );
    if (!match) throw new Error(`${kind} token not found in email body`);
    return match[1];
  }

  beforeAll(async () => {
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    // Determinism: no SMTP (emails land stubbed, still recorded) and the
    // rate limiter disabled-by-config (allowed) so the flow under test is
    // never throttled halfway through.
    for (const k of [
      "SMTP_USER",
      "SMTP_PASS",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "OWNER_NOTIFY_EMAIL",
    ]) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }

    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
    await pg.query("delete from public.subscribers where email = $1", [EMAIL]);
    await pg.query("delete from public.email_log where to_email = $1", [EMAIL]);
  }, 30_000);

  afterAll(async () => {
    await pg
      .query("delete from public.subscribers where email = $1", [EMAIL])
      .catch(() => undefined);
    await pg
      .query("delete from public.email_log where to_email = $1", [EMAIL])
      .catch(() => undefined);
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pg.end().catch(() => undefined);
  });

  it("full lifecycle: signup -> confirm -> re-request -> unsub -> re-subscribe", async () => {
    // (1) Mixed-case signup is normalized and lands as pending; the API
    //     answer is the same generic 202 no matter what happens inside.
    const signup = await postSubscribe(
      "It-Fix-Subscriber@Example.TEST",
      OTHER_IP,
    );
    expect(signup.status).toBe(202);
    expect((await signup.json()).status).toBe("pending_confirmation");
    expect(signup.headers.get("x-ratelimit-mode")).toBe(
      "disabled-missing-config",
    );

    let sub = await row();
    expect(sub?.status).toBe("pending");
    expect(sub?.confirm_token).toBeTruthy();
    expect(sub?.unsub_token).toBeTruthy();

    // The confirm link went out (stubbed — no SMTP — but honestly logged).
    const confirmMail = await emails("subscriber_confirm");
    expect(confirmMail.n).toBe(1);
    const confirmToken = tokenFrom(confirmMail.body, "confirm");

    // (2) Clicking the link confirms exactly once and sends the welcome
    //     email, which is the one carrying the unsubscribe link.
    const confirmed = await link(
      `http://localhost/subscribe/confirm?token=${confirmToken}`,
    );
    expect(confirmed.status).toBe(200);
    expect(await confirmed.text()).toContain("You are subscribed");

    sub = await row();
    expect(sub?.status).toBe("confirmed");
    expect(sub?.confirmed_at).toBeTruthy();

    const welcome = await emails("subscriber_welcome");
    expect(welcome.n).toBe(1);
    expect(welcome.body).toContain("/subscribe/unsubscribe?token=");
    const unsubToken = tokenFrom(welcome.body, "unsubscribe");

    // (3) Second click: idempotent page, NO second welcome email.
    const again = await link(
      `http://localhost/subscribe/confirm?token=${confirmToken}`,
    );
    expect(again.status).toBe(200);
    expect(await again.text()).toContain("already confirmed");
    expect((await emails("subscriber_welcome")).n).toBe(1);

    // (4) Signing up again while confirmed: same 202 (no enumeration),
    //     "already subscribed" mail with an unsubscribe link instead.
    const reRequest = await postSubscribe(EMAIL, OTHER_IP);
    expect(reRequest.status).toBe(202);
    expect((await reRequest.json()).status).toBe("pending_confirmation");
    expect((await emails("subscriber_already")).n).toBe(1);
    expect((await row())?.status).toBe("confirmed"); // unchanged

    // (5) Unsubscribe: one click, then idempotent.
    const un = await link(
      `http://localhost/subscribe/unsubscribe?token=${unsubToken}`,
    );
    expect(un.status).toBe(200);
    expect(await un.text()).toContain("unsubscribed");
    expect((await row())?.status).toBe("unsubscribed");
    expect((await row())?.unsubscribed_at).toBeTruthy();

    const unAgain = await link(
      `http://localhost/subscribe/unsubscribe?token=${unsubToken}`,
    );
    expect(unAgain.status).toBe(200);
    expect(await unAgain.text()).toContain("already unsubscribed");

    // (6) Re-subscribing: back to pending with FRESH tokens — every older
    //     link now honestly 404s.
    const reSub = await postSubscribe(EMAIL, OTHER_IP);
    expect(reSub.status).toBe(202);
    sub = await row();
    expect(sub?.status).toBe("pending");
    expect(sub?.unsubscribed_at).toBeNull();
    expect(sub?.confirm_token).not.toBe(confirmToken);

    const stale = await link(
      `http://localhost/subscribe/confirm?token=${confirmToken}`,
    );
    expect(stale.status).toBe(404);
    expect(await stale.text()).toContain("not valid");

    const freshMail = await emails("subscriber_confirm");
    expect(freshMail.n).toBe(2); // original + re-subscribe
    const freshToken = tokenFrom(freshMail.body, "confirm");
    const fresh = await link(
      `http://localhost/subscribe/confirm?token=${freshToken}`,
    );
    expect(fresh.status).toBe(200);
    expect((await row())?.status).toBe("confirmed");
  }, 30_000);

  it("unknown token -> honest 404 (never a fake success)", async () => {
    const res = await link(
      "http://localhost/subscribe/confirm?token=definitely-not-a-real-token",
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("not valid");
  });
});
