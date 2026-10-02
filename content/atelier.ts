import type { AtelierBlock } from "@/lib/cms/blocks";

/** Default /atelier copy — verbatim from the original page. */
export const atelierDefault: AtelierBlock = {
  heroImage: {
    src: "/images/cowrie-four.jpg",
    alt: "Four women wearing cowrie strand necklaces",
  },
  heroLead:
    "As the fingers work banana fibre, palm leaf, and bark cloth beside the fire, intention leaves the mouth and enters the object that goes home.",
  bark: {
    heading: "Bark Cloth — Olubugo",
    paragraphs: [
      "The bark of the mutuba tree is beaten with wooden mallets until it becomes a soft, wearable cloth. This is one of Uganda's oldest textile traditions — UNESCO recognised. At the sanctuary, guests learn to measure, cut, and sew bark cloth into garments, wall hangings, and talisman wraps.",
      "You do not only speak the intention. You weave it, sew it, and carry it home.",
    ],
    image: {
      src: "/images/host-measuring-bark.jpg",
      alt: "Mama Nalubaale measuring bark cloth with tape",
    },
  },
  gallery: {
    heading: "Craft Gallery",
    images: [
      {
        src: "/images/bark-circle.jpg",
        alt: "Workshop circle with sheets of olubugo bark cloth",
      },
      {
        src: "/images/weaving-basket.jpg",
        alt: "Woman weaving a large basket from natural fibres",
      },
      {
        src: "/images/bark-dress-hearts.jpg",
        alt: "Bark cloth dress with decorative heart cutouts and cowrie trim",
      },
      {
        src: "/images/bark-dresses-stand.jpg",
        alt: "Finished bark-cloth dresses on a stand",
      },
      {
        src: "/images/bark-dresses-detail.jpg",
        alt: "Waist and cowrie detail on bark-cloth garments",
      },
      {
        src: "/images/bananas-woven-mats.jpg",
        alt: "Ripe bananas hanging beside woven mats in the cookhouse",
      },
    ],
  },
  finished: {
    heading: "Finished Pieces",
    images: [
      {
        src: "/images/cowrie-necklace-still.jpg",
        alt: "Finished cowrie and stone necklace",
      },
      {
        src: "/images/braided-bead-set.jpg",
        alt: "Braided bead necklace and bracelet set",
      },
      {
        src: "/images/cowrie-seed-necklace.jpg",
        alt: "Cowrie, seed, and white bead strand",
      },
    ],
  },
  worn: {
    heading: "Worn Craft",
    intro:
      "Cowrie strands, seed beads, and kente-stripe cloth — worn during ceremonies and made by hand at the sanctuary.",
    images: [
      {
        src: "/images/cowrie-two.jpg",
        alt: "Two women wearing cowrie necklaces",
      },
      {
        src: "/images/kente-shore-two.jpg",
        alt: "Two women in striped cloth by the lake",
      },
      {
        src: "/images/kente-water-rite.jpg",
        alt: "Water blessing at the shore",
      },
    ],
  },
};
