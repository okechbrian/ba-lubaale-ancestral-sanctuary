# Phase 1 report

Status: complete
Branch: phase-1-foundation
Build: pass
Lint: pass

What shipped
- Next.js 16 App Router scaffolded in repo root (TypeScript, Tailwind CSS v4, ESLint)
- Fraunces (display) + Figtree (UI) loaded via next/font
- Design tokens as CSS variables on :root: cream, ink, canopy, dusk, bark, ember, mist
- `app/layout.tsx` with fonts, tokens, metadata template `%s — Ba Lubaale Ancestral Sanctuary Kiwamirembe`
- `app/globals.css` with tokens, cream page ground, ink body text
- `components/Header.tsx` — sticky, solid after scroll, desktop nav + mobile full-screen drawer
- `components/Footer.tsx` — blessing line, secondary links, WhatsApp/email slots, both legal lines
- `components/LanguageStub.tsx` — EN | LG, LG is no-op with aria-label "Luganda coming"
- `content/site.ts` — typed content module with name, subtitle, nav, footer links, placeholder contacts
- 10 route stubs (one sentence placeholder each): /, /the-land, /the-cave, /the-host, /immersions, /practices, /atelier, /prepare, /apply, /policies
- Branded not-found.tsx in sanctuary voice ("The path you walked does not lead here")
- .env.example with FORMSPREE_ENDPOINT=
- .gitignore extended with /public/images and /public/video

What was not done (and why)
- No real homepage design (Phase 2)
- No images copied (Phase 5)
- No form wiring (Phase 4)
- No inner page content beyond placeholders (Phase 3)
- No i18n library installed (EN | LG stub only, per decisions)

Files created or changed
- app/layout.tsx
- app/globals.css
- app/page.tsx
- app/not-found.tsx
- app/the-land/page.tsx
- app/the-cave/page.tsx
- app/the-host/page.tsx
- app/immersions/page.tsx
- app/practices/page.tsx
- app/atelier/page.tsx
- app/prepare/page.tsx
- app/apply/page.tsx
- app/policies/page.tsx
- components/Header.tsx
- components/Footer.tsx
- components/LanguageStub.tsx
- content/site.ts
- .env.example
- .gitignore (modified)
- package.json
- tsconfig.json
- next.config.ts
- postcss.config.mjs
- eslint.config.mjs

Images used (public names)
- None (placeholder phase)

Blockers for the owner / Grok
- None — all Phase 1 gates passed

How to preview
- npm run dev
- routes checked: /, /the-land, /the-cave, /the-host, /immersions, /practices, /atelier, /prepare, /apply, /policies, 404
