# Phase 2 report

Status: complete
Branch: phase-2-home
Build: pass
Lint: pass

What shipped
- Phase 1 fixes applied:
  - .env.example already contained FORMSPREE_ENDPOINT=
  - Request Immersion button changed from ember to bark fill + cream type (desktop + mobile)
  - backdrop-blur removed from sticky header
- Homepage built with exact 11-section order from AGENT_INSTRUCTIONS.md:
  1. Full-viewport hero — dusk overlay, overline (Ssese Islands · Lake Victoria · Uganda), H1, H2, deck, support line, dual CTAs, microcopy
  2. Host invitation — first-person quote, cowrie portrait
  3. Four land gateways — Cave, Lake House, Forest Spring, Herd & Fire cards linking to /the-land hashes
  4. Who is welcomed — three columns (Solo, Couples, Families) + exclusion sentence
  5. Three acts — Arrival / Work / Return with roman numerals, link to /immersions
  6. Craft as healing — bark, dresses, cowrie trio + "You do not only speak the intention" line, link to /atelier
  7. Host block — Queen Nalubaale / Mama Nalubaale, first-person bio, link to /the-host
  8. Three stay cards — Essential (3-day), Master (5-day), Whole-island buyout, links to /immersions
  9. Readiness strip — "Ready to sit with what needs sitting with?" + dual CTAs
  10. Neighbouring sacred geography — Wanema's Shrine (Bubeke), Nanziri Waterfalls (Bukasa), Buswa Forest (regional), clearly labelled off-property
  11. Closing full-bleed — closing-shore.jpg + "Leave the noise" line + Request an Immersion CTA

What was not done (and why)
- No real inner-page copy beyond what the home already links to (Phase 3)
- No form wiring (Phase 4)
- No images copied — all paths are labelled placeholders (Phase 5)
- No SEO audit beyond homepage metadata (Phase 6)

Files created or changed
- app/page.tsx (full homepage rewrite, 11 sections)
- components/Header.tsx (bark button, no backdrop-blur)

Images used (public names — all placeholders, files not yet copied)
- hero-shore-gathering.jpg
- host-portrait-cowrie.jpg
- og-cave-shore.jpg
- arrival-boat.jpg
- forest-roots.jpg
- fire-night.jpg
- host-measuring-bark.jpg
- bark-dresses-stand.jpg
- cowrie-four.jpg
- closing-shore.jpg

Blockers for the owner / Grok
- None — Phase 2 gates passed

How to preview
- npm run dev
- routes checked: / (11 sections), all inner stubs still return 200
