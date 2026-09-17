# Phase 9 report — Interactive hero (interact-hero)

Status: complete
Branch: interact-hero
Build: pass (15/15 routes)
Lint: pass (zero warnings)

Hero
- 3-still crossfade: hero-shore-gathering.jpg → og-cave-shore.jpg → fire-night.jpg, 7s interval
- Crossfade pauses on hover via pausedRef
- Muted film layer: tortoise.mp4 (lake-life fallback), muted, playsInline, click-to-play
- Video poster = current crossfade still
- Button label: "Play the lake" / "Stop the lake"
- prefers-reduced-motion: first still only, no auto crossfade, no autoplay
- Kept: H1, H2, CTAs, "Private. Screened. One household at a time."
- Lake buttons stay lake

Moments strip (after host invitation)
- 6 unused approved stills: host-measuring-bark.jpg, bark-teaching.jpg, cowrie-four.jpg, food-luwombo.jpg, forest-butterfly.jpg, arrival-canoe.jpg
- Quiet lightbox on click, captions short
- Escape key closes lightbox

Email
- content/site.ts contact email = queennalubaale@gmail.com
- Footer Reach Us mailto uses site.contact.email (queennalubaale@gmail.com)
- Apply form mailto fallback = queennalubaale@gmail.com
- No Formspree URL (NEXT_PUBLIC_FORMSPREE_ENDPOINT not set)

Files changed
- content/site.ts (email → queennalubaale@gmail.com)
- app/apply/page.tsx (mailto → queennalubaale@gmail.com)
- components/Hero.tsx (new — interactive hero client component)
- components/MomentsStrip.tsx (new — moments grid + lightbox)
- app/page.tsx (import Hero + MomentsStrip, replace old hero, insert moments)
