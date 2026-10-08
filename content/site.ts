export const site = {
  name: "Ba Lubaale",
  subtitle: "Ancestral Sanctuary · Kiwamirembe",
  tagline: "The Weaver's Sanctuary & Sacred Caves",
  place: "Ssese Islands, Lake Victoria, Uganda",
  nav: [
    { label: "The Land", href: "/the-land" },
    { label: "The Cave", href: "/the-cave" },
    { label: "Immersions", href: "/immersions" },
    { label: "Stories", href: "/stories" },
    { label: "Fire circle", href: "/fire-circle" },
    { label: "Atelier", href: "/atelier" },
    { label: "Prepare", href: "/prepare" },
  ],
  footerSecondary: [
    { label: "Host", href: "/the-host" },
    { label: "Practices", href: "/practices" },
    { label: "For groups", href: "/for-groups" },
    { label: "Fire circle", href: "/fire-circle" },
    { label: "Vouchers", href: "/vouchers" },
    { label: "Policies", href: "/policies" },
  ],
  contact: {
    email: "queennalubaale@gmail.com",
    whatsapp: "",
  },
} as const;

export interface NavItem {
  label: string;
  href: string;
  description: string;
}

export const navigationGroups = {
  sanctuary: {
    label: "The Sanctuary",
    items: [
      {
        label: "The Land",
        href: "/the-land",
        description: "Forest, lake shore, sacred spring, herd, and ancient caves",
      },
      {
        label: "The Cave",
        href: "/the-cave",
        description: "Sacred chambers & guided healing sessions",
      },
      {
        label: "Queen Nalubaale",
        href: "/the-host",
        description: "Mama Nalubaale — seer, healer, and master artisan",
      },
    ],
  },
  experiences: {
    label: "Experiences",
    items: [
      {
        label: "Immersions",
        href: "/immersions",
        description: "Multi-day private retreats & whole-island buyouts",
      },
      {
        label: "Day Practices",
        href: "/practices",
        description: "Day sessions: diagnostic reading, breathwork, and fire arbitration",
      },
      {
        label: "The Atelier",
        href: "/atelier",
        description: "Bark cloth, banana fibre, and cowrie craft as healing",
      },
      {
        label: "For Groups",
        href: "/for-groups",
        description: "Retreat leaders, families, and private delegations",
      },
      {
        label: "The Fire Circle",
        href: "/fire-circle",
        description: "Monthly online evening. Her voice, then questions",
      },
    ],
  },
  visit: {
    label: "Visit & Plan",
    items: [
      {
        label: "Journey & Arrive",
        href: "/arrive",
        description: "Entebbe, ferry across the lake, and sanctuary boat",
      },
      {
        label: "How to Prepare",
        href: "/prepare",
        description: "Protocols, packing list, food traditions, and house rules",
      },
      {
        label: "Questions (FAQ)",
        href: "/faq",
        description: "Food, safety, photography, and bookings answered plainly",
      },
      {
        label: "Sanctuary Policies",
        href: "/policies",
        description: "Deposits, quiet hours, and cancellation terms",
      },
      {
        label: "Gift Vouchers",
        href: "/vouchers",
        description: "Gift an immersion or session at the sanctuary",
      },
    ],
  },
} as const;

