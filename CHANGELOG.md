# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

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
  (real number to be supplied by the owner; empty value hides the button).
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

### Removed

- Formspree submission and the `mailto:` fallback on `/apply` — intake now
  goes to the database; when it is unavailable the form says so honestly and
  offers WhatsApp instead.

### Notes

- `MASTER_PROMPT.md` earlier forbade databases/auth; the owner's booking
  brief (2 Oct 2026) supersedes that constraint — a note was added there.
