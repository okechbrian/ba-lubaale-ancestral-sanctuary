# AGENT INSTRUCTIONS — execute one phase, then STOP

You are the CLI coding agent for **Ba Lubaale Ancestral Sanctuary Kiwamirembe**.

The human who started you will only **monitor** and **report each finished phase** to Grok. You do not wait for Grok inside the terminal. You finish the current phase, commit, write `PHASE_REPORT.md`, and STOP. Do not start the next phase until the owner pastes a new message that names that phase.

Constitution files in this repo (read all before writing code):

1. `DECISIONS.md`
2. `MASTER_PROMPT.md` (START … END block is binding)
3. `WEBSITE_MASTER_PLAN.md`
4. `PHOTO_INVENTORY.md`
5. This file

Conflict rule: `DECISIONS.md` + MASTER_PROMPT START/END win.

---

## Hard rules (every phase)

- Work inside this repo. Do not create a nested second project folder.
- Keep all `*.md` constitution files at the repo root.
- Stack: Next.js App Router + TypeScript + Tailwind CSS + Framer Motion (sparing) + React Hook Form + Zod.
- Content lives in `content/*.ts`. No CMS. No database. No auth. No shop. No booking engine. No blog. No i18n library.
- Host title: **Queen Nalubaale** (EN), **Mama Nalubaale** (LG). Voice: she / first person when she speaks. No legal personal name. No TikTok handles.
- Do not invent domain, email, WhatsApp number, or testimonials.
- Footer contact placeholders only: `hello@` and a WhatsApp slot with no number.
- Header language stub: `EN | LG`. EN active. LG is a button that does nothing, `aria-label="Luganda coming"`. Must not 404.
- Fonts: Fraunces (display) + Figtree (UI) via `next/font`. Never Inter + Playfair.
- Tokens:

```
--cream: #F4EDE0
--ink: #1A1814
--canopy: #2F4A3C
--dusk: #1B2A28
--bark: #C4A574
--ember: #B45A2A
--mist: #E7E1D4
```

- Motion: fade + 12–20px rise, 0.5–0.7s, once on scroll. No parallax. No cursor trail. No sound on autoplay.
- Legal lines must appear on Apply + Policies + Footer:

> Sessions here are traditional, energetic, and artisanal. They complement and do not replace medical or psychiatric care. The sanctuary does not provide emergency or clinical services.

> Photography and recording are not permitted inside the cave or shrines.

- Female-visitor food protocol (no chicken, no eggs) is published on `/prepare` and as a yes/no on the apply form. Plain. Respectful. No jokes.
- Images source (owner PC only):

`C:\\Users\\y\\OneDrive\\Desktop\\New folder\\Maama Nalubaale`

Rename into `/public/images` and `/public/video` using `PHOTO_INVENTORY.md`. Skip the “Do not use” list. Strip TikTok watermarks. Mute video.

- Do not dump all photos on the homepage. Follow the page-by-page inclusion plan in `PHOTO_INVENTORY.md`.
- Waterfall photo is pilgrimage context, not the 10-acre spring, unless a later owner message says otherwise.
- `npm run lint` and `npm run build` must pass before you declare a phase done.
- After each phase: commit on branch `phase-N-short-name`, push if the owner’s git remotes work, write/overwrite `PHASE_REPORT.md` using the template at the bottom, then STOP.

---

## Routes that must exist by the end of Phase 1 (empty is fine)

```
/
/the-land
/the-cave
/the-host
/immersions
/practices
/atelier
/prepare
/apply
/policies
```

Plus a branded `not-found`.

Nav wordmark:

```
BA LUBAALE
Ancestral Sanctuary · Kiwamirembe
```

Links: The Land, The Cave, Immersions, Atelier, Prepare  
Button: Request Immersion → `/apply`  
Far right: EN | LG

Footer: blessing line, Host, Practices, Policies, WhatsApp slot, Email slot, “Ssese Islands, Lake Victoria, Uganda”, both legal lines.

---

## PHASE 1 — Foundation

Create the Next.js app in this repo root (`npx create-next-app@latest` with App Router, TypeScript, Tailwind, ESLint, App directory, no src folder unless already created — prefer no `src/`).

Deliver:

- `app/layout.tsx` with fonts, tokens as CSS variables on `:root`, header, footer, metadata template `%s — Ba Lubaale Ancestral Sanctuary Kiwamirembe`
- `app/globals.css` with tokens, cream page ground, ink body text
- `components/Header.tsx` — sticky, solid after scroll, desktop nav + mobile full-screen drawer
- `components/Footer.tsx`
- `components/LanguageStub.tsx`
- Empty page files for every route above (short title + one sentence placeholder is allowed in Phase 1 only)
- `app/not-found.tsx` in the same voice
- `content/site.ts` with name, subtitle, place line, nav items, placeholder contacts (`email: "hello@"`, `whatsapp: ""`)
- `.gitignore` standard Next.js (do not commit `node_modules`, `.env`, raw photo dump)
- `.env.example` with `FORMSPREE_ENDPOINT=`

Do not design the real homepage yet. Do not copy all images yet. One placeholder image path is enough.

**Done when:** `npm run lint` and `npm run build` pass; every route returns 200; header and footer render on mobile and desktop.

**STOP.** Write `PHASE_REPORT.md`. Do not start Phase 2.

---

## PHASE 2 — Home

Build `app/page.tsx` in this exact section order. No extra sections.

1. Full-viewport hero. Image `hero-shore-gathering.jpg` with dusk overlay 40–55%. Overline: Ssese Islands · Lake Victoria · Uganda. H1: Ba Lubaale Ancestral Sanctuary. H2: Kiwamirembe. Deck: A living ancestral sanctuary of cave, craft, herd, and lake. Support: The Weaver’s Sanctuary & Sacred Caves. Primary CTA Request an Immersion → `/apply`. Secondary CTA Enter the Land → scroll to section 3. Microcopy: Private. Screened. One household at a time.
2. Host invitation first person: “I listen to the wave upon the shore, the breath within your chest, and the stories carried in the roots of this land. Welcome home to yourself.” Small portrait: `host-portrait-headwrap.jpg` (client rejected `host-portrait-cowrie.jpg`, 27 Sep 2026).
3. Four land gateways: Cave `og-cave-shore.jpg`; Lake House `arrival-boat.jpg` captioned as the water the house sits on, never labelled as the building; Forest spring `forest-roots.jpg`; Herd & fire `fire-night.jpg`.
4. Who is welcomed — three columns + exclusion: “This is not a party island, a drop-in lodge, or a clinical facility.”
5. Three acts: Arrival / Work / Return. Link → `/immersions`.
6. Craft as healing: `host-measuring-bark.jpg`, `bark-dresses-stand.jpg`, `cowrie-four.jpg`. Line: “You do not only speak the intention. You weave it, sew it, and carry it home.” Link → `/atelier`.
7. Host block — Queen Nalubaale · Mama Nalubaale, 80–120 words first person → `/the-host`. Use `host-atelier-seat.jpg` only if TikTok watermark is stripped; else `host-portrait-headwrap.jpg`. Never `host-portrait-cowrie.jpg` (client rejected it, 27 Sep 2026).
8. Three stay cards without full prices: Essential Healing Immersion 3 days; Master Transformation & Craft 5 days; Whole-island buyout. View details → `/immersions`.
9. Readiness strip → `/apply` and `/prepare`.
10. Neighbouring sacred geography as pilgrimage context off-property. Do not sell as included.
11. Closing `closing-shore.jpg` + Request an Immersion. Line: “Leave the noise. Sit by the fire. Breathe inside the stone.”

If images are not copied yet, use labelled placeholders with the final public filenames.

**STOP.** Write `PHASE_REPORT.md`. Do not start Phase 3.

---

## PHASE 3 — Inner pages

Build in order: land, cave, host, immersions, practices, atelier, prepare, policies, apply.

/the-host title: Queen Nalubaale. Honorific: Mama Nalubaale.
/immersions: international table only (USD 2,200 / 3,600; 4,500 / 7,200; buyout 10,000 + 1,500). Pointer line to resident rates on Practices.
/practices: heading “Resident & day sessions”. List from MASTER_PROMPT.
/prepare: include female-visitor food protocol in plain language.
/apply: all 14 fields visible (wiring may wait for Phase 4).

Prices, form fields, and policies are specified in MASTER_PROMPT.md. Follow them exactly.

**STOP.** Write `PHASE_REPORT.md`. Do not start Phase 4.

---

## PHASE 4 — Apply form wiring

React Hook Form + Zod. POST to FORMSPREE_ENDPOINT or mailto hello@. Success copy: “If there is a fit, we will write or WhatsApp within several days to arrange a short discovery conversation. Please do not book flights until we confirm the boat.” Both checkboxes required. No invented WhatsApp number. No booking calendar.

**STOP.** Write `PHASE_REPORT.md`. Do not start Phase 5.

---

## PHASE 5 — Media pass

Copy from `C:\\Users\\y\\OneDrive\\Desktop\\New folder\\Maama Nalubaale` using PHOTO_INVENTORY.md. Skip birthday, stock dove, car selfie, kittens, duplicates. Mute tortoise video. OG from cave-shore. Keep missing-subject placeholders.

**STOP.** Write `PHASE_REPORT.md`. Do not start Phase 6.

---

## PHASE 6 — SEO, 404, build check

Unique titles, finished 404, privacy sentence, clean lint and build. No custom domain unless the owner asks.

**STOP.** Write `PHASE_REPORT.md`.

---

## PHASE_REPORT.md template

```md
# Phase N report

Status: complete | blocked
Branch: phase-N-…
Build: pass | fail
Lint: pass | fail

What shipped
- …

What was not done (and why)
- …

Files created or changed
- …

Images used (public names)
- …

Blockers for the owner / Grok
- …

How to preview
- npm run dev
- routes checked: …
```

The owner starts the next phase with one line, for example: `Start Phase 2`.
