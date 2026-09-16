# Phase 3 report

Status: complete
Branch: phase-3-pages
Build: pass
Lint: pass (39 img-element warnings — expected, placeholders only, resolved Phase 5)

What shipped
- Homepage fixes (Grok feedback):
  - Hero H1 changed to "Ba Lubaale Ancestral Sanctuary", H2 to "Kiwamirembe"
  - Who-is-welcomed: removed SVG icons, added richer column descriptions, kept exclusion sentence
  - Lake House caption: "The water the Lake House sits on" (no building label)
  - Host block: removed invented origin ("Born on these islands. Trained by the women…")
  - .env.example verified (already had FORMSPREE_ENDPOINT=)
- Inner pages built in prescribed order:
  - /the-land — overview, forest/spring/herd/fire features, boat arrival, tortoise video, CTA
  - /the-cave — three chambers, cave etiquette (shoes off, no phones, guided only, traditional work), host-provided interior photos, CTA
  - /the-host — Queen Nalubaale / Mama Nalubaale, first-person bio (no legal name, no TikTok, no childhood story), working portraits, quote, CTA
  - /immersions — international table only (USD 2,200/3,600; 4,500/7,200; buyout 10,000+1,500), pointer line to resident rates on Practices
  - /practices — heading "Resident & day sessions", day sessions table, resident stays, workshop practices (sunset cruise, bike trails, weaving, bark cloth, talisman), CTA
  - /atelier — bark cloth (olubugo) section, craft gallery (10 images), worn craft section, CTA
  - /prepare — arrival, packing, digital sunset, substance-free, female-visitor food protocol (plain, respectful), photography limits, legal lines, CTA
  - /policies — deposits, payments, cancellation ladder, sanctuary rules, female-visitor food protocol, safety/privacy, disclaimer
  - /apply — all 14 fields visible (full name, email, WhatsApp, country, window, party select, 4 open questions, protocol yes/no, digital sunset yes/no, 2 required checkboxes), success message, legal lines

What was not done (and why)
- Form wiring (Phase 4 — React Hook Form + Zod + Formspree)
- Image copying (Phase 5 — all paths are labelled placeholders)
- SEO audit and 404 polish (Phase 6)

Files created or changed
- app/page.tsx (5 homepage fixes)
- app/the-land/page.tsx (full page)
- app/the-cave/page.tsx (full page)
- app/the-host/page.tsx (full page)
- app/immersions/page.tsx (full page)
- app/practices/page.tsx (full page)
- app/atelier/page.tsx (full page)
- app/prepare/page.tsx (full page)
- app/policies/page.tsx (full page)
- app/apply/page.tsx (full page)

Images used (public names — all placeholders)
- hero-shore-gathering.jpg, host-portrait-cowrie.jpg, og-cave-shore.jpg
- arrival-boat.jpg, arrival-canoe.jpg, forest-roots.jpg, fire-night.jpg
- host-measuring-bark.jpg, bark-dresses-stand.jpg, cowrie-four.jpg
- closing-shore.jpg, cave-silhouette.jpg, cave-threshold-hay.jpg
- cave-mouth-congregation.jpg, cave-kneeling.jpg, cave-seated.jpg
- host-compound-walk.jpg, host-night-fire.jpg, host-lake-scarf.jpg
- bark-circle.jpg, bark-dresses-detail.jpg, cowrie-necklace-still.jpg
- braided-bead-set.jpg, cowrie-seed-necklace.jpg, cowrie-two.jpg
- kente-shore-two.jpg, kente-water-rite.jpg
- tortoise.mp4, tortoise-poster.jpg

Blockers for the owner / Grok
- None — Phase 3 gates passed

How to preview
- npm run dev
- routes checked: all 11 routes return 200, nav and footer render on every page
