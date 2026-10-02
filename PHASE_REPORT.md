# PHASE REPORT — clarity-gate

Branch `clarity-gate` from `origin/main` (`a236a2d`). No teaching-* branches used.

Gates: `npm run lint` → exit 0, 0 errors (2 pre-existing warnings: `components/MomentsStrip.tsx:183`, `scripts/compress-images.mjs:1`). `npm run build` → exit 0, 17/17 routes incl. `/arrive` and `/faq`; no `/teachings`.

Guards verified: nav untouched (`content/site.ts` unmodified), Hear her + film ids `0Soh_8nwBZc` / `ycERgjuSUNs` / `4bTrmRtg_WU` intact, `0706559119` absent.

## Task 1 — her voice on A Living Place

Files: `app/the-land/page.tsx` only (homepage does not repeat that block — no edit).

"It was passed to her in 1998." → "It was passed to me in 1998. I am the one telling the story." Lubaale of Ssese and Lake Nalubaale, 1998, more than a hundred caves, three open (Nalubaale, Musisi, Wanema), and host holding the door all kept. Block not turned into an inventory.

Check:

```
$ grep -n "passed to her" app/the-land/page.tsx app/page.tsx
(no matches — 0)
```

Commit: `53fa654 land: A Living Place inheritance told in her voice`

## Task 2 — Lake House has no rooms

Files: `app/the-land/page.tsx` (paragraph "Rooms sit over the water on stilts, and the lake is the only alarm." deleted). `app/page.tsx` and `app/immersions/page.tsx` had no bedroom wording — no edits. Stays already sleep in "A cottage"; nothing pointed at a Lake House room. Prices untouched.

Check:

```
$ grep -ni "room" app/the-land/page.tsx app/page.tsx app/immersions/page.tsx
(total matches: 0)
```

Commit: `94375ab land: Lake House keeps no rooms - bedroom line removed`

## Task 3 — starting prices on the existing cards

File: `app/page.tsx` only. Figures verified against `app/immersions/page.tsx` (USD 2,200 solo / USD 4,500 solo / USD 10,000 up to 4) before typing: Essential from USD 2,200 · Master from USD 4,500 · Buyout from USD 10,000. One line added: East Africa resident rates are on `/practices`. No fourth price.

Check:

```
$ grep -n "USD" app/page.tsx
381: Essential from USD 2,200
403: Master from USD 4,500
426: Buyout from USD 10,000
$ grep -n "resident rates" app/page.tsx
445: East Africa resident rates are on{" "}
```

Commit: `d8b095c home: starting prices on the three stay cards, resident rates line`

## Task 4 — /arrive

Files: `app/arrive/page.tsx` (new, prepare section pattern), `app/prepare/page.tsx` ("The journey →" link under Arrival), `components/Footer.tsx` (Sanctuary column), `app/sitemap.ts`. Not added to `content/site.ts` nav (file untouched). Content only: Entebbe, the ferry toward the Ssese Islands, then the sanctuary boat. No timetable, no ticket price, no dock name (no dock names exist anywhere on the site).

Check:

```
$ grep -nE "\b\d{1,2}:\d{2}\b|\b\d{1,2}\s?(am|pm)\b" app/arrive/page.tsx   → clock hits: 0
$ grep -nE "UGX|shilling|/=" app/arrive/page.tsx                           → fare hits: 0
$ git diff -- content/site.ts                                               → no changes
```

Commit: `9309655 arrive: Entebbe - ferry - sanctuary boat page, linked from prepare and footer`

## Task 5 — /faq

Files: `app/faq/page.tsx` (new, policies section pattern), `components/Footer.tsx`, `app/sitemap.ts`. Not in `content/site.ts` nav (untouched). Answers copied from /prepare and /policies: food (female visitors no chicken, no eggs), safety (not a clinic, no emergency care), what to bring (shoes off, phones down after dark), one household, photography forbidden in caves and shrines. Cancellation carries no figure: "Terms are confirmed in writing after approval." (`/policies` has 50% figures — none copied into the FAQ.)

Check:

```
$ grep -n "%" app/faq/page.tsx
(no matches — 0)
```

Commit: `3e5daa7 faq: answers gathered from prepare and policies, footer and sitemap link`

## Task 6 — apply sentence

File: `app/apply/page.tsx` only. Added under the intro: "If approved, a deposit link is sent by email. This form does not take payment." Boat warning kept. Every field and both checkboxes untouched.

Check:

```
register( calls: 14 (was 14) · schema keys: 14 · type="checkbox": 2
payment widgets (stripe|flutterwave|paystack|paypal|checkout): 0
"deposit link": 1 · "take payment": 1 · boat warning: 1
```

Commit: `0df9de7 apply: state that the form takes no payment, deposit link by email after approval`

## Task 7 — gates

`npm run lint && npm run build` → both exit 0 (17 routes, 0 type errors). This report overwritten with one section per task and the grep results above. Branch pushed to `origin/clarity-gate`.
