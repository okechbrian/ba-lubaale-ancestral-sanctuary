# Ba Lubaale Ancestral Sanctuary Kiwamirembe
## Website Master Plan — Follow This To The Dot

**Place:** Ba Lubaale Ancestral Sanctuary Kiwamirembe  
**Island heartland:** Ssese Islands, Lake Victoria, Uganda  
**Concept name:** The Weaver’s Sanctuary & Sacred Caves  
**Model:** Low-volume, application-gated, high-touch ancestral sanctuary  
**Site job:** Convert the right seeker into a screened application — not sell hotel nights.

This plan is the source of truth for architecture, copy hierarchy, design system, and build sequence. Pair it with `MASTER_PROMPT.md` when briefing the CLI coding agent.

---

## 1. What the source material actually is

The attached text is not one finished website. It is five overlapping drafts:

1. Cultural and place briefing (Ssese sacred geography, Lubaale, weaver birds)
2. Capacity and pricing models (international high-ticket + later local/day tiers)
3. Booking policy, screening, cancellation, etiquette
4. Service menu (healing, arbitration, craft, eco-exploration, space cleansing)
5. Multiple bios and homepage drafts with slightly different names and voices

### What is strong and must stay
- A real place: 10 acres, three-chambered cave, lake house over living water, spring under tree roots, free-roaming herds, resident tortoise, fireplace, forest trails.
- A real culture: Buganda / Ssese Lubaale cosmology, Nalubaale, bark cloth (Olubugo), banana fibre and palm weaving, cowrie talismans, coffee-bean offerings, shoe-off protocol.
- A real operating model: quiet, 1-on-1 cave work, no drop-ins, screening, digital sunset, substance-free.
- A hybrid that most wellness sites do not have: spiritual work + ancestral craft you take home + living farm/island ecology.

### What is weak and must not go on the site as-is
- Three conflicting price lists.
- Two brand names fighting each other (“Sanctuary of the Woven Root” vs “Ba Lubaale Ancestral Sanctuary Kiwamirembe”).
- First-person healer voice and third-person “our story” voice mixed without a rule. (Locked: first person when Queen Nalubaale / Mama Nalubaale speaks; third person when the land speaks.)
- “Mind readings / future reading” phrased like a fairground claim. Keep the practice. Soften the promise.
- Medical-adjacent claims (depression, trauma, childhood abuse) without a visible complementary-care disclaimer.
- Internal operator notes (“Evaluator Review Key”, revenue projections, “to scale my retreat”) leaking into guest copy.
- Nearby pilgrimage sites (Wanema’s Shrine, Nanziri Falls, Buswa Forest) listed as if they are on the same 10 acres. They are regional context, not on-property amenities.

### Locked naming
| Use | Do not use as primary |
|---|---|
| **Ba Lubaale Ancestral Sanctuary Kiwamirembe** | Sanctuary of the Woven Root (keep as poetic subtitle only) |
| The Weaver’s Sanctuary & Sacred Caves (concept line) | Generic “wellness retreat / spa / resort” |
| Nalubaale Cave | “1,000-year cave” as a scientific claim unless verified |
| Lake House | Hotel, lodge, resort language |
| Immersion / Sanctuary stay | Package holiday, tour |

---

## 2. Verdict on the two inspiration sites

### AfroSavvy (afrosavvy.com)
**What it is:** An indigenous African knowledge academy in Johannesburg. Vision, mission, courses, excursions, ancestral readings, team.

**Borrow:** ancestral African voice; clear offering families; lineage tone.
**Do not borrow:** academy / blog homepage; urban organisation feel; text-forward Wix energy.

AfroSavvy is a school. This project is a destination.

### Nubia Wellness & Healing (nubiawellnessandhealing.co.uk)
**What it is:** A UK CIC offering African-centred psychology, therapy, courses, and residential retreats.

**Borrow:** readiness and screening; service taxonomy; cultural-affirming language; complementary-care honesty.
**Do not borrow:** institutional CIC homepage; therapy-clinic IA; booking widgets as first impression.

Nubia is a practice. This project is a sanctuary on an island.

### Shared gap
Neither site makes you feel a place before you feel a programme. For Kiwamirembe, **land first, healer second, menu third, application last**.

---

## 3. The three better inspirations

1. Fivelements Retreat Bali — fivelementsbali.com — place-based sacred sanctuary pacing. Do not steal the hotel booking engine.
2. Aman Wellness — aman.com/wellness — quiet exclusivity, immersions not products. Do not steal global-luxury anonymity.
3. Goddess Retreats / Mana Sanctuary school — three-act scroll + gated conversion. Do not steal women-only goddess branding.

The site should feel like stepping off a wooden boat onto warm earth — slow, specific, sensory, and slightly protected.

---

## 4. What belongs on the website

Must: place, who is welcomed and who is not, land, cave, host, immersions, practices, atelier, arrival, prepare, apply, policies, human contact.

Keep off: revenue projections, evaluator scoring keys, unverified “thousand years” claims as science, other islands sold as amenities, trauma-marketing promises, raw price experiments.

Legal lines: complementary not clinical care; no guest photography in cave or shrines; protocols are not optional.

---

## 5. Information architecture

```
/                       Home (story + gateways)
/the-land               The island, forest, spring, lake house, animals
/the-cave               Nalubaale cave, what happens there, etiquette
/the-host               Queen Nalubaale / Mama Nalubaale
/immersions             3-day, 5-day, island buyout
/practices              Service menu (sessions, crafts, water, land)
/atelier                Craft gallery: bark cloth, baskets, cowrie
/prepare                Arrival, packing, rules, readiness
/apply                  Screening form + discovery call request
/policies               Payments, cancellation, disclaimer, privacy
```

Nav: The Land · The Cave · Immersions · Atelier · Prepare + Request Immersion.
Footer: Host, Practices, Policies, WhatsApp, Email, Ssese / Lake Victoria, Uganda.
v1 language: English + non-functional EN | LG stub. No i18n library.

---

## 6. Homepage — exact section order

1. Hero — full viewport. Overline Ssese Islands · Lake Victoria · Uganda. H1 Ba Lubaale Ancestral Sanctuary. H2 Kiwamirembe. Deck: A living ancestral sanctuary of cave, craft, herd, and lake. Support: The Weaver’s Sanctuary & Sacred Caves. CTAs: Request an Immersion / Enter the Land. Microcopy: Private. Screened. One household at a time.
2. Invitation strip, first person: I listen to the wave upon the shore, the breath within your chest, and the stories carried in the roots of this land. Welcome home to yourself.
3. Four land gateways: Nalubaale Cave, Lake House, Forest spring, Herd & fire.
4. Who is welcomed (three columns) + exclusion: not a party island, drop-in lodge, or clinic.
5. Three acts: Arrival / Work / Return.
6. Craft as healing → /atelier.
7. Host block — Queen Nalubaale · Mama Nalubaale → /the-host.
8. Three stay cards without full price dump → /immersions.
9. Readiness → /apply and /prepare.
10. Neighbouring sacred geography as pilgrimage context, not included products.
11. Closing full-bleed + Request an Immersion.

---

## 7. Page-by-page content map

See MASTER_PROMPT.md for prices, form fields, and policies. See PHOTO_INVENTORY.md for which photograph sits on which page.

/the-land: 10 acres, Lake House, spring, herds, tortoise, fireplace, trails, cruise, food, conservation.
/the-cave: three chambers; what a session is and is not; no shoes, phones, or photography; guided only.
/the-host: Queen Nalubaale / Mama Nalubaale; first-person bio; seer, healer, master artisan. No legal name. No TikTok.
/immersions: international table. Pointer to resident rates on /practices.
/practices: five families + East Africa / day list.
/atelier: gallery, no fake shop.
/prepare: prep, packing, digital sunset, substance-free, female-visitor food protocol, photography limits, disclaimer.
/apply: screening questions + consent. Request, not a booking.
/policies: deposits, cancel ladder, payments, safety, privacy, disclaimer.

---

## 8. Visual system

Lake dusk #1B2A28 · Forest canopy #2F4A3C · Bark cloth #C4A574 · Cowrie cream #F4EDE0 · Ember #B45A2A · Ink #1A1814 · Mist #E7E1D4
Display: Fraunces. UI: Figtree. Never Inter + Playfair.
Motion: fade and slight rise only. Video muted.
Photography: documentary, specific alt text, no safari cliché.

---

## 9. Stack

Next.js App Router + TypeScript + Tailwind + Framer Motion + content/*.ts + React Hook Form + Zod + Formspree + next/image + Vercel.
No CMS, Wix, Squarespace, or WordPress for v1.

---

## 10. Execution sequence

Phase 0 locked in DECISIONS.md.
Phase 1 Foundation — scaffold, tokens, chrome, empty routes.
Phase 2 Home — exact section order.
Phase 3 Inner pages — land → cave → host → immersions → practices → atelier → prepare → policies → apply.
Phase 4 Conversion — form + WhatsApp placeholder + policy checkbox.
Phase 5 Real media — inventory map.
Phase 6 Polish — SEO, 404, Vercel.

Still open: domain, email, WhatsApp, testimonials, goat/cow/lake-house/cottage/spring-well stills.

---

## 11. SEO

Title pattern: `Page — Ba Lubaale Ancestral Sanctuary Kiwamirembe`
English first. Geographic entity: Uganda, Kalangala / Ssese, Lake Victoria.

---

## 12. Open decisions

See DECISIONS.md. Agent must not invent domain, email, WhatsApp, or testimonials.

---

## 13. Definition of done for v1

- Homepage tells the story without requiring a menu click.
- Every nav item works.
- Apply form sends.
- Prices appear in one consistent system only.
- Disclaimer and cave photography rule are visible.
- Site is beautiful on a mid-range Android phone over 4G.
- No lorem ipsum. No operator notes. No second brand name in the header.
