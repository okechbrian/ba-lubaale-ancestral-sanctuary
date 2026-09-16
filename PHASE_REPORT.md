# Phase 7 report — Vercel Deploy

Status: complete
Branch: main (production)
Build: pass (15/15 routes static)
Lint: pass (zero warnings)

Production URL
- https://ba-lubaale-ancestral-sanctuary.vercel.app

Project
- Name: ba-lubaale-ancestral-sanctuary
- Vercel team: okechbrian-5599s-projects
- Project ID: prj_o9V6q0DAbi8WC3nxn6B9EJKxY3mW
- Git linked: yes — okechbrian/ba-lubaale-ancestral-sanctuary connected
- Production branch: main
- Framework: Next.js (Turbopack)
- Root directory: ./

Deploy behaviour
- Push to main → production deploy (automatic)
- Push to any other branch or open PR → preview deploy (automatic)

Environment variables
- NEXT_PUBLIC_FORMSPREE_ENDPOINT: not set (form uses mailto:hello@ fallback)
- No other env vars configured

Build result
- 13 page routes + robots.txt + sitemap.xml = 15 static outputs
- All pages prerendered as static content
- No build errors, no lint warnings

Blockers for the owner
- None

What was not done (and why)
- Custom domain not attached — owner did not request one
- Formspree endpoint not set — owner does not yet have one
- No preview of individual route URLs — all routes confirmed via build output

How to verify
- Production: https://ba-lubaale-ancestral-sanctuary.vercel.app
- /the-land, /the-cave, /the-host, /immersions, /practices, /atelier, /prepare, /apply, /policies
- /robots.txt, /sitemap.xml
