# Release Checklist — merge gate

**Nothing merges until every box below is ticked with evidence pasted into the
PR.** "It worked on my machine" is not evidence. Evidence means a screenshot,
a log excerpt, a dashboard row, or a command output that shows the **deployed
Vercel URL** — plus the date it was captured.

Merge order — the stack that shipped, all merged 2026-10-06:

1. PR #2 `feat/booking-payments` → `main` — intake, admin console, Pesapal checkout
2. PR #3 `feat/owner-cms` → `main` — editable photos and text
3. PR #4 `feat/trust-and-list` — guest voices, prepare guide email, mailing
   list. Also carries the `fix/payment-integrity` + `fix/abuse-protection`
   work folded into its chain.
4. PR #5 `feat/email-outbox` — transactional email outbox + the client-IP /
   login-limiter security fix + the daily-cron and Upstash-wire-format fixes
5. PR #6 `feat/vouchers` — gift vouchers through the Pesapal pipeline
6. PR #7 `feat/growth-pages` — `/for-groups` and `/stories`
7. PR #8 `fix/voucher-hardening` — delivered-code redaction, atomic voucher
   purchase, 400-not-500 on non-object JSON

Rules that mattered, for the next stack:

- **A stacked PR's base is its parent branch, not `main`.** Retarget it to
  `main` immediately *before* merging, and only once the parent has landed.
  Merging a child first drags the parent's commits into its diff; merging it
  after the parent is already in `main` keeps the diff to the child's own
  commits. Retargeting is idempotent — GitHub may offer it, and accepting it
  changes nothing.
- Merging an earlier PR automatically shrinks every later diff. Do not rebase a
  chain while its PRs are open; let the merge commits do the work.
- Un-draft each PR immediately before merging it, not in a batch up front, so
  the merge is a normal reviewed merge.

---

## 0. Per-PR pre-flight (every PR, before it leaves draft)

- [ ] CI green on the PR head commit (`lint`, `typecheck`, `test`, `build`).
- [ ] PR description matches what the branch actually does; no secret, key,
      password, or real customer detail in the diff or in a comment.
- [ ] `npm run test:integrity` green against a **local** stack
      (`supabase start` + `supabase db reset`) — these tests never fake a pass.
      Note this is **not** part of CI, and it is why `npm test` reports a block
      of *skipped* tests when Docker is not running. On the current `main` the
      baseline is `259 passed | 49 skipped` across 30 files; if you see more
      skips than that, the local stack was not up and the integrity gate did
      not actually run.
- [ ] Evidence comments for sections 1–5 pasted below (sections 1–5 can be
      satisfied once, on PR #2, and referenced by the later PRs — but each PR
      must link the evidence).

---

## 1. Supabase project created and every migration applied

- [ ] Hosted Supabase project exists; region and project ref recorded here:
      `ref: ______  region: ______`
- [ ] **All nine migrations applied, in order.** Order is load-bearing, not
      cosmetic: `…00003` creates a **4-argument** `apply_payment_completion`
      and `…00005` drops exactly that signature for a 5-argument one. Out of
      order, Postgres keeps both and every `.rpc()` call becomes an ambiguous
      overload at runtime.

  | # | Migration | What it creates |
  |---|-----------|-----------------|
  | 1 | `20261002000000_init_booking_schema.sql` | `bookings`, `payments`, `webhook_events`, `blocked_dates`, `settings`, `email_log` + the 4 enums + seeded settings |
  | 2 | `20261002000001_payment_redirect_url.sql` | `payments.redirect_url` |
  | 3 | `20261002000002_add_cms_storage.sql` | public `cms` Storage bucket (8 MB, jpeg/png/webp/avif) |
  | 4 | `20261002000003_payment_integrity.sql` | `btree_gist`, `bookings_no_overlap` EXCLUDE constraint, **4-arg** `apply_payment_completion` |
  | 5 | `20261002000004_subscribers.sql` | `subscribers` (double opt-in) |
  | 6 | `20261002000005_email_outbox.sql` | `email_outbox`, `claim_email_outbox`, `requeue_email_outbox`; **drops the 4-arg RPC** and installs the 5-arg one |
  | 7 | `20261002000006_vouchers.sql` | `voucher_requests`, `vouchers`, `payments.subject_kind`, `apply_voucher_completion`, `redeem_voucher` |
  | 8 | `20261002000007_growth_pages.sql` | `stories`, `group_inquiries` |
  | 9 | `20261002000008_voucher_hardening.sql` | `mark_email_outbox_sent` (redacts delivered voucher bodies in the DB), `create_voucher_purchase`, `voucher_request_for_payment` |

- [ ] Verified by running the checks below against the hosted project and
      pasting the output into the PR. Each `-- expect` line is the assertion.

```sql
-- 1. Twelve tables. expect exactly 12 rows.
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('blocked_dates','bookings','email_log','email_outbox',
                      'group_inquiries','payments','settings','stories',
                      'subscribers','voucher_requests','vouchers',
                      'webhook_events')
 order by table_name;

-- 2. RLS on every one of them, no policies (service_role bypasses).
--    expect 12 rows, rls_enabled = true, policies = 0 for each.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relname;

-- 3. The eight app RPCs. expect exactly 8 rows.
select proname from pg_proc
  join pg_namespace n on n.oid = pronamespace
 where n.nspname = 'public'
   and proname in ('apply_payment_completion','apply_voucher_completion',
                   'claim_email_outbox','create_voucher_purchase',
                   'mark_email_outbox_sent','redeem_voucher',
                   'requeue_email_outbox','voucher_request_for_payment')
 order by proname;

-- 4. THE TRAP: apply_payment_completion must exist exactly once, in its
--    5-argument form. Two rows here means the migrations ran out of order
--    and every .rpc() call is broken. expect exactly 1 row.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'apply_payment_completion';

-- 5. Overlap guard. expect 1 row, and 'validated' = true.
select conname, convalidated, pg_get_constraintdef(oid) as definition
  from pg_constraint where conname = 'bookings_no_overlap';

-- 6. The extension that constraint depends on. expect 1 row.
select extname, extversion from pg_extension where extname = 'btree_gist';

-- 7. Public photo bucket. expect 1 row.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets where id = 'cms';

-- 8. THE OTHER TRAP: the migration ledger. Repo filenames are
--    20261002000000..20261002000008. Both counts below MUST be 0, or a
--    later `supabase db push` will try to re-apply migrations that already
--    ran. expect 0 and 0.
with repo(version) as (values
  ('20261002000000'),('20261002000001'),('20261002000002'),('20261002000003'),
  ('20261002000004'),('20261002000005'),('20261002000006'),('20261002000007'),
  ('20261002000008'))
select
  (select count(*) from repo r where r.version not in
     (select version from supabase_migrations.schema_migrations))
    as repo_migrations_the_cli_would_reapply,
  (select count(*) from supabase_migrations.schema_migrations m
    where m.version not in (select version from repo))
    as ledger_rows_with_no_repo_file;
```

- **Operator note:** raw Postgres TCP to a hosted pooler is unreliable from this
  machine (auth completes, then the stream dies). Apply hosted SQL through the
  **Supabase MCP** tools (`apply_migration` for DDL, `execute_sql` for queries) —
  no PAT and no password needed — or failing that the **Management API**,
  `POST https://api.supabase.com/v1/projects/{ref}/database/query`. Not
  `psql`/`pg_dump`, and not `supabase db push` (that one requires `supabase
  link`, which points at a hosted project — for the *local* stack use
  `supabase db reset`).

- **⚠️ MCP ledger drift — read this before applying anything.** MCP's
  `apply_migration` *does* write `supabase_migrations.schema_migrations`, but it
  stamps each row with its **own wall-clock version** (e.g. `20261005152716`),
  not the migration filename. A ledger full of those matches none of the repo
  filenames, so check #8 above reports nine pending migrations and a later
  `supabase db push` tries to re-apply all of them, failing on
  `type already exists` / `column already exists`. After applying via MCP,
  repoint the ledger rows at the filename versions, then re-run check #8 until
  it returns `0 and 0`. Alternatively, adopt "hosted is MCP/SQL-editor only,
  never `db push`" and say so in writing.

**Evidence:** query output + project ref + date.

---

## 2. Every environment variable set in Vercel

Source of truth: `.env.example`. Set these in Vercel → Project → Settings →
Environment Variables (**Production**; add Preview/Development only if you want
local parity). Any `NEXT_PUBLIC_*` value requires a **redeploy** to take effect.

### Required — the site degrades honestly but is not usable without them

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SITE_URL` | Must be the real production origin (used in every email link) |
| `SUPABASE_URL` | Hosted project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never exposed to the client |
| `CRON_SECRET` | Authorises the email outbox processor (`/api/cron/email-outbox`); without it the route refuses with 503 and queued payment mail never drains on a schedule |
| `PESAPAL_ENV` | `sandbox` until go-live is signed off |
| `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` | From the Pesapal dashboard |
| `PESAPAL_IPN_URL` | Must equal the IPN URL registered in Pesapal (see §3) |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `587`. Code defaults exist, but set them explicitly so a mistake cannot silently point at a dead relay |
| `SMTP_USER` / `SMTP_PASS` | Gmail **app password**, not the account password |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` | Password min 12 chars; secret `openssl rand -hex 32` |

- **Set both Production and Preview.** Preview builds are where the admin
  console gets exercised (§5), and a Preview-scope-only var looks fine locally
  while the deployed preview is broken.
- **Do not prefix a secret with `NEXT_PUBLIC_`.** That inlines it into the
  browser bundle.
- **⚠️ Do not "improve" the cron in `vercel.json`.** It ships
  `"schedule": "0 8 * * *"` (daily, 08:00 UTC) and that is deliberate: the
  project is on Vercel's Hobby plan, which **rejects any cron firing more than
  once per day, and rejects it by failing the entire deployment**. Worse, for
  git-push deploys the failure is *silent* — no deployment object is created, so
  nothing appears in the dashboard's failed list and the branch just silently
  stops getting previews. Setting it back to `*/5 * * * *` requires a Pro plan
  ($20/mo). Until then, mail drains at the daily tick, on a manual
  `POST /api/cron/email-outbox`, or immediately via **Resend** in
  `/admin/emails`.

### Owner details — feature stays hidden/empty until set

| Variable | If unset |
|----------|----------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Floating WhatsApp button hidden |
| `OWNER_NOTIFY_EMAIL` | Booking/payment notifications go nowhere |

### Abuse protection — optional, but **disabled loudly** when missing

| Variable | If unset |
|----------|----------|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting off: one `console.warn` per process + `x-ratelimit-mode: disabled-missing-config` on every response. **In production `/admin/login` instead answers 503 `rate_limiter_unavailable`** — so this is a launch blocker, not a nice-to-have |
| `ALLOW_UNTHROTTLED_ADMIN` | `1` accepts unthrottled admin logins (the explicit, auditable override for the row above). Leave empty |
| `TRUST_CLOUDFLARE_IP` | Leave **empty** unless Cloudflare really proxies the domain. `1` makes the limiter trust `cf-connecting-ip`; on plain Vercel that header is client-settable, which would let an attacker choose its own rate-limit bucket |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile off: `x-turnstile-mode: disabled-missing-keys` |

- **⚠️ The limiter speaks Upstash's JSON REST format, not a command string.**
  `lib/rate-limit.ts` posts a JSON array of argument arrays to `{url}/pipeline`
  (`[["INCR",key],["EXPIRE",key,"900","NX"]]`). The Upstash REST API
  JSON-parses every request body, so a `text/plain` newline-separated body is
  rejected with `HTTP 400 invalid character ... looking for beginning of
  value` — which silently disables admin login (fail-closed → 503) while leaving
  every fail-open intake limit inert. This shipped broken once and only surfaced
  against a real database, because the in-repo test stub had encoded the same
  wrong format. `tests/rate-limit.test.ts` now pins the endpoint, content type
  and body shape; if you touch the limiter, run the suite and keep those tests
  green rather than trusting a green build.

- [ ] Every variable above is present in Vercel Production (screenshot of the
      list, values redacted — or the names only).
- [ ] Sitewide health check after redeploy: hit `/apply` and `/admin` on the
      deployed URL and paste the response headers showing **no**
      `disabled-missing-config` / `disabled-missing-keys` headers.

**Evidence:** variable-name list + header check + date.

---

## 3. Pesapal sandbox: deposit **and** balance, with the IPN URL registered

- [ ] `PESAPAL_IPN_URL` in Vercel is byte-identical to the URL registered in the
      Pesapal dashboard, and it is the deployed endpoint:
      `https://<production-domain>/api/payments/ipn`
- [ ] `CRON_SECRET` set, so the email outbox processor can run (see §2)
- [ ] **Deposit test** — full loop on the deployed site:
      - [ ] Guest submits `/apply` → booking row created (paste booking id)
      - [ ] Admin approves → Approve button produces a real Pesapal checkout
            link (paste the link host, not the token)
      - [ ] Payment completed in sandbox → booking `paid`, deposit recorded
      - [ ] `/admin/emails` shows the payment email queued in the **outbox**
            (status pending → sent), not lost
      - [ ] Guest received the deposit confirmation email
      - [ ] **Prepare guide email arrived** (PR #4 only — queued on
            `payment.kind === "deposit"`)
- [ ] **Balance test** — same loop for the balance payment
      (`payment.kind === "balance"`), including the balance-paid email.
- [ ] **Idempotency** — replay the same IPN delivery (Pesapal dashboard → IPN
      history → resend) and paste evidence that nothing double-applied: one
      `webhook_events` claim, one payment completion, no second email.
- [ ] **Overlap guard** (payment-integrity work) — approve a booking whose dates
      overlap an existing one and paste the **409 `overlapping_booking`** response.
- [ ] Vercel function logs for the IPN show no errors during the tests.

**Evidence:** booking ids, Pesapal IPN history screenshot, `payments` /
`webhook_events` / `email_log` rows, guest inbox screenshot.

---

## 4. A real test email actually received

Delivery is the only proof that SMTP works. `email_log.status = stubbed` means
**not sent** — that is a failure for this section.

- [ ] Booking deposit confirmation received in a real inbox (not the log table)
- [ ] Prepare guide email received, and its content matches `/prepare`
- [ ] Balance-paid email received
- [ ] Mailing list round trip on production:
      - [ ] Footer signup → confirm email received
      - [ ] Confirm link opens the branded page (`/subscribe/confirm`)
      - [ ] Welcome email received **with a working unsubscribe link**
      - [ ] Unsubscribe link works; a second click is honestly idempotent
      - [ ] `email_log` shows `status = sent` for each of the above
- [ ] Sender address and links are correct (`NEXT_PUBLIC_SITE_URL`, no
      `localhost`, no placeholder phone number, no prices in the prepare guide)

**Evidence:** inbox screenshots per email + `email_log` rows showing `sent`.

---

## 5. Admin login works on the deployed site

- [ ] `/admin/login` accepts `ADMIN_USERNAME` / `ADMIN_PASSWORD` and lands on
      the console (paste the resulting URL + response)
- [ ] Session survives a page reload and a new tab
- [ ] Console loads real data: bookings list, dates, settings, emails
- [ ] An approve action from the deployed console completes (see §3)
- [ ] Rate limiting behaves: 6 rapid bad logins → `429` with `Retry-After`
      (proves `UPSTASH_*` are live, not silently disabled)
- [ ] Wrong password gives a generic error that does not reveal whether the
      username exists

**Evidence:** screenshots + the `429` response headers.

---

## 6. Merge authorization

- [ ] Sections 1–5 complete, with evidence pasted in **this** PR (or linked from
      the PR that captured it).
- [ ] Owner has reviewed the diffs for the content locks: no
      `0706559119` anywhere, prices only USD 2,200/3,600 · 4,500/7,200 ·
      10,000 + 1,500, deposit 50%, no invented testimonials, no shop.
- [ ] Undrafted, then merged **in order** (#2 → #8), each stacked PR retargeted
      to `main` after its parent landed.
- [ ] Post-merge smoke test on `main`: `/`, `/apply`, `/prepare`, `/admin/login`,
      one sandbox payment.

### If something must be rolled back

- Vercel: Project → Deployments → promote the previous deployment (instant).
- Migrations are additive and forward-only; do **not** hand-edit hosted rows to
  force a payment to `paid` — re-run the IPN instead (it is idempotent).
- Never commit real credentials; rotate any secret that was pasted in a PR,
  comment, or screenshot.