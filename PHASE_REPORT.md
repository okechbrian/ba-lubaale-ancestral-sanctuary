# Phase 17 report — Media audit, part two (media-audit)

Status: complete
Branch: media-audit (continues from the part-one commit `a8f882a`)
Date: 27 Sep 2026

Gates:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

## Corrections to the part-one report

1. `braided-bead-set.jpg` was listed as a strip violation. **It is not in the
   strip** — it is `/atelier` only. The actual strip violations were
   `food-luwombo`, `food-plate`, `cowrie-three` and `cave-mouth-wide`.
2. The unused watermarked files number **5, not 7**. I had double-counted the
   two that were live-but-hidden-by-crop and are already fixed.

## A. Strip violations removed

`components/MomentsStrip.tsx` — 31 → 27 entries.

| Removed | Why |
|---|---|
| `food-luwombo` | food plate on the homepage — forbidden by `PHOTO_INVENTORY.md:231` |
| `food-plate` | food plate on the homepage — same rule |
| `cowrie-three` | catalogued as a gathering selfie |
| `cave-mouth-wide` | crowded cave interior with a silhouetted head |

Kept: three 0.45 portraits (`arrival-boat`, `forest-roots`, `coffee-cherries`)
show 45% in the square strip box — accepted, they are the only arrival and
harvest frames.

## B. `/atelier` portrait row

`cowrie-necklace-still` (0.56), `braided-bead-set` (0.45) and
`cowrie-seed-necklace` (0.45) were portrait object stills inside `aspect-[4/3]`
cards, showing only 34–42% of the frame. They now sit in their own three-up
**"Finished Pieces"** section using `aspect-[3/4]`, so the whole piece is
shown. The people-and-place cards keep 4:3, so the page rhythm is unchanged.

## C. Thin pages filled

- `/practices` — added a quiet three-up stills strip (`fire-embers`,
  `host-measuring-bark`, `sunset-calm-lake`) **after** the price lists rather
  than inside them; dropping images between price cards would break the
  reading flow.
- `/immersions` — added the trio the inventory explicitly allows: cave mouth
  (`og-cave-shore`), bark wear (`bark-dresses-stand`), fire (`fire-night`).
  No food plates, no cave crowds.
- `/prepare` — `fire-embers` at the evening passage, and `food-whole-fish`
  placed directly under the island-meals sentence. **Guard held:** no food
  image sits beside the no-chicken / no-egg rule, which remains text only.
  Verified in the built HTML that the first 300 characters of that section are
  rule text with no food reference.

## D. Hero: five-frame crossfade, tortoise retained

`components/Hero.tsx` now cycles on a 36s round —
`hero-shore-gathering` → `forest-lake-view` → `fire-night` → `closing-shore` →
`tortoise.mp4`. Per your instruction both survive: the tortoise is the closing
frame rather than the whole hero. Zero new bytes, and reduced-motion visitors
still get a single still with no video.

The old click-to-pause control is gone, since there is no single video to
pause; that also retires the unused `videoPlaying` state.

### A real bug caught before shipping

The first implementation drove each layer's opacity with CSS custom properties
as keyframe offsets. The production build collapsed them:

```
@keyframes heroFade{0%{opacity:0}to{opacity:0}}
```

Custom properties are not valid keyframe offsets, so the minifier reduced the
rule to a single 0%/100% pair — every layer would have sat at opacity 0 and the
hero would have rendered **no image at all**, just the dusk overlay. Replaced
with five explicit keyframe blocks using literal stops. Verified present and
intact in the built CSS:

```
heroFrame1  0%,16.7% → 1     20.8%,to → 0
heroFrame2  0%,16.7% → 0     20.8%,33.3% → 1    37.5%,to → 0
heroFrame3  0%,33.3% → 0     37.5%,50% → 1      54.2%,to → 0
heroFrame4  0%,50% → 0       54.2%,66.7% → 1    70.8%,to → 0
heroFrame5  0%,66.7% → 0     70.8%,95.8% → 1    to → 0
```

### How far the visual check actually got

Confirmed live in a headless browser: the hero does switch images (distinct
frames captured), and the page renders correctly. **I could not verify the
exact per-frame timing this way** — Chromium's `--virtual-time-budget`
advances timers but not the CSS animation clock predictably, so captured frames
landed at arbitrary points in the cycle. The ordering above is guaranteed by
the keyframe stops, but please eyeball the rhythm once on the deployed site.

A second false start worth recording: port 3000 was already occupied by an
unrelated project, so my first screenshots were of the wrong website entirely.
Everything above was re-verified on port 3111.

## E. Five unused watermarked files cropped

`boat-shelter`, `cloudscape-hills`, `kente-rock-sit`, `host-garden-welcome`,
`lake-cloudscape` — bottom 22% removed, same operation as the four fixed in
part one. None are referenced by code, so there is no visual risk; this just
stops anyone reaching for a marked file later.

## Still open

1. **Both videos remain 640×360.** Deferred by agreement. The 1080p master is
   the same property-pan footage, so re-encoding fixes sharpness but not
   framing. `/the-land` also has the cropped `lake-house.jpg` still as a
   sharper fallback if you would rather drop the video.
2. **Two aspect cases left unfixed:** `kente-shore-two` and `kente-water-rite`
   on `/atelier` show 42% in a 4:3 box. Their subjects look centre-weighted so
   they should be fine, but they are worth an eye.
3. **The unimported 1080p master** (`20260916_144337.mp4`, 92s) and the 1.5s
   `VID-20260915-WA0071.mp4` remain on disk, unimported.

## Not touched
Prices, the apply form and its fields, the WhatsApp number, the domain, routes,
the palette, and page copy.