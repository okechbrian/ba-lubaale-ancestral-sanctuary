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

### Removed

- Formspree submission and the `mailto:` fallback on `/apply` — intake now
  goes to the database; when it is unavailable the form says so honestly and
  offers WhatsApp instead.

### Notes

- `MASTER_PROMPT.md` earlier forbade databases/auth; the owner's booking
  brief (2 Oct 2026) supersedes that constraint — a note was added there.
