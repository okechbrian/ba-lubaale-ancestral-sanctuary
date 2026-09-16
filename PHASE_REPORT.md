# Phase 4 report

Status: complete
Branch: phase-4-form
Build: pass
Lint: pass (39 img-element warnings — placeholders, resolved Phase 5)

What shipped
- Pre-wire fixes (Grok feedback):
  - .gitignore: stopped ignoring .env.example; .env and .env.local still ignored
  - .env.example committed with NEXT_PUBLIC_FORMSPREE_ENDPOINT=
  - /the-host: trimmed invented lineage to "the women who kept this place before me" (no specifics invented)
- Apply form wired with React Hook Form + Zod:
  - All 14 fields validated via Zod schema
  - Text fields: fullName (required), email (required, email format), whatsapp (optional), country (required), window (optional), drawing (required), comfort (required), limits (optional), burden (required)
  - Select fields: party (solo/couple/family/buyout, required), protocols (yes/no, required), digitalSunset (yes/no, required)
  - Checkboxes: policiesCheck (must be true), complementaryCheck (must be true)
  - POST to NEXT_PUBLIC_FORMSPREE_ENDPOINT if set, otherwise mailto:hello@ fallback
  - Thank-you screen hidden until submit succeeds
  - Submit button shows "Submitting..." while in flight
  - Success copy: exact text from MASTER_PROMPT
  - Both checkboxes required
  - No invented WhatsApp number, no booking calendar, no payments

What was not done (and why)
- Image copying (Phase 5 — all paths are labelled placeholders)
- SEO audit and 404 polish (Phase 6)

Files created or changed
- app/apply/page.tsx (rewritten: client component, RHF + Zod, Formspree/mailto)
- app/the-host/page.tsx (trimmed lineage)
- .gitignore (un-ignored .env.example)
- .env.example (NEXT_PUBLIC_FORMSPREE_ENDPOINT=)
- package.json / package-lock.json (added react-hook-form, zod, @hookform/resolvers)

Images used (public names — all placeholders)
- None changed

Blockers for the owner / Grok
- None — Phase 4 gates passed
- Owner needs to set NEXT_PUBLIC_FORMSPREE_ENDPOINT in Vercel env to activate Formspree; otherwise mailto fallback is used

How to preview
- npm run dev
- routes checked: /apply (form with validation, submit, thank-you)
