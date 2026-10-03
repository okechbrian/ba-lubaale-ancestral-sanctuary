# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Payment emails are now written inside the payment transaction, not sent
  from the webhook.** The IPN used to settle the payment and *then* email the
  guest — so a crash, deploy or timeout in that window left a **paid guest with
  no email and no record that anything was owed**. Migration
  `20261002000005_email_outbox.sql` adds an `email_outbox` table (`status`
  pending/sent/failed, `attempts`, `resends`, `last_error`, `next_attempt_at`)
  and extends `apply_payment_completion` with a `p_emails` parameter: the
  deposit/balance confirmations, the `prepare_guide_guest` guide and the owner
  notification are inserted **in the same commit** as the payment. Either the
  payment settles and the mail is durably queued, or nothing happened at all.
  A unique index on `(payment_id, category)` makes "one email per payment" a
  database guarantee, so a replayed webhook cannot queue a second copy.
- **An outbox processor delivers the queue, with retries and backoff.**
  `GET/POST /api/cron/email-outbox` drains due rows (wired to Vercel Cron every
  5 minutes via `vercel.json`). Claiming is a database compare-and-set
  (`claim_email_outbox`: `status='pending'` guard plus `attempts + 1` in one
  statement), so concurrent runs can never send the same row twice. Failures
  requeue with exponential backoff (2→4→8→16→32, capped at 60 minutes) and are
  parked as `failed` after 5 attempts — or immediately when SMTP is simply not
  configured, because retrying a configuration problem on a timer helps nobody.
  A missing `CRON_SECRET` refuses the route with 503 rather than exposing an
  open mail trigger to the internet. Delivery is honestly **at-least-once**: a
  processor killed between "SMTP accepted it" and "row marked sent" will resend,
  which is as close to exactly-once as SMTP allows.
- **Admin: an outbox panel with a Resend button** in `/admin/emails`, above the
  existing log. Each row shows its status, attempt count, human resend count,
  last error and next retry time. **Resend** (only on non-sent rows — the
  database refuses to requeue a delivered email) resets the attempt counter so
  the backoff starts fresh and delivers inline, so the owner sees the outcome on
  the same click instead of waiting for the next cron tick.

### Fixed

- **The booking honeypot is now actually enforced in the route.** The hidden
  `website` field previously only failed inside zod, and the generic 400
  echoed `issues: [{path: "website"}]` — telling bots exactly which field to
  leave empty. `POST /api/bookings` now checks the honeypot immediately after
  the rate limiter: a filled value logs a loud `console.warn` with the client
  IP, returns a generic 400 that never names the field, and stores nothing.
- **Payment completion is now one atomic database operation.** Migration
  `20261002000003_payment_integrity.sql` adds the `apply_payment_completion`
  RPC: webhook claim + payment completion + booking status transition commit
  in a SINGLE Postgres transaction. If any step fails, everything — the claim
  included — rolls back and the IPN returns 503, so Pesapal's retry re-applies
  from a clean slate; a duplicate delivery returns `claimed: false` and changes
  nothing. Confirmation emails run after commit (an SMTP failure logs, never
  half-commits a payment). The multi-statement "payment marked, booking stuck"
  window is gone.
- **Approved/paid bookings can never overlap.** `btree_gist` EXCLUDE
  constraint `bookings_no_overlap` on `daterange(check_in, check_out, '[)')`
  (half-open, matching the availability rules — back-to-back stays stay legal).
  Approving now pre-checks the window and returns a clear **409
  `overlapping_booking`** before any external call; a lost approval race hits
  the constraint itself and maps to the same 409 (`OverlappingBookingError`,
  SQLSTATE 23P01). Pending/declined requests remain exempt.
- **Integration tests on a real database (no fakes).**
  `tests/payment-integrity.test.ts` + `npm run test:integrity` run against the
  local Supabase stack (`supabase start` + `supabase db reset`): (1) a
  BEFORE UPDATE trigger fails the booking step after the payment step →
  asserts zero rows changed (payment still `initiated`, no claim), then the
  retry fully recovers (`completed` + `paid` + exactly one claim); (2) two
  overlapping approvals → route 409 + constraint rejection of the direct
  update + a back-to-back approval still succeeds. Without the env vars the
  suite skips with a notice — it never fakes a pass.

### Added

- **Guest voices on the homepage (admin-editable, never invented).** Three
  fixed testimonial slots in `settings` under `content:testimonials`
  (zod-validated, schema-strict), edited in Admin → Content with the blurb
  spelling out the rule: only real, said-out-loud quotes; a slot with an
  empty quote stays hidden and emptying all three removes the section
  entirely. The in-repo default is three empty slots, so nothing fake is ever
  published. Rendered as a `bg-dusk` section between the host block and the
  Immersions; revalidates within a minute like the other blocks.
- **"How to prepare" email, sent automatically when a deposit clears.**
  `content/prepare.ts` is now the single source for the `/prepare` page AND
  `howToPrepareGuest()` in `lib/email/templates.ts` - the guide email carries
  every section (arrival, pack/leave-behind lists, digital sunset,
  substance-free, food protocol, photography, important) verbatim plus links
  to `/prepare` and `/arrive`, so page and email can never drift apart.
  Triggered inside the IPN's `first_completion` block only for
  `kind === "deposit"`, in the same try/catch as the other confirmation
  emails (an SMTP failure logs, never fails the webhook). Covered by a real
  integration test: deposit IPN → exactly one `prepare_guide_guest` row in
  `email_log` (status `stubbed` without SMTP), duplicate delivery adds none.
- **Mailing list with double opt-in (footer signup box).**
  `POST /api/subscribers` (rate-limited 5 / 15 min per IP, **fail-open**,
  disabled loudly when Upstash keys are missing; honeypot checked before
  zod; no Turnstile - the confirm click is the spam brake) always answers
  the same generic **202 `pending_confirmation`** for any valid address, so
  nothing can be enumerated. Migration `20261002000004_subscribers.sql` adds
  `subscribers` (unique lowercased email, `pending/confirmed/unsubscribed`,
  separate confirm and unsubscribe tokens, RLS on with no policies). Flow:
  signup → confirm email → `GET /subscribe/confirm` flips to confirmed and
  sends the welcome email **which carries the unsubscribe link** →
  `GET /subscribe/unsubscribe` opts out in one click; both link routes are
  branded HTML with honest status codes (400 missing token, 404 unknown
  token, 503 no database, 500 on error) and `no-store`/`noindex`. Re-subscribing
  after unsubscribing rotates both tokens, so every older link honestly 404s.
  The box lives in the global footer (`components/SubscribeBox.tsx`) with the
  same hidden `website` honeypot as `/apply`. Lifecycle covered end-to-end on
  a real database (`tests/subscribers-integrity.test.ts`, runs in
  `npm run test:integrity`).
- **Rate limiting on the two public write endpoints** (Upstash Redis over
  plain REST — no SDK; host-agnostic, where Vercel KV would lock the site to
  Vercel): `/api/admin/login` 5 attempts / 15 min per IP, `POST /api/bookings`
  3 / hour per IP, bucketed per client IP (`lib/rate-limit.ts`). Documented
  failure policy: bookings **fail-open** during backend errors (intake stays
  up, `x-ratelimit-mode: fail-open`), admin login **fail-closed** (503
  `rate_limiter_unavailable` — brute-force protection wins). Missing
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` disables each bucket
  **loudly**: one `console.warn` per process plus an
  `x-ratelimit-mode: disabled-missing-config` header on every response —
  never a silent bypass, never a fake "enabled". 429 responses carry
  `Retry-After` and `retry_after`.
- **Cloudflare Turnstile on `/apply`, verified server-side.** The widget
  (explicit render, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) sends the token as
  `cf_turnstile_response`; `POST /api/bookings` verifies it against
  `https://challenges.cloudflare.com/turnstile/v0/siteverify` (the historical
  `siteverify.cloudflare.com` host no longer exists) **after** schema
  validation so an invalid form never burns the single-use token, and the
  client resets the widget after every failed submit. Enforcement requires
  BOTH keys (a secret without a sitekey would brick the form) and is
  fail-closed when configured: no token -> 403 `turnstile_required`,
  rejected -> 403 `turnstile_failed`, Cloudflare unreachable -> 503
  `turnstile_unavailable`. Missing keys disable verification **loudly**
  (`x-turnstile-mode: disabled-missing-keys` + warn) — an unverified token is
  only ever accepted when the feature is visibly off. Tests hit the real
  siteverify endpoint with Cloudflare's official always-pass/always-fail keys
  (no mocked captcha) and skip with a notice when the network is unavailable.
- **Owner CMS — content overrides (P2, foundation).** `lib/cms/` resolves
  owner-edited blocks from the `settings` table (`content:*` keys, zod-validated)
  and falls back to in-repo defaults when the database is missing **or** a saved
  value fails validation — a bad save can never publish broken content. Public
  pages re-render every 60 s (`revalidate`), so edits appear without redeploy.
- **FAQ is data-driven** (`content/faq.ts`, `app/faq/page.tsx` maps items with
  alternating section colours) and **homepage gallery moved to
  `content/moments.ts`** — `MomentsStrip` now takes `moments` as a prop.
  Both blocks are admin-editable at `/admin/content`.
- **Inline link syntax for owner copy:** `[label](/href)` in edited paragraphs
  renders as a link (`components/InlineText.tsx`); only `/relative` and
  `https://` hrefs are honoured — unsafe schemes render literally.
- **CMS tests** (`tests/cms.test.ts`): defaults validate, broken shapes are
  rejected, no-database fallback returns defaults, link parsing is safe.
- **Story pages are data-driven:** `/the-land`, `/the-host`, `/the-cave` and
  `/atelier` now render from `content/the-land.ts`, `content/the-host.ts`,
  `content/the-cave.ts`, `content/atelier.ts` (verbatim defaults, zod-typed
  schemas in `lib/cms/blocks.ts`) via `resolveContent` with 60 s revalidation.
  Every section heading, paragraph, card and image slot (src + alt) is an
  owner-editable field; layout, aspect ratios and anchors stay in the code.
  Prices, policies, FAQ-of-record and brand titles remain outside casual CMS
  reach (prices live in `/admin/settings`; policies stay in the repo).
- **Admin content editor (`/admin/content`).** One tab for every owner-editable
  block (homepage gallery, FAQ, The Land, The Host, The Cave, Atelier): a
  generic schema-driven form with reorderable lists, image pickers fed from the
  photo library (`public/images`), alt-text fields, dirty-state tracking and a
  "Revert to default" action. Saving goes through `PUT /api/admin/content`
  (admin session required) — the server validates against the block schema
  before writing, rejects bad shapes with field-level issues
  (`400 invalid_content`) and reports a missing database honestly
  (`503 database_not_configured`). `DELETE` clears an override so the site
  falls back to the in-repo content. Every write also validates client-side
  via `tests/api-content.test.ts` (auth, unknown keys, schema rejection,
  missing-DB behaviour).
- **CMS photo uploads (Supabase Storage).** `POST /api/admin/content/images`
  (admin session) stores owner photos in a public `cms` bucket
  (migration `20261002000002_add_cms_storage.sql`: 8 MB limit, jpeg/png/webp/
  avif, no write policies — service role only). Photos are downscaled in the
  browser to ≤2400px WebP before upload; the image picker merges repo photos
  with bucket uploads and gains an "Upload a new photo" button with honest
  error messages for size, type and missing database
  (`tests/api-images.test.ts`). `next.config.ts` allows `*.supabase.co`
  images.

- **Booking data layer (Supabase).** Migration `supabase/migrations/20261002000000_init_booking_schema.sql`
  defines `bookings`, `payments` (deposit/balance, unique completed rows per
  booking), `webhook_events` (idempotency), `blocked_dates`, `settings`
  (seeded with the live prices, 50% deposit, UGX rate) and `email_log`.
  RLS enabled on every table with no policies — the anon key sees nothing.
- **Typed server data layer** in `lib/db/` (`client`, `bookings`,
  `availability`, `payments`, `webhook-events`, `email-log`, `settings`,
  `types`). Missing `SUPABASE_*` env throws `DatabaseNotConfiguredError`
  instead of faking success.
- **Pure booking logic** in `lib/booking/`: half-open date-range availability
  (`assertAvailable` with named conflict days) and pricing that mirrors
  `/immersions` (USD 2,200 / 3,600 · 4,500 / 7,200 · 10,000 + 1,500,
  50% deposit, UGX conversion at an owner-editable rate).
- **Test harness:** Vitest (`npm test`, 3 suites: availability, pricing,
  missing-credential behaviour) and `npm run typecheck`.
- **CI:** `.github/workflows/ci.yml` runs lint, tests and build on every push
  and pull request — no secrets required.
- **`.env.example`** documents every key with its honest behaviour when empty
  (database → 503, payments → disabled approve, email → stored as `stubbed`).
- Dummy WhatsApp number `256700000000` wired via `NEXT_PUBLIC_WHATSAPP_NUMBER`
  (real number to be supplied by the owner; an empty value — or the example
  placeholder — hides the button).
- **Availability API.** `GET /api/availability` returns approved/paid date
  ranges plus owner-blocked days for the form calendar; 503 when the database
  is not configured.
- **Booking intake API.** `POST /api/bookings` validates the request with the
  same zod schema the form uses (`lib/booking/schema.ts`), re-checks dates
  against the database (409 with a named conflict day on overlap), stores the
  request, then emails the guest ("we received your request, nothing paid")
  and the owner (full answers for `/admin`). Honeypot field, 400/409/503/201
  status contract, never throws on email failure.
- **Date picker on `/apply`.** `components/DateRangePicker.tsx` — tap check-in
  then check-out on a month grid; taken/blocked days greyed out, half-open
  checkout semantics match the server. Native date inputs provided alongside.
- **Stay selector on `/apply`** (Essential / Master / whole-island buyout) —
  required so approvals can price correctly.
- **Email module** `lib/booking`→`lib/email/`: `EmailSender` interface with
  `GmailSmtpSender` (nodemailer) and `UnavailableEmailSender` (never pretends
  to send), `sendAndLog` always writes `email_log` (`sent`/`stubbed`/`failed`),
  templates for guest receipt + owner notification.
- **Admin console at `/admin`.** Session login (HMAC-signed 12h cookie,
  WebCrypto — verified in edge middleware and route handlers; missing
  `ADMIN_*` env fails closed), request list with status filters, full detail
  view, one-click **Approve** (prices from settings, stores total, emails the
  guest the deposit figures) and **Decline** (emails a short honest note).
- **Blocked-dates manager** (`/admin/dates`) — add/remove days nobody can
  request.
- **Settings editor** (`/admin/settings`) — stay prices, deposit %, UGX rate
  saved to the `settings` table; no code changes needed.
- **Email log viewer** (`/admin/emails`) — every notification with status
  (`sent`/`stubbed`/`failed`) and full body, so stubbed mail is obvious.
- **Transactional templates:** approved (total, deposit, hosted payment
  link) and declined (polite, no invented reasons).
- **Pesapal client** (`lib/payments/pesapal.ts`) for API 3.0 hosted checkout —
  verified endpoints (`Auth/RequestToken`, `URLSetup/GetIpnList` +
  `RegisterIPN`, `Transactions/SubmitOrderRequest`,
  `Transactions/GetTransactionStatus`), sandbox/live bases, token caching,
  401 refresh, timeouts. Missing credentials throw instead of faking links.
- **Checkout API** `POST /api/payments/checkout` (admin) — creates/reopens a
  deposit or balance attempt in UGX at the owner-set rate, stores the hosted
  URL (new `payments.redirect_url` column), and can email the link to the
  guest. Gates come from the pure `canCreateCheckout` state machine.
- **Idempotent IPN** `POST|GET /api/payments/ipn` — because Pesapal IPN has
  **no HMAC signature**, every event is re-verified with an authenticated
  `GetTransactionStatus` call plus currency/amount/reference checks,
  claimed exactly once (`webhook_events`), and only then applied; mismatch
  events are acked but never applied. **Approve** now creates the deposit
  checkout *first* (503 `payment_provider_unavailable` when Pesapal is
  unset — approve stays disabled), then emails the guest the link in the
  approval message itself.
- **Payment state machine** (`lib/payments/state.ts`) — pure, unit-tested:
  remote status mapping (0/2/3 → failed, 1 → completed), verification
  outcomes, booking transitions (deposit → paid; never resurrects
  pending/declined), checkout gates.
- **Confirmation emails:** deposit received (balance figure stated), balance
  received (fully paid + `/arrive` link), owner payment notification.
- **Admin payments panel** on the booking detail page — attempt history,
  create/resend deposit & balance links, copyable hosted URL; honest banner
  and disabled Approve when `PESAPAL_*` is missing.
- **`/pay/thankyou`** — post-checkout page that explicitly waits for verified
  confirmation instead of claiming success.
- **Floating WhatsApp button** (`components/WhatsAppButton.tsx`, rendered in the
  root layout) — links to `wa.me/<NEXT_PUBLIC_WHATSAPP_NUMBER>`; the shared
  `lib/whatsapp.ts#whatsappDigits` hides it entirely when the number is unset
  *or* still the documented example placeholder, so no dead link can ever be
  published. `/apply`'s WhatsApp fallback uses the same helper.
- **Image & video weight pass** (public/ ≈54 MB → ≈24 MB): the three 4000×3000
  photos (`forest-canopy`, `forest-lake-view`, `lake-house-alt`) re-encoded to
  2400×1800 q75 (≈6 MB each → ≈0.9 MB); `lake-house.mp4` re-encoded 1080p/92 s
  → 540p/24 fps no-audio (31 MB → 7 MB) and now ships with a poster frame,
  `preload="none"` and visible controls; `tortoise.mp4` re-encoded 640p → 1.9 MB.

### Removed

- Formspree submission and the `mailto:` fallback on `/apply` — intake now
  goes to the database; when it is unavailable the form says so honestly and
  offers WhatsApp instead.

### Notes

- `MASTER_PROMPT.md` earlier forbade databases/auth; the owner's booking
  brief (2 Oct 2026) supersedes that constraint — a note was added there.
