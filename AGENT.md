# Agent handoff — read this first

You are implementing the public website for **Ba Lubaale Ancestral Sanctuary Kiwamirembe**.

This repository is the source of truth. The owner’s CLI agent works here. Grok reviews commits and pull requests against these files. Do not invent a second brief.

## Read in this order

1. `DECISIONS.md` — locked owner answers. Do not reopen them.
2. `MASTER_PROMPT.md` — constitution. Everything between START and END is binding.
3. `WEBSITE_MASTER_PLAN.md` — architecture, homepage section order, page map, build sequence.
4. `PHOTO_INVENTORY.md` — every image, rename map, and page-by-page inclusion plan.

If two files appear to conflict, `DECISIONS.md` plus the START/END block in `MASTER_PROMPT.md` win.

## How to start

```bash
git clone https://github.com/okechbrian/ba-lubaale-ancestral-sanctuary.git
cd ba-lubaale-ancestral-sanctuary
```

Scaffold Next.js App Router + TypeScript + Tailwind into this same repo. Do not create a nested second project folder. Keep these markdown files at the repo root.

## Images

Do not commit the raw photo dump if it is large; copy and rename locally:

`C:\Users\y\OneDrive\Desktop\New folder\Maama Nalubaale`

→ `/public/images` and `/public/video` using names in `PHOTO_INVENTORY.md`.

Skip the “Do not use” list. Strip TikTok watermarks before publish. Mute video.

## Work in phases. Stop after each phase for review.

1. Scaffold + tokens + layout chrome + empty routes
2. Home in the exact 11-section order
3. Inner pages: land → cave → host → immersions → practices → atelier → prepare → policies → apply
4. Apply form wiring
5. Media pass
6. SEO, 404, build check

Commit after each phase. Prefer a pull request named `phase-N-…` so Grok can review before the next phase.

## Do not

- Invent domain, email, WhatsApp number, testimonials, or a legal personal name
- Install an i18n library (EN | LG stub only)
- Add a shop, booking engine, blog, or database
- Use Inter + Playfair
- Dump all 87 photos on the homepage
- Claim neighbouring waterfalls as the 10-acre spring unless the owner confirms

## Host title

English: Queen Nalubaale  
Luganda: Mama Nalubaale  
Voice: she / first person when she speaks
