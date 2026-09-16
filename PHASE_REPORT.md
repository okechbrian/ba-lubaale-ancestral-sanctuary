# Phase 5 report

Status: complete
Branch: phase-5-media
Build: pass
Lint: pass

What shipped
- 80 images copied from owner drop into /public/images, renamed per PHOTO_INVENTORY.md
- 6 skipped: WA0151 (birthday), WA0237 (stock dove), WA0217 (car selfie), Ssese pics 4.jpg (kittens), WA0158(1) and WA0204(1) (duplicates)
- Video: /public/video/tortoise.mp4 — muted, click-to-play on /the-land
- Poster: /public/images/tortoise-poster.jpg — extracted from mid-frame of Ssese pics.mp4
- OG: /public/og.jpg — cropped to 1200x630 from og-cave-shore.jpg
- All <img> tags converted to next/image across 9 pages
- Hero images use fill + priority for LCP
- Gallery images use width/height with aspect-[4/3]
- OG metadata added to layout.tsx (openGraph.images)
- Images were already under 2400px (WhatsApp drop) — no resize needed

Homepage image usage (binding)
- Hero: hero-shore-gathering.jpg (bark-cloth line on lake)
- Host strip: host-portrait-cowrie.jpg (small round portrait)
- Four gateways: og-cave-shore.jpg, arrival-boat.jpg, forest-roots.jpg, fire-night.jpg + tortoise poster
- Craft trio: host-measuring-bark.jpg, bark-dresses-stand.jpg, cowrie-four.jpg
- Host block: host-portrait-cowrie.jpg (larger round portrait)
- Closing: closing-shore.jpg (full-bleed)

Placeholders kept (missing from owner drop)
- lake-house.jpg, cottage.jpg, herd-goats.jpg, herd-cows.jpg, spring-well.jpg

TikTok watermark
- Pics.jpg (host-atelier-seat.jpg) was not used on homepage — host-portrait-cowrie.jpg used instead per inventory guidance

Files created or changed
- /public/images/ — 80 renamed JPEG files + tortoise-poster.jpg
- /public/video/tortoise.mp4 — muted copy
- /public/og.jpg — 1200x630 crop
- app/page.tsx — next/Image for all 11 images
- app/the-land/page.tsx — next/Image for 3 images
- app/the-cave/page.tsx — next/Image for 5 images
- app/the-host/page.tsx — next/Image for 5 images
- app/atelier/page.tsx — next/Image for 12 images
- app/prepare/page.tsx — next/Image for 2 images
- app/immersions/page.tsx — next/Image for 1 image
- app/practices/page.tsx — next/Image for 1 image
- app/layout.tsx — OG image metadata
- scripts/compress-images.mjs — Sharp batch script (used for verification)

What was not done (and why)
- SEO audit, robots.txt, sitemap, 404 polish (Phase 6)
- Image compression pass — all images already under 2400px from WhatsApp drop

Blockers for the owner / Grok
- None — Phase 5 gates passed

How to preview
- npm run dev
- All pages now show real images from the owner's photo drop
- /the-land has muted tortoise video with poster frame
- OG image set for social sharing
