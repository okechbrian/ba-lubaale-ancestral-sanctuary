# Release Checklist — merge gate

**Nothing merges until every box below is ticked with evidence pasted into the
PR.** "It worked on my machine" is not evidence. Evidence means a screenshot,
a log excerpt, a dashboard row, or a command output that shows the **deployed
Vercel URL** — plus the date it was captured.

Merge order:

1. PR #2 `feat/booking-payments` → `main` — intake, admin console, Pesapal checkout
2. PR #3 `feat/owner-cms` → `main` — editable photos and text
3. PR #4 `feat/trust-and-list` → `feat/owner-cms` — guest voices, prepare guide
   email, mailing list (also carries `fix/payment-integrity` +
   `fix/abuse-protection`). Stacked on #3 **because** it depends on it and on the
   two fix commits; retarget it to `main` once #3 has merged.

Merging #2 first shrinks #3's diff automatically; do not rebase the chain while
PRs are open.

---

## 0. Per-PR pre-flight (every PR, before it leaves draft)

- [ ] CI green on the PR head commit (`lint`, `typecheck`, `test`, `build`).
- [ ] PR description matches what the branch actually does; no secret, key,
      password, or real customer detail in the diff or in a comment.
- [ ] `npm run test:integrity` green against a **local** stack
      (`supabase start` + `supabase db reset`) — these tests never fake a pass.
- [ ] Evidence comments for sections 1–5 pasted below (sections 1–5 can be
      satisfied once, on PR #2, and referenced by the later PRs — but each PR
      must link the evidence).

---

## 1. Supabase project created and every migration applied

- [ ] Hosted Supabase project exists; region and project ref recorded here:
      `ref: ______  region: ______`
- [ ] All five migrations applied **in order**:

  | # | Migration | What it creates |
  |---|-----------|-----------------|
  | 1 | `20261002000000_init_booking_schema.sql` | `bookings`, `payments`, `email_log`, `settings`, `blocked_dates`, availability |
  | 2 | `20261002000001_payment_redirect_url.sql` | payment redirect URL plumbing |
  | 3 | `20261002000002_add_cms_storage.sql` | public `cms` Storage bucket (8MB, jpeg/png/webp/avif) |
  | 4 | `20261002000003_payment_integrity.sql` | `apply_payment_completion` RPC + `bookings_no_overlap` EXCLUDE constraint |
  | 5 | `20261002000004_subscribers.sql` | `subscribers` table (RLS on, no policies) |

- [ ] Verified by running the check query below against the hosted project and
      pasting the output into the PR.

```sql
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('bookings','payments','webhook_events','email_log',
                      'settings','blocked_dates','subscribers')
 order by table_name;
-- expect exactly 7 rows

select proname from pg_proc
 where proname = 'apply_payment_completion';
-- expect 1 row

select conname from pg_constraint where conname = 'bookings_no_overlap';
-- expect 1 row
```

- **Operator note:** raw Postgres TCP to a hosted pooler is unreliable from this
  machine (auth completes, then the stream dies). Apply hosted SQL through the
  **Management API** — `POST https://api.supabase.com/v1/projects/{ref}/database/query`
  — not `psql`/`pg_dump`, and not `supabase db push` (that one requires
  `supabase link`, which points at a hosted project — for the *local* stack use
  `supabase db reset`).

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
| `PESAPAL_ENV` | `sandbox` until go-live is signed off |
| `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` | From the Pesapal dashboard |
| `PESAPAL_IPN_URL` | Must equal the IPN URL registered in Pesapal (see §3) |
| `SMTP_USER` / `SMTP_PASS` | Gmail app password (not the account password) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` | Password min 12 chars; secret `openssl rand -hex 32` |

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
- [ ] **Deposit test** — full loop on the deployed site:
      - [ ] Guest submits `/apply` → booking row created (paste booking id)
      - [ ] Admin approves → Approve button produces a real Pesapal checkout
            link (paste the link host, not the token)
      - [ ] Payment completed in sandbox → booking `paid`, deposit recorded
      - [ ] Guest received the deposit confirmation email
      - [ ] **Prepare guide email arrived** (PR #4 only — sent on
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
- [ ] Undrafted, then merged **in order** (#2 → #3 → #4).
- [ ] Post-merge smoke test on `main`: `/`, `/apply`, `/prepare`, `/admin/login`,
      one sandbox payment.

### If something must be rolled back

- Vercel: Project → Deployments → promote the previous deployment (instant).
- Migrations are additive and forward-only; do **not** hand-edit hosted rows to
  force a payment to `paid` — re-run the IPN instead (it is idempotent).
- Never commit real credentials; rotate any secret that was pasted in a PR,
  comment, or screenshot.