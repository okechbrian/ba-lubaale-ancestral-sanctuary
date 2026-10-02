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

Change history: [CHANGELOG.md](./CHANGELOG.md).
