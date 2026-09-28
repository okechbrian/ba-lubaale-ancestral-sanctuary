# Phase 14 report — A Living Place split (living-place)

Status: complete
Branch: living-place (from origin/main @ 8a36b45)
Scope: copy on `/the-land` and the homepage land blurb
Date: 27 Sep 2026

Gates:
- `npm run lint` → exit 0 (0 errors, 2 pre-existing warnings)
- `npm run build` → exit 0 (15/15 routes)

## Owner feedback addressed

The "A Living Place" block had history and inventory mixed together. It is now
split: the opening block tells the history of the sanctuary, and the Lake House
has its own brief narration. Forest, Herd, Fire, and Mutaka are untouched as
sections of their own.

## 1. A Living Place — now history, not inventory

- "Ba Lubaale Ancestral Sanctuary Kiwamirembe is a living place — ground to
  approach the Lubaale of Ssese and Lake Nalubaale in a single visit, with the
  host holding the door."
- "It is older than the people now standing on it. It was passed to her in
  1998."
- "The forest, the spring, the fire, the herd, and more than a hundred caves
  are here. Three of the caves are open to guests — Nalubaale, Lubaale
  Musisi, and Lubaale Wanema. The rest are visited only after a calling." —
  then one link, "See the three open caves →", to `/the-cave`.

Removed from this block: the cave count presented as a single tourist cave,
the goats and cows, the lake fish, Mutaka, the spring/forest inventory, the
Lake House line, and the stray sensory inventory ("Fire burns…", "Board over
fish", "Goat bell at dusk", "Weaver nest…"). The goat bell and the weaver nest
were not lost — they moved to the sections that own them (Herd, Forest). The
unglossable fragment "Board over fish" was dropped rather than guessed at. No
guarantee language, no slogan.

## 2. The Lake House — its own brief narration

Opens as asked: the Lake House sits on the water and hosts the ba Lubaale who
stay in the lake, and fish feeding is done here, always guided. One short line
follows about the rooms over the water on stilts. The old "Fish feed beneath
the floorboards" line was replaced by the guided-feeding line rather than
carried over.

The feature-grid card was trimmed to the one fact it alone carries — the meals
cooked from the island — so the card and the narration no longer repeat each
other.

## 3. Sections left as their own

Forest, Herd, Fire, and Mutaka keep their headings and copy. Only two
additions, both returns rather than new material: "Goat bell at dusk" joined
the Herd, "Weaver nests hang in the branches above the path to the cave"
joined the Forest, and "Fire burns on the shore most evenings" joined the
Fire.

## Homepage

The land blurb no longer says "A three-chambered sacred cave". It now ends
"…An ancient resident tortoise, Mutaka — seen most afternoons. And more than
a hundred caves, three of them open to guests." That phrase is gone from every
page; chamber wording remains only on `/the-cave`, which was not touched.

## Not changed

Prices, the apply form, the palette, and the cave chamber pages (beyond the new
inbound link). Diff touches exactly two files: `app/the-land/page.tsx` and
`app/page.tsx`. Verified in the built HTML: new copy present on both routes,
"three-chambered" and "Board over fish" absent, and the A Living Place block
contains no goat, fish, weaver, Mutaka, alarm, or matooke reference.
