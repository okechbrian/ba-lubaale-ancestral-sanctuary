# Phase 13 report — Bark-soft tone for dark sections (cloth-rust)

Status: complete
Branch: cloth-rust
Scope: one new colour token + class swaps on dark sections only
Date: 27 Sep 2026

Gates:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

## Token added

```
--bark-soft: #E8A06A;
```

Registered in `@theme inline` as `--color-bark-soft: var(--bark-soft)`, so
`text-bark-soft` works like any other palette utility. Verified in the built
CSS: `#e8a06a` present alongside `#c4542a` and `#8b2e14`.

Phase 12 set `--bark` to the rust `#C4542A` and reported the side effect: bark
text on the dark sections fell to 3.30:1. This tone fixes that without
disturbing the light sections, where `#C4542A` is now doing good work
(3.88:1 on cream, up from 2.01:1).

## Class swaps — 17 replacements, dark parents only

| File | Lines | Dark parent |
|---|---|---|
| `app/page.tsx` | Three Acts numerals `I` / `II` / `III` | `bg-dusk` section |
| `app/the-host/page.tsx` | hero overline "Mama Nalubaale", quote cite | dusk hero + `bg-dusk` |
| `app/the-cave/page.tsx` | 4 etiquette card headings | `bg-dusk` section |
| `components/Hero.tsx` | location overline, "Kiwamirembe", sub-overline | dusk gradient over hero image |
| `components/Footer.tsx` | subtitle, "Sanctuary", "Reach Us", WhatsApp, Email | `bg-dusk` footer |

`text-bark` was **left alone** everywhere the parent is light: the header and
language stub (`bg-cream`), the homepage invite cite and stay-card meta
(`bg-cream` / `bg-mist`), the sanctuary-geography labels, the immersions day
ratings, the 404 overline (body cream), and the two `/apply` protocol
checkboxes — the last are checkbox accents on a cream card, not body text.
No `bg-canopy` element carries `text-bark`, so nothing qualified there.

No buttons, prices, copy, photos, routes, or form fields were touched.

## Contrast

On `--dusk` `#1B2A28`:

| Colour | Before | After |
|---|---|---|
| `text-bark` (all dark-section text) | 3.30:1 | — |
| `text-bark-soft` | — | **6.86:1** (AA, passes for body text) |
| `text-bark-soft/70` (Hero sub-overline) | 2.23:1 as `bark/70` | **4.10:1** |
| `text-bark-soft` on `--canopy` `#2F4A3C` | — | 4.46:1 |

The two tones are far apart (RGB distance 105.7 / 441), so the light and dark
sections now read as deliberate rather than as one tone that happens to work
in one place. Nothing on a dark background is left below 4.5:1.
