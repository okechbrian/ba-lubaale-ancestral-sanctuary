# Phase 16 report — Media audit (media-audit)

Status: complete for the agreed batch; further items listed under "Open"
Branch: media-audit (from origin/main @ d2fcd3e)
Scope: image/video assets and the slots that use them
Date: 27 Sep 2026

Gates:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

## Inventory reconciliation

| | |
|---|---|
| Images on disk | 108 (32.8 MB) |
| Images referenced | 52 |
| Broken references | **0** |
| Unused (left in place, per instruction) | 56 (~10.2 MB) |
| Videos | 2, both used — both **640×360** |

`PHOTO_INVENTORY.md` was treated as the governing plan for every judgement
below.

## Fixed in this pass

### 1. `closing-shore.jpg` straightened
Measured roll by gradient orientation (peak −18°), confirmed visually against
0/12/−12/19° candidates, settled on **+15°**. Rotated with a 1.311× pre-zoom
so the frame still fills a 4:3 crop — no white corners, no loss of coverage.
Affects the homepage closing CTA and the `/immersions` hero.

### 2. `lake-house.jpg` cropped tighter
Original showed a mown lawn, a black water tank and shoreline litter. Cropped
to x1500 y600 1800×1350 (4:3), which keeps the stilted house, the lake, the far
shore, the mango canopy and the boat shelter, and drops the litter, tank and
lawn. The existing alt text is now exactly accurate. 1800×1350, 812 KB.
Three slots affected: homepage gateway, `/the-land` card and `/the-land` overview.

### 3. Two broken heroes replaced
Both were 486×1080 (aspect 0.45) portrait phone frames used full-bleed, where
only **25% of the frame** was visible.

- `/the-land`: `forest-roots.jpg` → `forest-lake-view.jpg` (landscape, already
  used elsewhere on the page, so no new bytes). A spreading tree with mossy
  buttress roots and the lake through the trunks.
- `/prepare`: `arrival-boat.jpg` → `shore-calm-blue.jpg`.

`boat-group-crossing.jpg` was evaluated as the `/prepare` candidate and
rejected — the frame is foliage-obscured and hazy with no boats or people
visible, despite its name.

### 4. Alt text corrected
`forest-roots.jpg` was captioned "fed by an ancestral spring" while showing no
water at all. Now: "Buttress roots of an ancient tree in the sanctuary forest".
Verified: **0** `alt` attributes across all eight built pages still claim water
the frame does not show. (The hero sub-heading "Set within vast forest fed by an
ancestral spring" is page copy, not an alt, and was left alone.)

### 5. Phone watermarks removed — 3 live exposures found and fixed
A corner-sheet sweep of all 108 files found **9 images carrying a burned-in
phone watermark**, 4 of them published:

| File | Mark | Status |
|---|---|---|
| `pineapple-farm-lake.jpg` | Samsung Quad Camera | **live on `/the-land`** — fixed |
| `sunset-calm-lake.jpg` | Samsung Quad Camera | **live in `MomentsStrip`** — fixed |
| `bananas-woven-mats.jpg` | Samsung Quad Camera | live on `/atelier`, hidden only by the crop — fixed |
| `fresh-tilapia.jpg` | Samsung Quad Camera | live on `/the-land`, hidden only by the crop — fixed |
| `boat-shelter.jpg` | CAMON 30S Pro | unused |
| `cloudscape-hills.jpg` | Samsung Quad Camera | unused |
| `host-garden-welcome.jpg` | CAMON 30S Pro | unused |
| `kente-rock-sit.jpg` | CAMON 30S Pro | unused |
| `lake-cloudscape.jpg` | Samsung Quad Camera | unused |

The three that are in use were re-saved with the bottom 22% removed
(1080×809 → 1080×631, aspect 1.33 → 1.71), which clears the mark and also makes
them landscape-native. Verified the marks are gone by re-inspecting the corners.

Note the two that were previously "safe" were safe only because a 4:3 crop
happened to slice off the bottom 22%. That was luck, not policy.

## Open — not changed, needs your call

1. **The hero is a tortoise.** `Hero.tsx:64` plays `tortoise.mp4` full-bleed,
   and the approved shore-gathering still only renders under
   `prefers-reduced-motion`. The unimported 1080p master was reviewed
   (`20260916_144337.mp4`, 92 s): it is a handheld property pan — lawn, water
   tanks, tyres, cottage. **Not recommended for the hero.** Still-crossfade or a
   slow push on the approved still remain the better options.
2. **Both videos are 360p.** `lake-house.mp4` (19.7 MB) and `tortoise.mp4`
   (4.9 MB) are 640×360 across full-bleed sections. The 1080p master exists and
   could be re-encoded, but the hero decision should come first.
3. **`MomentsStrip` violations**, deferred by instruction: `food-plate.jpg` and
   `food-luwombo.jpg` (food plates on the homepage), `cowrie-three.jpg`
   (gathering selfie), `braided-bead-set.jpg` (jewellery macro) — all forbidden
   by `PHOTO_INVENTORY.md:231` — plus `cave-mouth-wide.jpg`, a crowded cave
   interior with a silhouetted head, currently rotating above the fold. The last
   one is the item I would not leave sitting.
4. **Aspect-ratio crop, remaining 27 images.** 29 of 52 used images lose over
   40% of their frame in a 4:3 box; the two heroes are fixed above, leaving 8
   severe (`coffee-cherries`, `braided-bead-set`, `cowrie-seed-necklace`,
   `cowrie-necklace-still`, `kente-shore-two`, `kente-water-rite` at 34–42%) and
   ~19 moderate. The severe ones are portrait object stills on `/atelier`; the
   clean fix is a portrait-shaped box for those cards rather than `object-position`
   nudging.
5. **Thin pages.** `/practices` 1 image, `/immersions` 1, `/prepare` 2. Sanctioned
   filler exists in the unused pool (`fire-embers`, `food-whole-fish`,
   `food-luwombo`, `kitchen-leaf-wrap`, `host-measuring-bark`, `og-cave-shore`),
   with the standing guard that no food image may illustrate the no-egg rule.
6. **Seven watermarked unused images** must be cropped or retouched before any
   of them is published.

## Not touched
Prices, the apply form and its fields, the WhatsApp number, the domain, routes,
the palette, and page copy beyond the alt strings listed above.
