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
3. Create the Supabase project and apply
   `supabase/migrations/20261002000000_init_booking_schema.sql` (SQL editor, or
   `supabase db push`). Put `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in env —
   server-only, never exposed to the browser (RLS is on with no policies).
4. Scripts: `npm run dev` · `lint` · `typecheck` · `test` · `build`.
   CI (`.github/workflows/ci.yml`) runs lint + test + build on every push/PR,
   with no secrets required.

| Missing credential | Honest behaviour (no fakes) |
|---|---|
| Supabase | `POST /api/bookings` → 503; apply form shows "temporarily unavailable" |
| Pesapal | Approve disabled with a banner; no payment links generated |
| Gmail SMTP | emails written to `email_log` as `stubbed`, shown as NOT SENT in admin |
| WhatsApp number | floating button hidden |

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

Change history: [CHANGELOG.md](./CHANGELOG.md).
