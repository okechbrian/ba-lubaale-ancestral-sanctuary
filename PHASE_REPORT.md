# Phase 6 report

Status: complete
Branch: phase-6-seo
Build: pass
Lint: pass (zero warnings)

What shipped
- Unique title + meta description on every route (11 pages + 404)
- app/apply/layout.tsx added so the client form page has its own metadata
- app/not-found.tsx rewritten in sanctuary voice with overline, poetic copy, CTA
- app/robots.ts — allows all, disallows /api/, sitemap reference
- app/sitemap.ts — all 10 public routes with lastModified, priority, changeFrequency
- Privacy sentence expanded on /policies: "We do not sell, rent, or distribute your data to any third party"
- Favicon: SVG (canopy circle + cowrie shell outline) + 32x32 PNG + 180x180 apple-touch-icon, all from cowrie-necklace-still.jpg crop
- Metadata icons added to layout.tsx (SVG + PNG + apple-touch)
- OG image confirmed: /public/og.jpg (1200x630)
- Legal lines confirmed present on: /apply (lines 448-458), /policies (lines 133-148), Footer (lines 67-76)

Files created or changed
- app/apply/layout.tsx (new — metadata for client form page)
- app/robots.ts (new)
- app/sitemap.ts (new)
- app/not-found.tsx (rewritten)
- app/policies/page.tsx (privacy sentence added)
- app/layout.tsx (favicon metadata added)
- public/favicon.svg (new — canopy circle + cowrie)
- public/favicon-32x32.png (new — from cowrie crop)
- public/apple-touch-icon.png (new — from cowrie crop)
- scripts/gen-favicon.mjs (new — generation script)

What was not done (and why)
- Custom domain — owner did not request it
- Vercel deploy — owner did not request it
- metadataBase left as localhost — will resolve when custom domain is set

Blockers for the owner / Grok
- None — Phase 6 gates passed

How to preview
- npm run dev
- Routes: all 11 pages, /robots.txt, /sitemap.xml, /_not-found
- Favicon visible in browser tab (SVG cowrie mark)
