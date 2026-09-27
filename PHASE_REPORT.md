# Phase 12 report — Colour token pass (cloth-rust)

Status: complete
Branch: cloth-rust (from origin/main @ 8a36b45)
Scope: colour tokens only
Date: 27 Sep 2026

Gates:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

## Owner lock applied

`--bark` — the rust from Queen Nalubaale's gele and rust brocade dress
(`/images/host-portrait-cowrie.jpg`, `/images/host-portrait-headwrap.jpg`):

```
--bark: #C4A574  →  --bark: #C4542A
```

## Files changed

- `app/globals.css` — the only source file touched.
- `PHASE_REPORT.md` — this report.

`@theme inline` was reviewed and needs no edit: `--color-bark` and
`--color-ember` already map through `var(--bark)` / `var(--ember)`, so the
`:root` change is the single source of truth and flows into the Tailwind
utilities. Verified in the built CSS: `#c4542a` and `#8b2e14` present,
`#c4a574` and `#b45a2a` gone.

## Tokens deliberately NOT changed

| Token | Value | Status |
|---|---|---|
| `--lake` | `#1565C0` | unchanged — buttons stay lake |
| `--leaf` | `#22E36A` | unchanged |
| `--cream` | `#F4EDE0` | unchanged |
| `--ink` | `#1A1814` | unchanged |
| `--dusk` | `#1B2A28` | unchanged |
| `--mist` | `#E7E1D4` | unchanged |
| `--canopy` | `#2F4A3C` | unchanged |

No button, link, or component class was touched. No copy, no prices, no
photos, no routes, no apply-form fields.

## Ember: darkened, condition met

The lock said keep ember for form errors *unless* it became indistinguishable
from bark. Measured against the new rust:

- old ember `#B45A2A` — H 20.9, S 62.2, L 111
- new bark  `#C4542A` — H 16.4, S 64.7, L 119
- RGB distance 17.1 / 441 (~4%) — the same rust-orange; not distinguishable
  in a form field.

So ember was darkened as instructed:

```
--ember: #B45A2A  →  --ember: #8B2E14
```

Ember is used only for validation messages on `/apply` (11 usages, all
`text-ember` on cream), and it now reads as a distinctly deeper burnt sienna.

## Contrast effect (WCAG, on `--cream` #F4EDE0)

| Colour | Before | After |
|---|---|---|
| bark text | 2.01:1 | **3.88:1** (clear improvement) |
| ember error text | 4.07:1 | **7.22:1** |

Trade-off worth knowing: on the `--dusk` sections, `text-bark` falls from
6.38:1 to 3.30:1. That affects the small cite lines on `/the-host` and the
homepage, and the large `I / II / III` numerals on the homepage (the numerals
still clear AA-large at 3:1; the small cites sit below 4.5:1). Raising those
would mean either a second bark tone or extra classes on dusk sections — both
outside a token-only pass, so it is reported here rather than changed.
