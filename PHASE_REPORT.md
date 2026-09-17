# Phase 10 report — Video-only hero + film strip moments (interact-hero-2)

Status: complete
Branch: interact-hero-2
Build: pass (15/15 routes)
Lint: pass (zero warnings)

Hero
- Background: video-only (tortoise.mp4), no 3-still crossfade
- Autoplay muted on page load, playsInline, loop
- Poster: hero-shore-gathering.jpg (visible until first frame, or when autoplay blocked)
- prefers-reduced-motion: no autoplay, poster still only, Play control still works
- Play/Pause control: "Pause the lake" / "Play the lake"
- If browser blocks autoplay: poster shows, control works, no error thrown
- Lake buttons stay lake

Moments film strip
- 24 approved stills (shore, craft, food, forest, fire, cave mouth — no ritual interiors)
- Horizontal drift right→left via CSS animation (120s loop, seamless)
- Content duplicated for gapless loop
- Pause on hover
- Pause when lightbox open
- prefers-reduced-motion: static row, no drift, lightbox still works
- Quiet lightbox on click, short captions, Escape to close

Email
- queennalubaale@gmail.com (unchanged from previous pass)

Files changed
- components/Hero.tsx (rewritten — video-only, autoplay muted, reduced motion handling)
- components/MomentsStrip.tsx (rewritten — 24 stills, CSS drift animation, pause on hover/lightbox)
