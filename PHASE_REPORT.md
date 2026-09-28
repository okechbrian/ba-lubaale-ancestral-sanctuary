# Phase 15 report — Merge of cloth-rust + living-place into main

Status: complete
Branch: main
Scope: merge only — no new copy, no new pages
Date: 27 Sep 2026

Gates on the merged tree:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

## Merges

1. **`origin/cloth-rust` → main** — fast-forward `8a36b45..5342def`. No
   conflict; the branch was already a descendant of main.
2. **`origin/living-place` → main** — merge commit. One conflict, in
   `PHASE_REPORT.md` only, because both branches had overwritten it; the
   document was rewritten for this phase. `app/page.tsx` auto-merged cleanly —
   the two branches had edited different regions of it (land blurb vs. Three
   Acts numerals) and both survived. Verified in the built HTML.

## Tokens confirmed in `app/globals.css`

```
--bark:       #C4542A
--bark-soft:  #E8A06A
--ember:      #8B2E14
--lake:       #1565C0   (unchanged)
--leaf:       #22E36A   (unchanged)
```

`@theme inline` registers `--color-bark`, `--color-bark-soft`,
`--color-ember` against those variables. All three hexes are present in the
compiled CSS.

`text-bark-soft` is applied only where the parent is dark: the homepage Three
Acts numerals, the `/the-host` hero overline and quote cite, the `/the-cave`
etiquette card headings, the Hero overlines (over the dusk gradient), and the
footer. `text-bark` remains on the light sections (header, language stub, home
invite cite, stay-card meta, geography labels, immersions day ratings, 404
overline, and the two `/apply` checkboxes, which are accents on a cream card).

Contrast on `--dusk`: `bark-soft` 6.86:1 (was 3.30:1 for the rust), and 4.10:1
at 70% opacity for the Hero sub-overline.

## The two land paragraphs confirmed

A Living Place — history, not inventory:

> Ba Lubaale Ancestral Sanctuary Kiwamirembe is a living place — ground to
> approach the Lubaale of Ssese and Lake Nalubaale in a single visit, with the
> host holding the door. It is older than the people now standing on it. It was
> passed to her in 1998. The forest, the spring, the fire, the herd, and more
> than a hundred caves are here. Three of the caves are open to guests —
> Nalubaale, Lubaale Musisi, and Lubaale Wanema. The rest are visited only
> after a calling.

The Lake House — its own narration:

> The Lake House sits on the water and hosts the ba Lubaale who stay in the
> lake. Fish feeding is done here, always guided. Rooms sit over the water on
> stilts, and the lake is the only alarm.

Neither "three-chambered sacred cave" nor "Board over fish" appears anywhere;
chamber wording remains only on `/the-cave`. The goat bell sits with the Herd
and the weaver nests with the Forest, as reviewed.

## Not touched

Prices, the apply form and its fields, the WhatsApp number, and the domain
were not modified by either merge. The merge diff contains no price, form, or
contact changes. No pages were added.
