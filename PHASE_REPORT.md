# Phase 11 report — Content alignment (content-align)

Status: complete
Branch: content-align (from origin/main)
Source of truth: owner document "Ba Lubaale Ancestrial Sanctuary" (Sep 2026), cleaned English
Date: 27 Sep 2026

Gates:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

**Prices were not edited.** No figure on `/immersions` or `/practices` changed.
Verified unchanged in the diff: USD 2,200 / 3,600 / 4,500 / 7,200 / 10,000 /
+1,500 (max 8); resident and day rates on `/practices` untouched.

## Pages touched (copy only)

### 1. `/the-cave` (app/the-cave/page.tsx)
- Rewritten around: Ssese holds more than a hundred caves, only three open to
  guests; the rest are visited only after a calling and are never offered as
  a booking add-on (not listed).
- New section "The Three Open Chambers":
  - Nalubaale Chamber — Nalongo Nalubaale, twin mother, Queen and mother to
    creation; appeals for childbearing, marriage, prosperity; closeness
    requires deep spiritual and physical cleansing.
  - Lubaale Musisi Chamber — movement, waking from stagnation, earthquake;
    one sentence naming that the work may include his traditional diet (no
    diet menu, no how-to).
  - Lubaale Wanema Chamber — father of Mukasa; order; when nothing you do
    lands right.
- Etiquette kept unchanged: shoes off, no phones/photography, guided only,
  traditional work. Host-holds-the-door line kept on `/the-host`.
- Existing cave-mouth photo gallery kept as is — no new ritual-interior
  images added.
- Metadata description updated; anchor `#cave` now lands on the chambers.

### 2. `/the-land` (app/the-land/page.tsx)
- Tortoise named **Mutaka**, seen most afternoons (overview, card, video block).
- Forest copy aligned: tropical forest against grassland, ancient tree,
  spring rising in its roots, birds, monkeys, butterflies, the sound of water
  that is not always seen.
- Fireplace copy: evening conversation with the host and her people; the day
  is laid down before sleep.
- One sentence only on origin: "This living sanctuary was passed to her in 1998."

### 3. Homepage (app/page.tsx)
- Land intro: tropical forest against grassland, spring in the roots of an
  ancient tree, tortoise named Mutaka (seen most afternoons).
- "Who Is Welcomed" replaced three columns with seven short ones: Solitude
  Lovers, Couples, Families, Retreat Groups, Team Building, Ekyoto Kya Ba
  Kyaala, Seekers of Healing & Enrichment. Grid now `sm:grid-cols-2
  lg:grid-cols-4`. No "youth rehabilitation" wording anywhere.
- Kept: "not a party island, a drop-in lodge, or a clinical facility."
- Immersion cards re-aligned to the new inclusion lists; **eggs removed** from
  the buyout card ("farm milk, lake fish, herbs, and fruit") and the line
  "House food protocol still applies." added.
- Quote cite unchanged: "— Queen Nalubaale".

### 4. `/the-host` (app/the-host/page.tsx)
- H1 "Queen Nalubaale" + subline "Mama Nalubaale" unchanged.
- Bio in her voice now includes: Ssese origin; the place was given and she
  knowingly inherited the responsibility in August 1998; the work came from
  the women who kept it before her; Munyoro mother and grandmother, a
  princess of Tooro, who raised her early years (one paragraph, not a royal
  brochure); she works with voice, hands, breath, water, fire, wind, earth;
  no guarantees — she holds the door.

### 5. `/immersions` (app/immersions/page.tsx) — inclusions only
- Essential (3 days / 2 nights): cottage; two Lake House readings —
  diagnostic and fish feeding; one cave healing session; daily root-water
  cleansing; fireplace release; cowrie talisman workshop.
- Master (5 days / 4 nights, duration unchanged): full sanctuary access;
  three Lake House sessions; two cave sessions (diagnostic and
  trauma-release); daily spring / root-water cleansing; fireplace release and
  arbitration; bark-cloth garment or wall hanging; custom herbal teas.
- Whole-island buyout: unlimited Lake House access; cave diagnostic and
  trauma-release; forest and spring; livestock and fireplace; unlimited
  one-on-one sessions and workshops of the group's choice; private cook using
  farm milk, lake fish, herbs, fruit. **Eggs removed**; note added: "House
  food protocol still applies."

### 6. `/prepare` (app/prepare/page.tsx)
- Added one short note: fish feeding and chamber work are guided by the host
  — never self-serve. Chambers are not presented as a menu.

### 7. Lint gate fix (required for `npm run lint` to pass)
- `components/Hero.tsx`, `components/MomentsStrip.tsx`: replaced the
  synchronous `setState` inside `useEffect` (react-hooks/set-state-in-effect
  errors, pre-existing on main) with a shared `useReducedMotion()` hook built
  on `useSyncExternalStore` (`components/useReducedMotion.ts`).
- Behaviour unchanged: same media query, same `false` server snapshot, same
  change listener. No palette, layout, or route change.

## Not changed (per locks)
- Stack, routes, palette, apply form fields, food protocol text on
  `/prepare` and `/policies`.
- Prices on `/immersions` and `/practices`.
- Title locks: Queen Nalubaale (public English) / Mama Nalubaale (Luganda
  honorific); she / first person when she speaks; no legal personal name; no
  TikTok.
- Female-visitor rule (no chicken, no eggs) unchanged; eggs are never
  advertised as a default meal.
- Application-gated, one household at a time.
- No "you will be changed", no "gods and goddesses of Africa" slogan, no
  guarantee language. Photography still forbidden in caves and shrines.
- Owner-document typos not copied: Ancestrial, holly, deliever, hypocrise,
  firm milk, back cloth, live syock. Banned-phrase scan over built HTML for
  all six pages: none.
