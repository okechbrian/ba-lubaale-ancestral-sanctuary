# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- **A delivered voucher code is overwritten in the database, not by app
  convention.** A voucher code lives in exactly one retrievable place — the
  queued email body — because after the issuing transaction commits the SHA-256
  digest is all that remains and the code could never be recovered from it. That
  is what makes a crash after commit recoverable, but it also meant anyone with
  database read access (a leak, a stale backup, a support query) could spend a
  buyer's voucher. `mark_email_outbox_sent` now overwrites the body with
  `[redacted after delivery]` **in the same statement that records the
  successful delivery**, for any `category` beginning with `voucher`. Doing it
  in SQL means the guarantee cannot be skipped by a future caller marking a row
  sent with a plain `UPDATE`, and cannot fire before the send. Ordinary payment
  mail keeps its body — it carries no secret. Verified against a real database:
  the code is present in the body handed to the transport, absent from
  `email_outbox` afterwards, absent from `email_log` at every point, and
  nothing the `/admin/emails` panel reads contains it (the only code-derived
  value anywhere is the 4-character hint on the voucher row).
- **A paid voucher with no `voucher_requests` row now fails loudly.** The IPN
  needs that row for the buyer's address, so it could not email the code — and
  the old path logged an error and still acked **200**, meaning "settled and
  told" for a guest who was never told. `completeVoucherPayment` now throws
  (`VoucherRequestMissingError`), the webhook answers **503**, Pesapal retries,
  and the payment stays `initiated` with no voucher issued. Verified: 503 +
  `ipn_failed`, payment untouched, zero vouchers; and once the row is restored
  the same payment completes normally.
- **A voucher purchase creates both rows in one transaction.** The payment and
  its `voucher_requests` row used to be two separate inserts, leaving a real
  window in which a crash produced a payment the IPN could never fulfil.
  `create_voucher_purchase` inserts both or neither, so "paid but nobody can be
  told" is a state the database can no longer reach. A duplicate `provider_ref`
  is proven to leave exactly one payment and one request, never two requests.
- **Non-object JSON bodies are a 400, not a 500.** `POST /api/vouchers` and
  `POST /api/group-inquiries` read the honeypot property before validating, so a
  body of `null`, `"text"`, `42` or `[1,2]` was a property access on a
  non-object and threw an uncaught `TypeError`. Both now reject a non-object
  body up front with the same honest 400 as unparseable JSON.

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

- **The admin login page told the owner their correct password was wrong.** The
  limiter had locked them out — a correct-credential login returned
  `429 {"error":"rate_limited","retry_after":716}` — and the page collapsed
  every error that was not `admin_not_configured` into "Wrong username or
  password.", discarding both the `Retry-After` header and the `retry_after`
  field. So a *temporary* refusal was reported as a *permanent* one, and every
  retry burned another of the five attempts, making the lockout worse. The
  public intake forms (`VoucherBuyForm`, `GroupInquiryForm`) already
  distinguished this case; the admin console was the odd one out.

  `/admin/login` now says "Too many attempts from this device. Your credentials
  are not the problem — try again in about N minutes", reads the real TTL from
  Redis so the countdown tracks the actual window, locks the form for that
  window instead of accepting clicks that each burn an attempt, unlocks itself
  when the window closes, and warns at two remaining attempts. `429` is also
  distinguished from the deliberate fail-closed `503`, which is now explained
  rather than mistaken for bad typing.

- **A successful login no longer spends the owner's rate-limit budget.** The
  counter has to be charged before the password can be checked — you cannot
  verify a guess without spending the attempt — so an owner who mistyped twice
  and then typed it correctly had still used three of five, and one more stray
  keystroke locked them out of their own console for fifteen minutes. The
  counter was conflating *failures* with *attempts*, and only failures are what
  the limit exists to stop. `refundRateLimit` now hands the hit back once the
  correct credentials have been supplied; nobody who is guessing can reach that
  path, so six wrong passwords in a row still lock the device out. `RateLimitDecision`
  gained `consumed` so a caller can only ever refund a window its own request
  actually charged, and the refund is best-effort by design — if Redis is
  unreachable the hit simply stands, which is the fail-closed direction for a
  security control.

- **The merge gate told you to verify the wrong things.** `RELEASE_CHECKLIST.md`
  had drifted well behind the schema it was supposed to gate: it listed **five**
  migrations when there are nine, and told you to expect **7 rows** from a
  seven-table query when the database now has **12 tables**. A reader who
  followed it literally would have "verified" a database that was missing
  `email_outbox`, `vouchers`, `voucher_requests`, `stories`, `group_inquiries`
  and `subscribers`, and would never have checked the eight RPCs at all. It
  also listed a merge order ending at #4, and omitted `SMTP_HOST`/`SMTP_PORT`.

  It now lists all nine migrations with what each creates, and flags the two
  traps the schema actually contains: `…00003` creates a **4-argument**
  `apply_payment_completion` that `…00005` must drop (out of order, the name
  becomes an ambiguous overload and every `.rpc()` breaks), and applying
  migrations through MCP leaves the ledger stamped with wall-clock versions
  that match no migration filename — so `supabase db push` tries to re-apply
  all nine. The verification block grew from one query to eight checks,
  including a ledger query that must return zero in *both* directions.

- **The rate limiter could not talk to a real Upstash database.** It posted
  `Content-Type: text/plain` with newline-separated commands
  (`INCR <key>` / `EXPIRE <key> 900 NX`), but the Upstash REST API JSON-parses
  every request body and answers that with
  `HTTP 400 invalid character 'I' looking for beginning of value`. With real
  `UPSTASH_REDIS_REST_*` values configured, every limit check therefore threw:
  - `POST /api/admin/login` → **503 `rate_limiter_unavailable`**. The admin
    console stayed unreachable even with correct credentials, because that
    bucket is deliberately fail-closed.
  - `POST /api/bookings`, `/api/subscribers`, `/api/group-inquiries`,
    `/api/vouchers` → fail-open, so they kept working but were **never actually
    rate-limited**. Five advertised limits were inert.

  The bug survived a green test suite because `tests/helpers/upstash-stub.ts`
  split the request body on newlines — the stub encoded the *same* wrong wire
  format as the code under test, so nothing ever disagreed with anything.
  `lib/rate-limit.ts` now posts a JSON array of argument arrays to `/pipeline`
  (`[["INCR",key],["EXPIRE",key,"900","NX"]]`, verified against a live database),
  which also carries `DEL` and `PTTL` on the same path instead of growing a
  second URL style. The stub now **rejects** a non-JSON body exactly as Upstash
  does, and `tests/rate-limit.test.ts` pins the endpoint, content type and body
  shape — so a future "simplification" back to plain text fails CI loudly instead
  of shipping silently. Reverting the fix locally turns 6 of those tests red.

- **The 5-minute outbox cron made every deployment on this branch fail.** Vercel's
  Hobby plan rejects any cron expression that fires more than once per day, and it
  rejects it by failing the **entire deployment** — including git pushes, where
  the failure is *silent*: no deployment is created, so nothing appears in the
  dashboard's failed list and a branch simply stops getting previews. `vercel.json`
  now ships `0 8 * * *` (daily, 08:00 UTC) instead of `*/5 * * * *`, which is the
  fastest schedule the current plan accepts. This is a hosting-plan limit, not a
  delivery-design change: the queue, its backoff and its at-least-once semantics
  are untouched, and a paid plan can restore the 5-minute schedule by editing one
  line. Until then the owner can also drain the queue on demand from the Resend
  button in `/admin/emails`.

- **The rate-limit bucket can no longer be chosen by the client.** The client IP
  was read from `cf-connecting-ip` first — but that header is only meaningful
  when Cloudflare proxies the request, and on plain Vercel **a client can send
  it itself**. Any bot could therefore mint a fresh bucket per attempt and walk
  straight past the admin login limit (5 / 15 min) and the intake limit.
  `lib/client-ip.ts` now trusts only what the platform rewrites:
  `cf-connecting-ip` / `cf-real-ip` **only** under the new explicit
  `TRUST_CLOUDFLARE_IP=1` flag, then `x-vercel-forwarded-for` (written by the
  Vercel edge), then the **rightmost** `x-forwarded-for` entry (XFF is
  append-based, so the rightmost hop is the one the client cannot pick — the old
  code took the *first* hop, the most attacker-controlled value in the header),
  then `x-real-ip` only when not on Vercel (`VERCEL=1` or an `x-vercel-id`
  header both count as Vercel). Values are validated as real IP literals —
  junk is discarded rather than trusted, and a header-less request lands in the
  shared `"unknown"` bucket instead of escaping throttling. New
  `tests/client-ip.test.ts` (17 cases) plus an end-to-end login test that
  rotates spoofed `cf-connecting-ip` / `x-real-ip` / left-most XFF on every
  attempt and asserts six hits against a **single** Redis key and a 429 on the
  sixth.
- **An unconfigured admin login guard now fails closed in production.** Missing
  `UPSTASH_*` keys used to disable throttling everywhere and merely warn — on a
  live site that means unlimited password attempts. In production
  (`VERCEL_ENV=production` / `NODE_ENV=production`) `/api/admin/login` now
  answers **503 `rate_limiter_unavailable`** with
  `x-ratelimit-mode: fail-closed-missing-config`, still warning loudly (the
  message names the bucket and both remedies). `ALLOW_UNTHROTTLED_ADMIN=1` is
  the explicit escape hatch; local dev, tests and previews keep the previous
  disabled-but-loud behaviour. Denials are now mapped by mode, so "the guard
  could not run" always returns 503 and only a real bucket overflow returns 429
  with `Retry-After`.

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

- **Gift vouchers, sold through the existing Pesapal pipeline.** `/vouchers`
  offers only the amounts the owner published in `/admin/settings`; with none
  configured the page and the API say vouchers are not on sale rather than
  inventing a price (the server re-checks the amount, so a tampered request
  cannot set its own). A voucher purchase is a payment row with no booking —
  migration `20261002000006_vouchers.sql` makes `payments.booking_id`
  nullable and adds `subject_kind`. The IPN takes a voucher branch and issues
  the code through `apply_voucher_completion`, which commits **claim +
  payment completion + the code + the queued emails** in one transaction.
- **Codes are 128 bits of CSPRNG output, stored hashed.** `lib/vouchers/code.ts`
  generates 16 random bytes rendered as eight hex groups (`1A2B 3C4D …`, an
  unambiguous alphabet), and stores only `SHA-256(code)` in `code_hash` — a
  database dump yields nothing redeemable. Lookup hashes in the app and matches
  on the digest, then verifies once more with `crypto.timingSafeEqual`, so a
  wrong code and an unknown code are indistinguishable and nothing
  short-circuits. The buyer receives the code by email (a second copy goes to an
  optional gift recipient); the owner's copy carries only the last four
  characters, so a voucher cannot be read out of the admin console or a
  database row.
- **Double-issue is impossible, three times over.** A replayed webhook is
  refused by the provider-event claim; a *different* event id for an
  already-completed payment finds `first_completion = false` and issues nothing;
  and `vouchers.payment_id` is unique as the final backstop against any
  interleaving. Verified against a real database with concurrent issue
  attempts (`tests/vouchers-integrity.test.ts`).
- **Owner redemption in `/admin/vouchers`.** Paste the code, choose the booking
  it pays for, mark it redeemed. The code is what gets submitted (never an id
  the browser could tamper with), the booking must exist and not be declined,
  and `redeem_voucher` only transitions `issued → redeemed`, so a voucher
  cannot be redeemed twice or re-pointed at another booking. An unused voucher
  can be voided with a reason. The page shows status, value, buyer, gift
  recipient and redemption, and only ever the code's last four characters.
- **`/for-groups` — tour operators and retreat leaders.** Every word is an
  ordinary CMS block (Admin → Content → "For groups"), edited without a deploy
  and re-rendered within a minute. The enquiry form reuses the `/apply` abuse
  stack in the same order: rate limit (5 / 15 min, fail-open, loud when
  disabled), honeypot **before** zod so a bot never learns a field name, schema
  validation, then Turnstile **after** zod so a malformed request never burns a
  single-use token. The enquiry row is the durable record; an acknowledgement to
  the sender and a notification to the owner are queued in `email_outbox`, so a
  broken mail server cannot lose an enquiry already received. The page carries
  **no prices, no capacity numbers and no availability promises** — a group visit
  is quoted in conversation, and `tests/growth-content.test.ts` fails if a figure,
  partner or testimonial ever appears in the copy.
- **`/stories` — an owner-written archive.** Posts live in Supabase
  (`stories`: slug, title, excerpt, body, cover image + alt, `published`,
  `published_at`), written in `/admin/stories` with the slug auto-filled from
  the title and the same image library/upload as the CMS picker. Drafts are
  invisible to the listing, the post page and the sitemap. `datePublished` is
  stamped the first time a story goes live and never moves afterwards, so
  unpublish/republish cannot back-date it. Each post emits `schema.org/Article`
  JSON-LD with an absolute canonical URL, deliberately **omitting** `author` when
  there is no byline (rather than crediting someone who did not write it) and
  never emitting `aggregateRating` or `review`. Published stories are appended to
  `sitemap.xml`; with no database the story URLs are simply absent, because a
  sitemap must never advertise a page that 404s.
- **Both degrade honestly without a database.** `/for-groups` falls back to its
  in-repo copy (the same page, and what the owner would see anyway); `/stories`
  says the archive is temporarily unavailable rather than showing an empty grid
  that reads as "we have never written anything"; a story page 404s, as do an
  unknown slug and a draft. The APIs answer an honest 503
  `database_not_configured` instead of accepting data they cannot store.
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
