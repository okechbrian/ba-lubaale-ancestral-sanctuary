# Phase 10 report — Audit fix (audit-fix)

Status: complete
Branch: audit-fix
Build: pass (15/15 routes)

## Changes

### 1. Host title locked
- `/the-host` H1: "Queen Nalubaale", subline: "Mama Nalubaale"
- Homepage host block H2: "Queen Nalubaale", subline: "Mama Nalubaale"
- Quote cite: "— Queen Nalubaale" (both pages)
- All alt text: "Queen Nalubaale" (not "Mama")
- `/the-host` metadata description updated

### 2. Header wordmark
- BA LUBAALE in ink on cream
- Subtitle: plain `text-bark` on cream background (no bark pill)
- Both desktop and mobile drawer updated

### 3. SEO URL corrected
- `sitemap.ts`: base URL → `https://ba-lubaale-ancestral-sanctuary.vercel.app`
- `robots.ts`: sitemap URL → `https://ba-lubaale-ancestral-sanctuary.vercel.app/sitemap.xml`
- `layout.tsx`: added `metadataBase: new URL("https://ba-lubaale-ancestral-sanctuary.vercel.app")`

### 4. Apply form thank-you
- Formspree success → standard thank-you message
- Mailto fallback → distinct message: "Your mail app should open... send to queennalubaale@gmail.com"
- `mailtoFallback` state flag added

### 5. DECISIONS.md updated
- Email locked: `queennalubaale@gmail.com`
- Production URL locked: `https://ba-lubaale-ancestral-sanctuary.vercel.app`
- Domain and WhatsApp still last
- Date updated to 24 Sep 2026
