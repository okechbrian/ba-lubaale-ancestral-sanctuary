import type { CaveBlock } from "@/lib/cms/blocks";

/** Default /the-cave copy — verbatim from the original page. */
export const caveDefault: CaveBlock = {
  heroImage: {
    src: "/images/og-cave-shore.jpg",
    alt: "Mossed rock mouth of Nalubaale Cave seen from the water",
  },
  heroLead:
    "Deep inside the quiet chambers, guests work with silence, breath, and voice to set down what is heavy and hear what has been waiting.",
  intro: {
    heading: "More Than a Hundred Caves",
    paragraphs: [
      "Ssese holds more than a hundred caves. Only three are open to guests. The rest are visited only after a calling from themselves, as they are never offered as an add-on to a booking and are not listed here.",
      "Sessions are guided by the host. You do not enter alone. You do not enter on a schedule. The cave keeps its own time.",
    ],
    image: {
      src: "/images/cave-silhouette.jpg",
      alt: "Silhouette in the mouth of Nalubaale Cave",
    },
  },
  chambers: {
    heading: "The Three Open Chambers",
    items: [
      {
        title: "Nalubaale Chamber",
        tagline: "focusing on motherhood, marriage, and prosperity, and achieving closeness after cleansing",
        body: "Belonging to Nalongo Nalubaale, the twin mother, who is a Queen and mother to creation. People appeal to her for childbearing, marriage, and prosperity. You may visit the cave; closeness to her requires deep spiritual and physical cleansing.",
      },
      {
        title: "Lubaale Musisi Chamber",
        tagline: "movement out of stagnation",
        body: "Known for movement and for the earthquake, and for waking every person from sleep. When your life has gone stagnant, this is the chamber to visit. Work with him may include his traditional diet.",
      },
      {
        title: "Lubaale Wanema Chamber",
        tagline: "order, when nothing lands right",
        body: "Father of Lubaale Mukasa. Reserved, and responsible for putting things straight. Go to him in the seasons when nothing you do lands right and people find fault in everything.",
      },
    ],
  },
  etiquette: {
    heading: "Cave Etiquette",
    items: [
      {
        title: "Shoes Off",
        body: "Shoes are removed before entering the cave. This is non-negotiable. Garments can be obtained at the sanctuary.",
      },
      {
        title: "No Phones or Photography",
        body: "Photography and recording are not permitted inside the cave or shrines. Phones are silenced before entry. The digital sunset rule applies here.",
      },
      {
        title: "Guided Only",
        body: "You do not wander the cave alone. Every session is led by the host or under her direction. The cave is a working sacred space, not a self-guided attraction.",
      },
      {
        title: "Traditional Work",
        body: "Sessions here are traditional, energetic, and artisanal. They complement and do not replace medical or psychiatric care. The sanctuary does not provide emergency or clinical services.",
      },
    ],
  },
  gallery: {
    heading: "Inside the Cave",
    intro:
      "These images were taken by the host. Visitor photography inside the cave remains forbidden.",
    images: [
      {
        src: "/images/bark-cloth-cave-entrance.jpg",
        alt: "Person in bark cloth standing at the rocky cave entrance",
      },
      {
        src: "/images/cave-threshold-hay.jpg",
        alt: "First chamber of Nalubaale Cave with hay on the floor",
      },
      {
        src: "/images/cave-mouth-congregation.jpg",
        alt: "Looking out toward the light from inside the cave",
      },
      {
        src: "/images/cave-kneeling.jpg",
        alt: "White cloth kneeling work inside the cave",
      },
      {
        src: "/images/bark-cloth-hillside.jpg",
        alt: "Person in bark cloth on the rocky hillside near the cave",
      },
    ],
  },
};
