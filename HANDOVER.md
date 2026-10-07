# HANDOVER — Ba Lubaale Ancestral Sanctuary

**Read this first after restarting OpenCode.** Updated 2026-10-06, after the
whole stack merged to `main` and the hosted Supabase project was brought up.

Session memory (auto-loaded on every start) lives at
`C:\Users\y\.config\opencode\memory.md`; this file holds the *project-specific*
detail. If the two disagree, this file is newer.

This is a snapshot of state, not a plan of intent.

---

## 1. TL;DR — what is live, what is missing

**Live now.** PRs #1–#8 are merged, `main` is deployed to
`https://ba-lubaale-ancestral-sanctuary.vercel.app`, the hosted Supabase project
`isxppllxesfrvdqcxqun` carries all **nine** migrations, and ten environment
variables are set in Vercel. Admin login works against the real hosted database
with real rate limiting.

**Still missing, all of it waiting on credentials the assistant cannot obtain:**

| Missing | Consequence right now |
|---|---|
| Pesapal sandbox key/secret + IPN URL registered | Approve button disabled with a banner; `POST /api/vouchers` → `503 payment_provider_unavailable`. **No payment link is ever invented.** |
| Gmail app password (`SMTP_USER`/`SMTP_PASS`) | Every email is stored `status = stubbed`, `error = smtp_not_configured`, shown as NOT SENT in `/admin/emails` |
| The real WhatsApp number | Floating button stays hidden (`NEXT_PUBLIC_WHATSAPP_NUMBER` unset on purpose — the `256700000000` placeholder must never ship) |
| Turnstile keys (optional) | `/apply` unprotected, `x-turnstile-mode: disabled-missing-keys` |

Guest applications **do** work end-to-end: `POST /api/bookings` → `201`, row
visible on `/admin`. Nothing is lost while payments/email are off.

---

## 2. Repo state

```
main  556c005  Merge pull request #8 from okechbrian/fix/voucher-hardening
```

PRs #1–#8 all **merged** 2026-10-06. Merge order was #2 → #3 → #4 → #5 → #6 →
#7 → #8, with every stacked PR retargeted to `main` immediately before its own
merge. Full mapping in `RELEASE_CHECKLIST.md` (merge-order section).

Two fixes were made during the release and are worth knowing about, because
both were invisible until they hit real infrastructure — see §6.

`fix/voucher-hardening` is now fully merged into `main` and is redundant as a
local branch. All other feature branches are also merged.

### Gates on the current `main` tip

```
npm run lint        0 errors, 8 warnings (pre-existing <img> + unused-var)
npm run typecheck   clean
npm test            259 passed | 49 skipped (30 files)
npm run build       OK
```

The **49 skipped are the integrity suite**, which needs a real local Postgres.
It is not in CI and does not fake a pass. Docker was not reachable on this
machine on 2026-10-06, so `npm run test:integrity` had not been run since the
last full local-stack session. To run it: `supabase start` + `supabase db reset`
+ `npm run test:integrity`.

### Never commit

`.agents/`, `.claude/`, `skills-lock.json` are project-local tooling. They are
**not** in `.gitignore`, so `git add -A` will happily stage them. Stage by
explicit path.

---

## 3. Hosted Supabase — `isxppllxesfrvdqcxqun`

This is the live Ba Lubaale project. All nine migrations applied **in order**
via the Supabase MCP tools. Verified state:

- **12 tables**, RLS enabled on every one, **0 policies** each (service_role
  bypasses; anon is empirically blocked — `anon` sees 0 of 3 `settings` rows
  where `service_role` sees 3)
- **8 RPCs**, each with exactly one overload
- `bookings_no_overlap` EXCLUDE constraint, validated
- `btree_gist` 1.7 installed (in `public`)
- public `cms` storage bucket, 8 MB, jpeg/png/webp/avif
- all eight data tables currently hold **0 rows**

`RELEASE_CHECKLIST.md` §1 holds the exact verification queries and their
expected row counts. Re-run them after any schema change rather than trusting
this paragraph.

### The ledger trap (cost real time — do not repeat)

MCP's `apply_migration` writes `supabase_migrations.schema_migrations`, but it
stamps each row with its **own wall-clock version**, not the migration filename.
So the ledger ends up full of versions that match nothing in
`supabase/migrations/`, `supabase db push` decides all nine are pending, and
tries to re-apply every one — failing on `type already exists` /
`column already exists`.

Fixed here by repointing the nine rows to `20261002000000`–`20261002000008`.
`supabase db push` now reports in-sync. **After applying via MCP, always
re-point the ledger and verify both directions count zero.**

### Credentials

`.env.local` (gitignored) holds `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
The service-role key was shared in an OpenCode session transcript on
2026-10-06 — rotate it in the dashboard, then update `.env.local` and both
Vercel scopes.

---

## 4. Vercel — the deploy mechanism is GitHub, not the CLI

- Project `ba-lubaale-ancestral-sanctuary`, id
  `prj_o9V6q0DAbi8WC3nxn6B9EJKzY3mW`, team `okechbrian-5599s-projects`
- **The Git integration is what deploys.** Merging on GitHub produced all eight
  Production builds; every feature-branch push produces a Preview. Do **not**
  run `vercel deploy --prod` — it bypasses the workflow and creates a
  deployment nothing else can see in the PR.
- **Deployment Protection is ON** with Standard scope: Preview and
  per-deployment URLs 302 to Vercel SSO; the production alias stays public.
  `vercel curl <url>` authenticates through the existing CLI login and reaches
  protected deployments, which is how every pre-merge check in §6 was done. No
  automation-bypass token is currently configured.
- **Vercel Hobby plan: `vercel.json` ships `"schedule": "0 8 * * *"`** (daily).
  This is forced, not a preference — see §6.
- CLI: `npm install -g vercel`. `npx vercel` prints its result and then hangs.

### Environment variables set (Production **and** Preview)

```
SUPABASE_URL                    SUPABASE_SERVICE_ROLE_KEY
ADMIN_USERNAME                  ADMIN_PASSWORD
ADMIN_SESSION_SECRET            NEXT_PUBLIC_SITE_URL
OWNER_NOTIFY_EMAIL              CRON_SECRET
UPSTASH_REDIS_REST_URL          UPSTASH_REDIS_REST_TOKEN
```

`NEXT_PUBLIC_SITE_URL` is the production origin, **not** `localhost`.
`NEXT_PUBLIC_WHATSAPP_NUMBER` is deliberately unset. `TRUST_CLOUDFLARE_IP` and
`ALLOW_UNTHROTTLED_ADMIN` are deliberately unset — the second one is the escape
hatch that would disable brute-force protection on admin login.

Remember `NEXT_PUBLIC_*` is inlined at **build** time, so changing it needs a
redeploy, not just a save.

---

## 5. Open items

1. **Pesapal sandbox** — key, secret, and the IPN URL registered in their
   dashboard. Unblocks `RELEASE_CHECKLIST.md` §3 and therefore real payments.
2. **Gmail app password** — unblocks §4; until then nothing is actually sent.
3. **Real WhatsApp number** — the button stays hidden.
4. **Release evidence for §3/§4** — real inbox screenshots, `email_log` rows
   showing `sent`, Pesapal IPN replay proving idempotency.
5. **Two open Supabase advisor findings**, both deliberate and both recorded in
   the CHANGELOG: `function_search_path_mutable` on the 8 RPCs (reachable only
   by service_role, so low risk) and `btree_gist` living in `public` rather
   than `extensions`.
6. **Rotate the Supabase service-role key** (§3).

---

## 6. The two bugs that only appeared in production

Both are fixed, committed, and carry regression tests. They are documented here
because the *pattern* recurs: this codebase had green tests and a green build
while shipping code that had never spoken to a real service.

**The silent deploy blocker.** `vercel.json` requested a 5-minute cron. On
Hobby, Vercel rejects any sub-daily cron — and rejects it by failing the *entire
deployment*. For git pushes the failure is silent: no deployment object is
created, nothing shows in the dashboard, the branch just stops getting previews.
Four branches were un-deployable for this reason. Fixed by shipping
`0 8 * * *`. Documented in §2 of the checklist so nobody "improves" it back.

**The rate limiter could not talk to Upstash.** `lib/rate-limit.ts` posted
`Content-Type: text/plain` with newline-separated commands; the Upstash REST API
JSON-parses every body and answered `HTTP 400`. Consequences with real
credentials: admin login returned `503 rate_limiter_unavailable` (that bucket is
fail-closed by design), and five fail-open intake limits were inert while
reporting themselves as merely unconfigured.

It survived a green suite because `tests/helpers/upstash-stub.ts` split the body
on newlines - the stub encoded the **same wrong wire format as the code under
test**, so nothing ever disagreed with anything. The stub now rejects non-JSON
exactly as Upstash does, and `tests/rate-limit.test.ts` pins the endpoint,
content type and body shape. Reverting the fix turns six tests red.

The same trap bit again on 2026-10-07: the refund primitive needed `DECR`, the
stub did not implement it, and three tests failed in a way that looked like a
code bug and was actually a stub gap. Whenever new Redis commands are used,
extend the stub in the same commit.

Lesson worth keeping: a stub that reimplements a remote API from memory is a
test that can only ever confirm the code matches the stub.

---

## 7. Evidence captured 2026-10-06

For pasting into future PRs; re-verify rather than trusting these blindly.

**Hosted database** — 12 tables with RLS, 8 RPCs each with one overload,
`bookings_no_overlap` validated, `btree_gist` 1.7, public `cms` bucket, ledger
reporting 0 pending / 0 orphan rows.

**Vercel Production** (`https://ba-lubaale-ancestral-sanctuary.vercel.app`):

```
/ /apply /prepare /vouchers /for-groups /stories /faq        all 200
GET  /api/availability                                       {"ranges":[],"blocked":[],"today":"2026-10-06"}
POST /api/admin/login  (valid creds)                         200 {"ok":true}
     x-ratelimit-limit: 5 | x-ratelimit-mode: enabled | x-ratelimit-remaining: 4
GET  /admin /admin/settings /admin/emails                    200
     /admin/stories /admin/vouchers /admin/inquiries
GET  /api/admin/stories  (session)                           {"ok":true,"stories":[]}
GET  /api/admin/inquiries (session)                          {"ok":true,"inquiries":[]}
GET  /api/cron/email-outbox (no bearer)                      401 {"error":"unauthorized"}
POST /api/vouchers      (valid body, no PESAPAL)             503 {"error":"payment_provider_unavailable"}
bad logins 1-4                                              401, remaining 3,2,1,0
bad login  5                                                429 rate_limited, Retry-After: 807
bad login  6                                                429 rate_limited, Retry-After: 797
POST /api/bookings        (real intake)                      201, row visible on /admin
     email_log rows for that booking                        status=stubbed, error=smtp_not_configured
content lock (owner phone, see §9)                           absent from production homepage
```

The intake probe row was deleted afterwards; all tables are back to 0. The
`Retry-After` values counting down (807 → 797) prove the TTL is being read from
Upstash rather than hardcoded.

---

## 8. Locked out of /admin? Read this first

If the login form says **"Too many attempts from this device"** with a
countdown, nothing is wrong with your password — the brute-force limiter is
doing its job (5 attempts / 15 minutes, keyed on client IP). Wait for the
countdown; the form disables itself and re-enables when the window closes.

**A successful login no longer counts against the budget** (fixed 2026-10-07),
so ordinary typos can no longer lock you out. If you *are* locked out with the
correct password, something is genuinely wrong and worth checking:

```
# What the server actually says (one attempt, headers included)
curl -s -i -X POST https://ba-lubaale-ancestral-sanctuary.vercel.app/api/admin/login `
  -H "Content-Type: application/json" -d '{"username":"...","password":"..."}'
```

| Status | Meaning |
|---|---|
| `200 {"ok":true}` | Credentials are fine. Anything else you saw was a UI problem. |
| `401 invalid_credentials` | Username or password genuinely wrong. `x-ratelimit-remaining` shows how many attempts are left. |
| `429 rate_limited` | Temporary lockout. `retry_after` is the seconds remaining, read from Redis. |
| `503 rate_limiter_unavailable` | Upstash is unreachable. Deliberate: the console refuses to open unprotected. Check `UPSTASH_REDIS_REST_*`. |
| `503 admin_not_configured` | `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` missing in that environment. |

To clear a lockout immediately without waiting, delete the counter key for
your IP (the key is `rl:admin-login:<your-ip>`), e.g. via the Upstash console:

```
DEL rl:admin-login:<your-public-ip>
```

Never raise `ALLOW_UNTHROTTLED_ADMIN` to get unstuck — it disables brute-force
protection for the whole console, and the escape hatch exists for a
deliberate, temporary decision, not for convenience.

---

## 9. Gotchas learned the hard way

- **`vercel env pull` writes a live `VERCEL_OIDC_TOKEN` into the target file.**
  Delete it immediately after reading. Same for anything else it dumps.
- **`npx vercel` prints its output and then hangs.** `npm install -g vercel`
  fixes it. If it still hangs, wrap the call in a PowerShell job with a
  `Wait-Job -Timeout` and `Stop-Job`.
- **PowerShell `$args` is a reserved automatic variable.** Assigning to it
  silently corrupts argument splatting. Name it something else.
- PowerShell here-strings and `<` heredocs do not work in the tool shell — write
  message bodies to a file with the write tool and use `--body-file`.
- **Stale `.next/types/validator.ts` breaks `npm run typecheck`** with
  "Cannot find module '../../app/…/route.js'" for routes that only exist on
  another branch. Confirm `.next` is untracked with `git check-ignore`, then
  `Remove-Item -Recurse -Force .next`.
- **The integrity suites run in parallel workers against ONE local database.**
  Never delete fixtures mid-run, and never call the global `processEmailOutbox`
  from a test that counts rows — it drains the shared queue and races the other
  files.
- **`gh pr view --json body` round-trips badly through the console** (mojibake,
  line-collapse). Read bodies into a **file** (`gh pr view N --json body --jq .body > f.md`)
  and edit them with the write tool.
- Reserved SQL words: `window` must be quoted as `"window"` (migration
  `…00007`).
- Never echo, print or paste a key, token or password — including into chat.
  Read secrets from `.env.local` inside a command and print only their length.
- `opencode mcp auth <name>` is interactive; answer it non-interactively with
  `"`n" | opencode mcp auth supabase` or via `Start-Process cmd.exe`.

---

## 10. Security decisions worth preserving

- **Client IP** (`lib/client-ip.ts`): `cf-connecting-ip` trusted **only** under
  `TRUST_CLOUDFLARE_IP=1`; else `x-vercel-forwarded-for`, then the **rightmost**
  `x-forwarded-for` hop (append-based, so the rightmost is the only
  client-unchangeable one); `x-real-ip` only off Vercel. Codes stored as
  `SHA-256`, compared with `timingSafeEqual`.
- **Rate limits**: admin login 5/15 min **fail-closed** (unconfigured Upstash in
  production → 503 unless `ALLOW_UNTHROTTLED_ADMIN=1`); bookings 3/hour
  fail-open; subscribers and group-inquiries 5/15 min fail-open. Missing keys
  are **disabled loudly**, never silently.
- **Turnstile** on `/apply`, `/api/vouchers`, `/api/group-inquiries`, verified
  **after** zod so a bad request never burns a single-use token; the honeypot is
  checked **before** zod so a bot never learns a field name.
- **Voucher codes**: 128 bits CSPRNG, stored only as a SHA-256 digest; the body
  is redacted **in the database** by `mark_email_outbox_sent` once delivery is
  confirmed; `vouchers.payment_id` is unique, closing double-issue three ways.
- **Content locks**: the owner's personal phone number must never appear anywhere
  user-facing (it is deliberately absent from the production homepage — checked
  2026-10-06); no invented testimonials, prices, capacity claims or partners;
  prices come only from settings. The number itself is written down once in
  `RELEASE_CHECKLIST.md` §6 and in three test files that assert its absence —
  do not copy it into new files, and note this repository is **public**.