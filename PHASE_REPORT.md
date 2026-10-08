# PHASE_REPORT — home-door

Branch: `home-door`
Branched from: `bb82dd761556fb86e694d6726611c403b258c824` ("Monthly fire circle")
Date: 2026-10-08

Scope: one door on the homepage. The sanctuary structure stays. No nav-group
redesign, no `/teachings` school, no members login, no shop, no testimonials,
no new price, no new cron.

---

## Task 1 — homepage fire circle, not the group page

**Control found?** No. There was no control on the homepage whose label was
about a circle and whose href was `/for-groups` — `/for-groups` did not appear
on the homepage at all. So the fallback applied: one short band was added.

```
$ rg -n "for-groups|fire-circle" app/page.tsx     # before this phase
(no output)
```

**Placed** as Section 8b: after the immersion cards (Section 8) and before the
Readiness Strip (Section 9), i.e. before the closing request. No existing
section was reordered.

The homepage now points at `/fire-circle` only. `/for-groups` remains the
in-person group enquiry and is untouched.

Copy is exact, as specified:

| Element | Copy |
|---|---|
| Overline | One evening a month |
| Heading | The fire circle |
| Body | Online. Queen Nalubaale speaks, then there are questions. No class, no recording, no chat. |
| Line | The next one is {nextFire} |
| Line | The amount is not on this page. She confirms it if she approves a seat. |
| Button | Request a seat → (`/fire-circle#request`) |

The date comes from the same helpers `/fire-circle` already uses —
`formatFireDate(nextFireSaturday())` imported from `@/lib/fire-circle/date` — so
the homepage cannot quote a different night than the page it sends the guest to.

No price. No "members". No payment widget.

---

## Task 2 — fire circle page overline

One word changed in `app/fire-circle/page.tsx`: the overline `Members` →
`Online`. There is no members area, and the page already says it is online in
the body copy.

The form, the four steps, and the "amount is not on this page" line are
untouched.

---

## Task 3 — her voice on the homepage

`components/HearHer.tsx` is rendered once on the homepage, immediately after the
Queen Nalubaale host block (Section 7 → Section 7a), which is the first
placement the instructions specify since that block exists.

- No route added.
- The film list is not duplicated by hand — the component reads
  `content/teaching.ts` exactly as it does on `/the-host`.
- The three films are untouched: `0Soh_8nwBZc`, `ycERgjuSUNs`, `4bTrmRtg_WU`.
- Click-to-play only, `youtube-nocookie` only, channel link intact.

`content/site.ts`, sanctuary dropdown only, one item added (it was not already
present):

```
label: Hear her
href: /the-host#hear-her
description: Three films. Her voice, not a course.
```

No fourth top-level nav group. The footer's existing "Hear Her Teachings"
films list is untouched.

**Note, not changed:** `components/HearHer.tsx` ends with "The class continues
on …". That wording predates this phase and is not mine to rewrite here, but it
is the one place the copy still speaks of a "class". Flagged for the owner
rather than silently reworded.

---

## Task 4 — guards, then stop

### Guards

```
$ rg -n "0706559119" app components content
exit_code=1 (no matches — phone absent)

$ rg -n "Members" app/fire-circle/page.tsx
exit_code=1 (no matches)

$ rg -n "/for-groups" app/page.tsx
exit_code=1 (no matches — homepage circle control is not /for-groups)

$ rg -n "HearHer" app/page.tsx
5:import { HearHer } from "@/components/HearHer";
291:      <HearHer />

$ rg -n "room" app/page.tsx app/fire-circle/page.tsx
exit_code=1 (no matches — no new room line)
```

All five match the expected results. The homepage band points at
`/fire-circle` (`app/page.tsx:433`).

### Gates

```
$ npm run lint
✖ 8 problems (0 errors, 8 warnings)

$ npm run typecheck
> tsc --noEmit      (clean)

$ npm test
Test Files  31 passed | 8 skipped (39)
Tests       343 passed | 67 skipped (410)

$ npm run build
✓ Compiled successfully
```

All four pass. The 8 lint warnings and the 67 skipped tests are pre-existing
baselines (unchanged from the base commit).

### One fix outside this phase's three files

`npm run lint` initially failed with **1 error**:

```
app/admin/fire-circle/page.tsx:15  Avoid constructing JSX within try/catch
```

This was **not caused by this phase.** Proven by stashing every change of mine
and linting the pristine base commit:

```
$ git stash push -u && npx eslint app/admin/fire-circle/page.tsx
✖ 1 problem (1 error, 0 warnings)
```

The error exists at `bb82dd7` with zero changes of mine. Since the gate was
required to pass and the file is part of the fire-circle surface, it was fixed
properly rather than suppressed: the data loading was moved into a `load()`
helper so the `try`/`catch` wraps only the `await`s, and the JSX is returned
outside it. The rendered output and the `DatabaseNotConfiguredError` fallback
behaviour are identical. This is also the correct fix — a `catch` around JSX
never catches render errors, so the original shape could not have done what it
appeared to do.

Files changed by this phase:

| File | Task |
|---|---|
| `app/page.tsx` | 1 (band), 3 (HearHer) |
| `app/fire-circle/page.tsx` | 2 |
| `content/site.ts` | 3 |
| `app/admin/fire-circle/page.tsx` | pre-existing lint fix (proven above) |

---

## Locks honoured

- Host titles unchanged: Queen Nalubaale / Mama Nalubaale; first-person voice
  preserved on the host block.
- `queennalubaale@gmail.com` untouched; `0706559119` absent; no WhatsApp number
  published.
- Films unchanged: the three existing ids only. No autoplay before a click.
  `youtube-nocookie` only.
- The fire circle has no public price; payment still happens after she approves.
- "room" does not appear on either page.
- Immersion prices not retyped — `2,200` / `4,500` / `10,000` left exactly where
  they were.
- No `/for-groups` merge, no new nav group, no new route, no new cron, no shop,
  no testimonials, no login.