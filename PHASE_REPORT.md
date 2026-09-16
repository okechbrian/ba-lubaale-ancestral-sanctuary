# Phase 8 report — Colour pass (palette-lake-leaf)

Status: complete
Branch: palette-lake-leaf
Build: pass (15/15 routes)
Lint: pass (zero warnings)

Palette changes
- Added --lake: #1565C0 and --leaf: #22E36A tokens to globals.css + Tailwind @theme
- Primary buttons (all pages): bg-bark → bg-lake, hover:bg-bark/90 → hover:bg-lake/80
- Nav hover (desktop + mobile): hover:text-ember → hover:text-leaf
- EN active in LanguageStub: text-ink → text-leaf
- Footer link hovers: hover:text-bark → hover:text-leaf
- Secondary text links (View immersions, Visit the Atelier, Meet the Host, View details, Practices link): ember/bark → leaf
- Readiness strip button: bg-bark → bg-lake
- 404 button: bg-ember → bg-lake
- Apply submit button: bg-bark → bg-lake

What stayed the same
- Bark: overlines, captions, subtitles, craft labels, duration labels, cave etiquette headings, hero subtitle, host honorific, citation text, sacred geography island labels
- Ember: validation error text on /apply only
- Copy, routes, prices, photos: unchanged
- Hero overlay: unchanged (dusk gradient)
- No new domain, no second Vercel project

Files changed
- app/globals.css (added --lake, --leaf tokens + Tailwind theme)
- components/Header.tsx (nav hover → leaf, buttons → lake)
- components/LanguageStub.tsx (EN active → leaf)
- components/Footer.tsx (link hovers → leaf)
- app/not-found.tsx (button → lake)
- app/page.tsx (CTAs → lake, text links → leaf)
- app/the-land/page.tsx (CTA → lake)
- app/the-cave/page.tsx (CTA → lake)
- app/the-host/page.tsx (CTA → lake)
- app/immersions/page.tsx (CTA → lake, Practices link → leaf)
- app/practices/page.tsx (CTA → lake)
- app/atelier/page.tsx (CTA → lake)
- app/prepare/page.tsx (CTA → lake)
- app/apply/page.tsx (submit → lake)
