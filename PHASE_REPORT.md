# Teaching ground report

Status: complete
Branch: teaching-ground (from origin/main)
Build: pass (15/15 routes)
Lint: pass (0 errors, 2 pre-existing warnings)

## The three films (ids)

1. **Okwezuula, part 1** — id `0Soh_8nwBZc`
   EN: Unveiling. Who you are, and what has been blocking the life.
2. **Master the art of balance** — id `ycERgjuSUNs`
   EN: Silence, conduct, and the thirty quiet minutes with no phone.
3. **FFUNA OBUGAGGA MU NAMBULA BIZINGA BYE SSESE** — id `4bTrmRtg_WU`
   EN: The Ssese gathering. The annual coming-together, not a resort advert.

Channel: https://www.youtube.com/@nalubaalethedivine7639 — link label
**Nalubaale The Divine**.

## What shipped

- `content/teaching.ts` — the three films + channel, single source for the
  shelf and the footer.
- `components/HearHer.tsx` — new. youtube-nocookie embeds, click-to-play
  facade (thumbnail from `i.ytimg.com`, iframe mounts only on click, so
  nothing loads or plays on page load), no autoplay on load, title =
  Luganda/channel title, one English line under each. Placed on `/the-host`
  under the bio with `id="hear-her"`. Not a client-side autoplay: playback
  starts only from the click, per the "no autoplay sound" lock.
- Footer repeat: three titles (linking to `/the-host#hear-her`) + the channel
  link, no second set of iframes. Footer grid went 3 → 4 columns
  (sm:2 / lg:4) to hold it.
- Homepage teaching line under the hero, before Sanctuary Moments:
  "This ground is where the Lubaale of Ssese can be approached, and where the
  teaching is lived." + `Hear her →` `/the-host#hear-her`. Prices and the
  apply CTA untouched.
- Layout shift:
  - `/the-host` bio — portrait large (7 of 12 cols), bio in a narrow column
    (4 of 12, col-start 9, max-w-md), then the film shelf full width.
  - Homepage host block — same portrait (larger round crop), two sentences,
    `Meet the host →`.
- `/the-cave` chamber one-liners under each name:
  - Nalubaale: motherhood, marriage, prosperity — closeness after cleansing
  - Musisi: movement out of stagnation
  - Wanema: order, when nothing lands right
  No diet menu added; existing chamber copy untouched.

## What was not done (and why)

- Only the homepage, `/the-host` and `/the-cave` were touched. Every other
  page is unchanged, per "Do not rebuild every page in this pass."
- "The Work" photo row on `/the-host` kept as-is — it is the working
  portraits, not the host block.

## Locks verified

- Queen Nalubaale (EN) / Mama Nalubaale (LG) — unchanged.
- Prices unchanged. Apply fields unchanged. No chicken/eggs rule untouched.
- No WhatsApp number: footer still shows the empty slot ("Available on
  request"); `0706559119` appears nowhere in the build.
- No autoplay sound: no iframe exists until a click mounts it.
- Photography-in-caves rule lines untouched in footer, `/prepare`, `/policies`.
- Not a channel dump: three films only, no playlist, no channel banner.

## Files created or changed

- created `components/HearHer.tsx`
- created `content/teaching.ts`
- `app/page.tsx` (teaching line, host block)
- `app/the-host/page.tsx` (bio restructure, shelf)
- `app/the-cave/page.tsx` (chamber one-liners)
- `components/Footer.tsx` (Hear her column, 4-col grid)
- `next.config.ts` (`images.remotePatterns` for `i.ytimg.com` thumbnails)
- `PHASE_REPORT.md` (this file)

## Images used (public names)

- `host-portrait-headwrap.jpg`, `host-measuring-bark.jpg` (existing)
- remote film thumbnails: `i.ytimg.com/vi/<id>/sddefault.jpg` (all three
  verified 200; maxres/hq720 do not exist for them)

## Blockers for the owner / Grok

- Eyeball the shelf on `/the-host` once deployed: thumbnail crop (bars
  removed by object-cover), play behaviour, and the footer column wrap.
- Decision noted: the click loads the embed with `autoplay=1` so the film
  actually starts on click. Say the word if you want click = load only, then
  press play inside the player.

## How to preview

- `npm run dev`
- routes checked: `/` (teaching line + host block), `/the-host`
  (`#hear-her` shelf), `/the-cave` (chamber lines), footer on any route.
