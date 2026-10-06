/**
 * The /prepare text — ONE source used by both the public page and the
 * how-to-prepare email sent when a deposit clears. Edit here, both update.
 * Plain content file (not CMS): it is protocol text tied to the page layout,
 * and prices/policies are deliberately kept out of the content editors.
 */
export const prepareDefault = {
  hero: {
    title: "Prepare",
    lead: "What to know before you arrive. The sanctuary runs on protocols, not schedules.",
  },
  arrival: {
    heading: "Arrival",
    paragraphs: [
      "The sanctuary is reached by boat from the mainland. We arrange the crossing. Arrive at the designated jetty on the agreed day. Someone will be waiting.",
      "Bring light clothing, a head covering for sun, and shoes you can remove easily. Long-leg coverings are required on sacred ground. Garments can be obtained at the sanctuary if needed.",
    ],
    link: { label: "The journey", href: "/arrive" },
  },
  packing: {
    heading: "What to Bring",
    packTitle: "Pack",
    pack: [
      "Light, modest clothing",
      "Long-leg coverings for sacred ground",
      "Head covering for sun",
      "Easy-off shoes",
      "Insect repellent",
      "A journal or notebook",
    ],
    leaveTitle: "Leave Behind",
    leaveBehind: [
      "Expectations of Wi-Fi or signal",
      "A heavy schedule",
      "Alcohol or recreational drugs",
      "The need to document everything",
    ],
  },
  digitalSunset: {
    heading: "Digital Sunset",
    body: "Phones are silenced in the Lake House and never allowed in the cave. This is not a suggestion. The digital sunset protocol means no screens after dark. If you need to make an urgent call, step away from the shared spaces.",
  },
  substanceFree: {
    heading: "Substance-Free",
    body: "The sanctuary is alcohol-free and drug-free. No recreational substances. Plant-respect protocols apply to all herbal teas and remedies offered on the land.",
  },
  foodProtocol: {
    heading: "Female-Visitor Food Protocol",
    paragraphs: [
      "As a house and cultural rule, female visitors do not eat chicken or eggs while at the sanctuary. This is a traditional protocol rooted in the practices of this land. It applies to all female guests regardless of age, origin, or reason for visiting.",
      "The food served is island-grown and lake-sourced: fish, matooke, sweet potato, herbs, farm milk, fruit. The protocol is stated plainly here and will appear as a yes/no question on the application form.",
    ],
  },
  photography: {
    heading: "Photography",
    body: "Photography and recording are not permitted inside the cave or shrines. Outside the sacred spaces, photographs are welcome but never staged. Do not photograph other guests without permission.",
  },
  important: {
    heading: "Important",
    paragraphs: [
      "Fish feeding and chamber work are guided by the host and are never self-serve. You are shown what to do, and when.",
      "Sessions here are traditional, energetic, and artisanal. They complement and do not replace medical or psychiatric care. The sanctuary does not provide emergency or clinical services.",
    ],
  },
  cta: {
    heading: "Ready?",
    body: "This is a request, not a confirmed booking. We will be in touch within several days.",
    label: "Request an Immersion",
  },
} as const;

export type PrepareContent = typeof prepareDefault;
