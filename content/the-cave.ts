import type { CaveBlock } from "@/lib/cms/blocks";

/** Default /the-cave copy from the owner's sanctuary document. */
export const caveDefault: CaveBlock = {
  heroImage: {
    src: "/images/og-cave-shore.jpg",
    alt: "Mossed rock mouth of Nalubaale Cave seen from the water",
  },
  heroLead:
    "More than a hundred caves. Three are open. The rest are visited only after a holy calling from themselves.",
  intro: {
    heading: "More Than a Hundred Caves",
    paragraphs: [
      "These are more than a hundred on the island, but only three are open to the public. The rest can be visited after a holy calling from themselves.",
      "Sessions are guided by the host. You do not enter alone. The cave keeps its own time.",
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
        tagline: "mother to all creation",
        body: "This belongs to Nalongo Nalubaale, twin mother Nalubaale, who is a Queen and mother to all creation. This motherhood makes it easy for people from all walks of life to appeal to her for any kind of challenge, from childbearing and marriage to prosperity. You may visit the cave, but getting her close to you requires deep spiritual and physical cleansing.",
      },
      {
        title: "Lubaale Musisi Chamber",
        tagline: "movement, waking, the earthquake",
        body: "He is known as the god of the earthquake. In our culture, when we fall asleep, he is responsible for waking every person daily. If you feel stagnant in any way, he is the one to talk to. People affected by the earthquake can have a dialogue with him. He is very good at generating movement in every aspect of life, spiritual or physical. All this is done through his diet.",
      },
      {
        title: "Lubaale Wanema Chamber",
        tagline: "putting things straight",
        body: "He is a father to Lubaale Mukasa. So reserved, he is responsible for putting things straight and right. There are times when you cannot do things right, and people find fault in everything you do. He is the one to talk to in that spiritual stage.",
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
        body: "Sessions here are traditional, energetic, spiritual, and artisanal. They complement and do not replace medical or psychiatric care. The sanctuary does not provide emergency or clinical services.",
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
