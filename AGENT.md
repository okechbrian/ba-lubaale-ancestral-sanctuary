# Agent handoff — read this first

You are implementing the public website for **Ba Lubaale Ancestral Sanctuary Kiwamirembe**.

The owner only monitors. After each phase they report to Grok. You execute **one named phase** from `AGENT_INSTRUCTIONS.md`, write `PHASE_REPORT.md`, and STOP.

## Read in this order

1. `AGENT_INSTRUCTIONS.md` — what to build, exact copy, stop gates
2. `DECISIONS.md` — locked owner answers. Do not reopen them.
3. `MASTER_PROMPT.md` — constitution. Everything between START and END is binding.
4. `WEBSITE_MASTER_PLAN.md` — architecture
5. `PHOTO_INVENTORY.md` — image map and page placement

If two files appear to conflict, `DECISIONS.md` plus the START/END block in `MASTER_PROMPT.md` win. Execution detail lives in `AGENT_INSTRUCTIONS.md`.

## How to start

```bash
git clone https://github.com/okechbrian/ba-lubaale-ancestral-sanctuary.git
cd ba-lubaale-ancestral-sanctuary
```

Scaffold Next.js App Router + TypeScript + Tailwind into this same repo. Do not create a nested second project folder. Keep these markdown files at the repo root.

## Images

Owner PC, images only:

`C:\\Users\\y\\OneDrive\\Desktop\\New folder\\Maama Nalubaale`

Copy during Phase 5 using `PHOTO_INVENTORY.md`. Mute video. Skip the “Do not use” list.

## Phases (one at a time)

1. Foundation
2. Home
3. Inner pages
4. Apply form wiring
5. Media pass
6. SEO, 404, build check

## Do not

- Invent domain, email, WhatsApp number, testimonials, or a legal personal name
- Install an i18n library (EN | LG stub only)
- Add a shop, booking engine, blog, or database
- Use Inter + Playfair
- Dump all 87 photos on the homepage
- Start the next phase without a new owner message that names it

## Host title

English: Queen Nalubaale  
Luganda: Mama Nalubaale  
Voice: she / first person when she speaks
