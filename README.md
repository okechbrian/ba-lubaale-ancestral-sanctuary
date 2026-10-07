# Ba Lubaale Ancestral Sanctuary Kiwamirembe

Private ancestral sanctuary of vast land on the Ssese Islands, Lake Victoria, Uganda.

**Site job:** convert the right seeker into a screened application — not sell hotel nights.

This repo holds the locked brief and, as the CLI agent builds, the Next.js site.

| File | Role |
|---|---|
| [PASTE_TO_AGENT.md](./PASTE_TO_AGENT.md) | Exact text the owner pastes to start Phase 1 |
| [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) | Phase-by-phase build orders and stop gates |
| [AGENT.md](./AGENT.md) | Short handoff |
| [MASTER_PROMPT.md](./MASTER_PROMPT.md) | Binding constitution |
| [WEBSITE_MASTER_PLAN.md](./WEBSITE_MASTER_PLAN.md) | Architecture and build sequence |
| [DECISIONS.md](./DECISIONS.md) | Locked owner decisions |
| [PHOTO_INVENTORY.md](./PHOTO_INVENTORY.md) | Image map and page placement |

## Owner workflow (monitor only)

1. Paste the block in `PASTE_TO_AGENT.md` into the CLI agent.
2. When the agent stops, open `PHASE_REPORT.md` and tell Grok: `Phase 1 complete` (plus any errors).
3. Grok reviews and gives you the paste for the next phase.
4. Repeat through Phase 6. Do not let the agent run two phases in one sitting.

Images stay on the owner PC until copied into `/public`:

`C:\\Users\\y\\OneDrive\\Desktop\\New folder\\Maama Nalubaale`

Repo: https://github.com/okechbrian/ba-lubaale-ancestral-sanctuary

## Engineering setup (booking system, from 2 Oct 2026)

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill values (every key documents what
   happens when it is empty — the app never fakes an integration).
3. Create the Supabase project and apply every file in
   `supabase/migrations/` (SQL editor, or `supabase db push`). Put
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in env — server-only, never
   exposed to the browser (RLS is on with no policies).
4. Scripts: `npm run dev` · `lint` · `typecheck` · `test` · `build` ·
   `test:integrity` (payment-integrity integration tests against a REAL local
   database — first run `supabase start` + `supabase db reset`; without the
   stack the suite skips with a notice, it never fakes a pass).
   CI (`.github/workflows/ci.yml`) runs lint + test + build on every push/PR,
   with no secrets required.

| Missing credential | Honest behaviour (no fakes) |
|---|---|
| Supabase | `POST /api/bookings` → 503; apply form shows "temporarily unavailable" |
| Pesapal | Approve disabled with a banner; no payment links generated |
| Gmail SMTP | emails written to `email_log` as `stubbed`, shown as NOT SENT in admin |
| WhatsApp number | floating button hidden |
| Upstash (rate limiting) | outside production: disabled loudly (`x-ratelimit-mode: disabled-missing-config` + one warning per process). **In production `/admin/login` answers 503 `rate_limiter_unavailable`** rather than accept unlimited attempts — set the keys, or `ALLOW_UNTHROTTLED_ADMIN=1` to accept that risk explicitly |

### Abuse protection (rate limiting + client IP)

Per-IP limits live in Upstash Redis over plain REST (`lib/rate-limit.ts`):
admin login **5 / 15 min** (fail-closed), `POST /api/bookings` **3 / hour**
(fail-open), `POST /api/subscribers` **5 / 15 min** (fail-open). Every response
carries `x-ratelimit-mode`, `x-ratelimit-limit`, `x-ratelimit-remaining`, and
`Retry-After` when a request is actually limited, so the guard's state is
observable from a browser or `curl` without reading logs.

The bucket key comes from `lib/client-ip.ts`, which trusts **only headers the
platform rewrites**:

| Order | Source | Trusted because |
|---|---|---|
| 1 | `cf-connecting-ip`, `cf-real-ip` | **only** when `TRUST_CLOUDFLARE_IP=1` — Cloudflare overwrites them on its proxy |
| 2 | `x-vercel-forwarded-for` | written by the Vercel edge |
| 3 | `x-forwarded-for` **rightmost** entry | XFF is append-based; the platform appends the address it observed, so only the rightmost entry is outside client control |
| 4 | `x-real-ip` | only when not running on Vercel (`x-vercel-id` / `VERCEL=1` both count as "on Vercel") |

Leave `TRUST_CLOUDFLARE_IP` unset unless Cloudflare really proxies the domain:
on plain Vercel a client can send `cf-connecting-ip` itself and pick its own
bucket, which is exactly the bypass the tests in `tests/client-ip.test.ts` and
`tests/api-abuse.test.ts` now pin shut (rotating spoofed headers still lands in
one bucket and still gets a 429 on the 6th attempt).

### For groups (`/for-groups`)

The page tour operators and retreat leaders read. All copy is an ordinary CMS
block (Admin → Content → "For groups"), so it changes without a deploy; with no
database it renders the in-repo copy, which is the same page.

The enquiry form reuses the `/apply` abuse stack — rate limit 5 / 15 min per IP
(fail-open, loud when the limiter is unconfigured), a honeypot checked before
zod, then Turnstile after zod. The row in `group_inquiries` is the durable
record; the acknowledgement to the sender and the notification to the owner are
queued in `email_outbox`, so a slow mail server cannot lose an enquiry.

**No prices and no capacity numbers anywhere on the page** — a group visit is
quoted in conversation, and a figure written into the CMS would be one the site
invented. `tests/growth-content.test.ts` fails the build if one appears.

### Stories (`/stories`)

Owner-written notes in the `stories` table, edited at `/admin/stories`: slug
(auto-filled from the title, editable), title, excerpt, body, cover image + alt
text, and a `published` flag. Drafts never appear in the listing, on their own
page, or in the sitemap.

- `datePublished` is stamped the first time a story goes live and never moves,
  so unpublish/republish cannot back-date it.
- Each post page emits `schema.org/Article` JSON-LD with an absolute canonical
  URL. It omits `author` entirely when there is no byline and never emits
  `aggregateRating` or `review` — we publish nothing we have not measured.
- Published stories are appended to `sitemap.xml`. With no database those URLs
  are absent rather than present-and-broken.
- With no database the index says the archive is temporarily unavailable, and a
  story page 404s — an unknown slug, a draft and a missing database are all the
  same answer.

### Gift vouchers

`/vouchers` sells a fixed-amount voucher toward a stay, through the same Pesapal
hosted checkout the stays use. The amounts come from `/admin/settings` and
nowhere else — with none published the page says vouchers are not on sale, and
the server re-checks the requested amount so a tampered request cannot set a
price of its own.

- **The code** is 16 bytes of CSPRNG entropy (128 bits) rendered as
  `1A2B 3C4D …`. Only `SHA-256(code)` is stored; redemption hashes the pasted
  code in the app and compares in constant time, so a wrong code and an unknown
  code are indistinguishable. The buyer's copy arrives by email (plus an
  optional gift recipient), which is why the code also lives in the queued
  email body — after that transaction commits, the digest is all that is left
  and the code could never be recovered.
- **Issuance** happens in `apply_voucher_completion` — provider claim, payment
  completion, the code and the queued emails in one transaction. A replayed IPN
  is refused by the claim; a new event id for an already-paid voucher issues
  nothing (`first_completion = false`); and `vouchers.payment_id` is unique.
- **Redemption** is an owner action in `/admin/vouchers`: paste the code,
  choose the booking, mark it redeemed. A voucher cannot be redeemed twice or
  moved to another booking, and an unused one can be voided with a reason.

### Voucher hardening (three failure modes, closed)

1. **The code is redacted once delivered.** The code's only retrievable home is
   the queued email body — that is what makes a crash after the issuing
   transaction recoverable, since the digest alone cannot be reversed. After a
   confirmed send, `mark_email_outbox_sent` overwrites the body with
   `[redacted after delivery]` **in the same statement** that records success,
   for any `voucher*` category. It is a database function on purpose: a future
   caller using a plain `UPDATE` cannot skip it, and it cannot run before the
   send. Ordinary payment mail is untouched. So a leaked database backup cannot
   spend a buyer's voucher — only the owner's email can.

2. **A paid voucher that cannot be emailed fails, loudly.** The IPN needs
   `voucher_requests` for the buyer's address. If that row is missing,
   `requireVoucherRequest` throws, the webhook answers **503**, and Pesapal
   retries — the payment stays `initiated` and no code is issued. It used to
   log an error and ack 200, which claimed "settled and told" for a guest who
   was never told. And `create_voucher_purchase` now creates the payment and its
   request row in **one transaction**, so that state is unreachable through the
   normal checkout path.

3. **Non-object JSON bodies get a 400.** `/api/vouchers` and
   `/api/group-inquiries` read the honeypot before validating, so `null`,
   `"text"`, `42` and `[1,2]` were an uncaught `TypeError` (a 500). Both reject
   non-object bodies up front.

### Payment email outbox

Payment emails (deposit/balance confirmations, the how-to-prepare guide, the
owner notification) are **queued inside the transaction that settles the
payment** — `apply_payment_completion` writes them to `email_outbox` in the same
commit (`supabase/migrations/20261002000005_email_outbox.sql`). The IPN never
sends mail itself, which is what makes "payment settled, guest never told"
impossible: a crash after the commit leaves the mail queued, not lost.

A processor delivers the queue:

- **Route** — `GET|POST /api/cron/email-outbox`, called by Vercel Cron daily at
  08:00 UTC (`vercel.json`). Requires `Authorization: Bearer $CRON_SECRET`; with
  `CRON_SECRET` unset it refuses (503 `cron_secret_missing`) instead of being an
  open mail trigger.

Payment reconciliation (safety net for a lost IPN):

- **Route** - `GET|POST /api/cron/payment-reconcile`, Vercel Cron daily at 07:30
  UTC (an hour before the mail drain, so what it settles is delivered the same
  morning). Same `CRON_SECRET` bearer rule as above. It re-queries Pesapal for
  every payment still `initiated` after 30 minutes and settles through the same
  verified, atomic path as the IPN (`lib/payments/settle.ts`).
- **Admin** - `/admin/payments` lists stuck and failed payments with a
  **Re-check** button for an immediate answer instead of waiting for the tick.
  Nothing is ever marked paid except on Pesapal's confirmation of the exact
  amount.
- **Retries** — a failed send requeues with exponential backoff (2, 4, 8, 16, 32
  minutes, capped at 60). After 5 attempts the row is parked as `failed`, or
  immediately when SMTP is not configured at all.
- **Concurrency** — claiming is a database compare-and-set, so parallel cron
  ticks cannot send the same row twice. Delivery is at-least-once: a crash
  between "SMTP accepted it" and "row marked sent" resends on the next run.
- **Owner control** — `/admin/emails` lists the queue with status, attempts,
  last error and next retry, and a **Resend** button for failed rows (delivered
  rows cannot be resent).

> **Schedule is capped at once a day by the hosting plan.** Vercel's Hobby plan
> rejects any cron expression that fires more than once per day — and it rejects
> it by *failing the whole deployment*, silently for git pushes (no failed
> deployment is even created, so nothing shows up in the dashboard). `vercel.json`
> therefore ships `0 8 * * *`. Changing it back to `*/5 * * * *` requires a Pro
> plan ($20/mo); on Hobby, delivery happens at the daily tick, on the next manual
> `POST`, or immediately via Resend in `/admin/emails`. Queued rows are never lost
> either way.

### Payments (Pesapal, hosted checkout)

1. Create a Pesapal merchant/developer account (sandbox first:
   `https://cybqa.pesapal.com/pesapalv3/api`), copy the consumer key/secret
   into `.env.local`, set `PESAPAL_ENV=sandbox`, and set `PESAPAL_IPN_URL` to
   `https://<your-domain>/api/payments/ipn`.
2. The site registers that IPN URL itself (`URLSetup/GetIpnList` →
   `RegisterIPN`, cached) and creates orders via
   `Transactions/SubmitOrderRequest` in **UGX** at the owner-set rate from
   `/admin/settings`.
3. Approval flow: **Approve** creates the deposit checkout *first*, then
   marks the booking approved and emails the guest one message containing the
   hosted link (cards · MTN Momo · Airtel Money). Balance links appear after
   the deposit completes.
4. Payment confirmations are queued in `email_outbox` by the very transaction
   that settles the payment, then delivered by the outbox processor — set
   `CRON_SECRET` so the cron job can drain the queue (see "Payment email
   outbox").

**IPN security note (important):** Pesapal's v3 IPN has **no HMAC
signature** — anything could POST to it. The site therefore never trusts the
notification body: it looks up its own payment row by tracking id, **re-queries
`GetTransactionStatus` with our own bearer token**, cross-checks currency and
amount against the payment we created, binds on our unique payment id, claims
the event exactly once (`webhook_events` unique key) and only then completes
the payment. Mismatched or unknown events are acknowledged but never applied;
failed applies release the claim so retries work. Webhook bodies are stored
redacted (no card or phone data), and nothing payment-related is logged with
payer details.

### Owner CMS (content & photos)

`/admin/content` (admin login required) edits the words and photographs of the
site without a deploy: homepage gallery, FAQ, The Land, The Host, The Cave and
Atelier. Each block is a schema-driven form with reorderable lists, alt-text
fields and a photo picker fed by the repo library (`public/images`) **plus**
owner uploads stored in Supabase Storage's public `cms` bucket (client-side
resize to ≤2400px WebP; the API enforces type + 8 MB limits server-side).

- Saves go through `PUT /api/admin/content` and are validated against the
  block schema before writing — a bad save is rejected with field-level issues,
  never published.
- Anything untouched keeps the in-repo default; **Revert to default** clears an
  override.
- Public pages re-render within 60 seconds.
- Missing Supabase → saves and uploads fail honestly (`503`), the site keeps
  showing the committed content.

Prices stay in `/admin/settings`; policies and legal copy stay in the repo.

Change history: [CHANGELOG.md](./CHANGELOG.md).
