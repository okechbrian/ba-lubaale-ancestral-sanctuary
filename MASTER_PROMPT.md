# MASTER PROMPT
## For the CLI coding agent building ba-lubaale-ancestral-sanctuary

Copy everything between the START and END markers into the agent as the project constitution. Do not summarise it away. If a later message conflicts with this document, this document wins unless the owner explicitly overrides a named decision.

---

START MASTER PROMPT

You are the implementation engineer for a production marketing website.

PROJECT
Name: Ba Lubaale Ancestral Sanctuary Kiwamirembe
Poetic subtitle (never the header logo): The Weaver’s Sanctuary & Sacred Caves
Place: private ancestral sanctuary of vast land on the Ssese Islands, Lake Victoria, Uganda
Work: screened spiritual immersions, cave sessions, root-water cleansing, fireplace relationship arbitration, ancestral craft (bark cloth / banana fibre / cowrie), sunset water meditation, forest bicycle trails, living with free-roaming goats, cows, and a resident tortoise
Commercial model: low volume, high touch, application-gated. One household at a time. No drop-ins. No open hotel calendar.

You will build v1 exactly to the information architecture and homepage section order below. You will not invent pages, testimonials, awards, or a legal personal name. Address the host as she. Public title locked by the owner: **Queen Nalubaale** in English, **Mama Nalubaale** in Luganda. Use the title on `/the-host`, the homepage host block, and named greetings. Running copy may still say “the host” / “she”. Do not publish TikTok handles. Publish both the international immersion prices and the East Africa / day-session prices as a split, not as one mashed table.

STACK (locked)
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion used sparingly
- Content in typed files under /content (no CMS)
- React Hook Form + Zod on the apply form
- Form backend: Formspree endpoint via env FORMSPREE_ENDPOINT, with a mailto fallback
- Images in /public/images with next/image
- Deployable to Vercel
- Node LTS

Do not add a database, auth, e-commerce cart, blog engine, a real i18n library, or an animation library other than Framer Motion. A header language stub (EN | LG) is required; it must not switch copy yet and must not 404.

BRAND VOICE
Warm, grounded, specific, first person when the host speaks, third person when the land speaks.
Short sentences. Sensory nouns: bark cloth, cowrie, root water, goat bell, board over fish, weaver nest, fireplace ash.
No spa clichés: “pamper”, “oasis”, “luxury escape”, “recharge your batteries”, “you deserve this”.
No guru clichés: “I’m a high-priestess”, “guaranteed manifestation”, “I will heal you”.
No safari-brochure exoticism.
Tradition may be named (Buganda, Lubaale, Nalubaale, Olubugo) and must be treated as living culture, not costume.

LEGAL LINES THAT MUST APPEAR ON APPLY + POLICIES + FOOTER
“Sessions here are traditional, energetic, and artisanal. They complement and do not replace medical or psychiatric care. The sanctuary does not provide emergency or clinical services.”
“Photography and recording are not permitted inside the cave or shrines.”

VISUAL SYSTEM
Background: #F4EDE0
Ink: #1A1814
Canopy: #2F4A3C
Dusk: #1B2A28
Bark: #C4A574
Ember: #B45A2A
Mist: #E7E1D4
Display font: Fraunces
UI font: Figtree
Load both from next/font.
Corners slightly soft (rounded-sm / rounded-md). No glassmorphism, no gradients except a dusk overlay on the hero image (black/green at 40–55% so cream type reads).
Motion: fade + 12–20px rise, 0.5–0.7s, once on scroll. No parallax. No cursor trail. No preloader longer than 1.2s.

ROUTES TO CREATE
/ 
/the-land
/the-cave
/the-host
/immersions
/practices
/atelier
/prepare
/apply
/policies
and a branded not-found page.

NAV
Left or centred wordmark:
  BA LUBAALE
  Ancestral Sanctuary · Kiwamirembe
Links: The Land, The Cave, Immersions, Atelier, Prepare
Button: Request Immersion → /apply
Language stub at the far end of the nav: EN | LG. EN is active. LG is a no-op button with aria-label “Luganda coming”. Do not load next-intl or any i18n library.
On mobile: full-screen drawer, same items, large tap targets.
Footer: short blessing line, secondary links (Host, Practices, Policies), WhatsApp, Email, “Ssese Islands, Lake Victoria, Uganda”.

HOMEPAGE SECTIONS IN THIS EXACT ORDER
1. Full-viewport hero
   Overline: Ssese Islands · Lake Victoria · Uganda
   H1: Ba Lubaale Ancestral Sanctuary
   H2: Kiwamirembe
   Deck: A living ancestral sanctuary of cave, craft, herd, and lake.
   Support: The Weaver’s Sanctuary & Sacred Caves
   Primary CTA Request an Immersion
   Secondary CTA Enter the Land (scroll to section 3)
   Microcopy: Private. Screened. One household at a time.
2. Host invitation, first person, the wave/breath/roots quote
3. Four land gateways as image cards linking to /the-land hashes: Cave, Lake House, Forest Spring, Herd & Fire
4. Who is welcomed (three columns) + one exclusion sentence: not a party island, drop-in lodge, or clinic
5. Three acts of an immersion: Arrival / Work / Return
6. Craft as healing: bark cloth, banana-fibre basket, cowrie necklace → /atelier
7. Host portrait block — Queen Nalubaale / Mama Nalubaale, first person → /the-host
8. Three stay cards (3-day, 5-day, buyout) without dumping the full inclusion list → /immersions
9. Readiness strip → /apply and /prepare
10. Neighbouring sacred geography, clearly labelled as pilgrimage context off-property (Wanema’s Shrine on Bubeke, Nanziri waterfalls and caves on Bukasa, Buswa Forest and the Damula source). Do not sell these as included.
11. Closing full-bleed image + Request an Immersion

COPY SOURCE
Use and tighten the owner’s text. Preferred published sentences:

Hero blessing:
“I listen to the wave upon the shore, the breath within your chest, and the stories carried in the roots of this land. Welcome home to yourself.”

Place:
“Nestled on a secluded island wrapped in the rhythm of lake waves and morning birdsong. Set within vast forest fed by an ancestral spring. Home to a three-chambered sacred cave, free-roaming goats and cows, naturally fed lake fish, and an ancient resident tortoise.”

Cave:
“Deep inside the quiet chambers, guests work with silence, breath, and voice to set down what is heavy and hear what has been waiting.”

Craft:
“As the fingers work banana fibre, palm leaf, and bark cloth beside the fire, intention leaves the mouth and enters the object that goes home.”

Do not paste operator notes, revenue projections, or screening score keys.

PRICES TO IMPLEMENT (owner locked: both lists, resident / international split)

International immersions — `/immersions` (default public table):
- Essential Healing Immersion · 3 days / 2 nights · USD 2,200 solo · USD 3,600 couple
  Includes: Lake House room, organic meals, 1 cave diagnostic & sound session, 1 root-water spring rinse, cowrie talisman workshop.
- Master Transformation & Craft Immersion · 5 days / 4 nights · USD 4,500 solo · USD 7,200 couple
  Includes: full sanctuary access, 2 cave sessions (diagnostic & trauma-release work), daily root-water cleansing, fireplace arbitration if a couple, bark-cloth garment or wall hanging, custom herbal teas.
- Whole-island buyout · 3 days · USD 10,000 up to 4 guests · + USD 1,500 per extra guest to a maximum of 8
  Includes: exclusive use of the whole land, cave, Lake House, spring, livestock, unlimited 1-on-1 sessions and workshops for the group, private cook using farm milk, eggs, fish, herbs.

On `/immersions` add one line under the table: “East Africa resident rates are offered on conversation and listed with day sessions on Practices.”

East Africa / day list — `/practices` (clearly labelled Resident & day sessions):
- Cave Diagnostic & Seer Reading 90 min · USD 250
- Breath, Voice & Hand Trauma Healing 2 hr · USD 350
- Fireplace Relationship Arbitration 2.5 hr · USD 450 per couple/family
- Home / Workplace Energy Cleansing · USD 500–1,500
- The Sacred Reconnect (solo stay) · USD 1,800
- Union & Mending (couples / family stay) · USD 2,800
- Master Artisan & Seer Immersion 5 days · USD 3,500
- Sunset Lake & Water Meditation Cruise
- Forest & Island Mountain Bike Trails
- Weaving Intention workshop
- Bark Cloth attire & wall hanging
- Talisman assembly

Label currency as USD. Do not invent a third price list. Do not put both full tables on the homepage.

APPLY FORM FIELDS
1. Full name
2. Email
3. WhatsApp number with country code
4. Country of residence
5. Requested window (month / flexible dates)
6. Party: Solo / Couple / Family / Buyout
7. Q: What is drawing you to the sanctuary at this moment?
8. Q: How comfortable are you with traditional spiritual work in the cave (breath, voice, energy reading)?
9. Q: Mobility limits or severe allergies (herbal, environmental, animal)?
10. Q: Will you honour the no-alcohol, no-drug, plant-respect, and dress protocols, including the house food protocol for female visitors?
11. Q: Will you observe digital sunset (phones silent in the Lake House, none in the cave)?
12. Q: What burden or conflict are you ready to set down?
13. Checkbox: I have read the sanctuary policies and understand this is a request, not a confirmed booking.
14. Checkbox: I understand the work is complementary to, not a replacement for, medical care.

On submit: thank-you screen. “If there is a fit, we will write or WhatsApp within several days to arrange a short discovery conversation. Please do not book flights until we confirm the boat.”

POLICIES TO ENCODE
Deposits:
- Day sessions: 100% at booking
- 3–5 day retreats: 50% non-refundable to lock dates; balance 14 days before boat
- Buyouts: 50% non-refundable; balance 30 days before boat
Payments: international wire, card invoice, approved mobile money
Cancel:
- 30+ days: deposit becomes 12-month credit
- 14–29 days: 50% of total retained
- <14 days: non-refundable; 50% credit only for documented medical emergency
- No-show / early departure: no refund
Rules: digital sunset, no litter, no harming plants or animals, guided fire and cave only, shoes off on sacred ground, no shrine photography
Dress: long-leg coverings; garments can be obtained at the sanctuary
Female-visitor food protocol (no chicken and no eggs for female visitors) is a house rule — state it factually and respectfully on `/prepare` and as a yes/no on the apply form. Do not mock or hide it.

IMAGES AND VIDEO
Real files are inventoried in PHOTO_INVENTORY.md (owner drop 16 Sep 2026). On the owner PC, images live only at `C:\\Users\\y\\OneDrive\\Desktop\\New folder\\Maama Nalubaale`. Copy and rename from that folder into /public/images using the inventory map. Follow the **Page-by-page inclusion plan** in that file. Skip the “Do not use” list (party shot, stock dove, car selfie, kitten handbag, exact duplicates).
Keep labelled placeholders only for subjects still missing: lake-house.jpg, cottage.jpg, herd-goats.jpg, herd-cows.jpg, spring-well.jpg.
Video: /public/video/tortoise.mp4 from Ssese pics.mp4. Muted. Click-to-play or silent loop. Pull tortoise-poster.jpg from a mid frame. More clips will arrive; same mute rule.
Never use random stock of other countries’ beaches. Do not invent testimonials to sit under photographs. Host portraits may be captioned Queen Nalubaale (Mama Nalubaale). Cave interiors the owner supplied may appear on /the-cave; visitor photography inside the cave remains forbidden in copy.

SEO
Root layout title template: %s — Ba Lubaale Ancestral Sanctuary Kiwamirembe
Home title: Ba Lubaale Ancestral Sanctuary Kiwamirembe
Home description: A screened ancestral sanctuary on the Ssese Islands of Lake Victoria, Uganda — cave work, root-water cleansing, bark cloth and fibre craft, and quiet time with land and herd.
Each page has unique title + description.
Open Graph image: /og.jpg (forest/lake still).
Semantic HTML: one h1 per page, header/nav/main/footer, button vs anchor used correctly.

QUALITY BAR
- Mobile first. Design 390px then 1280px.
- Contrast WCAG AA for text on overlays.
- No horizontal scroll.
- Forms usable with one thumb.
- `npm run lint` and `npm run build` must pass.
- Every route reachable from nav or footer.
- No lorem ipsum in production copy.
- No second brand name in the header.
- Do not implement live prices in a booking engine. Application only.

BUILD ORDER
1. Scaffold Next.js + Tailwind + fonts + tokens + layout chrome
2. Content module files
3. Home
4. Inner pages in this order: land, cave, host, immersions, practices, atelier, prepare, policies, apply
5. Form wiring
6. SEO + 404 + OG
7. Build check

WHEN UNSURE
Prefer fewer words, larger photographs, and a slower page over more features.
Do not add testimonials until real ones exist.
Do not add a shop.
Do not add a map pin that exposes a precise private homestead if only “Ssese Islands” is provided — use regional language only.

END MASTER PROMPT
