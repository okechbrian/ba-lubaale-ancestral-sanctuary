import type { LandBlock } from "@/lib/cms/blocks";

/** Default /the-land copy. CMS can override this if a block is published. */
export const landDefault: LandBlock = {
  hero: {
    image: {
      src: "/images/forest-lake-view.jpg",
      alt: "A spreading tree with mossy buttress roots, the lake showing through the trunks",
    },
    lead:
      "A living ancestral sanctuary on Ssese, holy ground for the ba Lubaale, for those seeking peace, spiritual healing, and self-mastery.",
  },
  overview: {
    heading: "A Living Place",
    paragraphs: [
      "Ba Lubaale Ancestral Sanctuary Kiwamirembe is ground where the Lubaale of Ssese and Lake Nalubaale can be approached in a single visit, with the host holding the door. Ssese is home to the Lubaale of Buganda. They are regarded as the gods and goddesses of Africa, and this lake is their shared home.",
      "Many were not famous, and many were forgotten. They still carried profound healing, hunting, fishing, fighting, and other life-saving skills. This ground is where they chose to be met in peace, in one place.",
      "It is older than the people now standing on it. It was passed to me in 1998 by an old woman who attended it through a divine calling, while I was still in school.",
      "Their homes here are the lake, the caves, the forest, the grassland, the stones, the sacred trees, the springs, the traditionally built houses, and the sacred fire.",
      "The forest, the spring, the fire, the herd, and more than a hundred caves are here. Three of the caves are open to guests, namely Nalubaale, Lubaale Musisi, and Lubaale Wanema. The rest are visited only after a calling. [See the three open caves →](/the-cave)",
      "This holy ground can shed a weight you have carried knowingly or not. Nobody who has sat here has remained the same. The vastness gives you a spot of your soul's choice, to sit and talk to your higher self. Mornings are blessed with birdsong.",
    ],
    image: {
      src: "/images/lake-house.jpg",
      alt: "The Lake House over Lake Victoria, framed by mango trees",
    },
  },
  features: [
    {
      title: "The Lake House",
      body: "Organic meals cooked from the island, including fish, herbs, farm milk, matooke, and sweet potato. It is not a guest bedroom.",
      image: {
        src: "/images/lake-house.jpg",
        alt: "The Lake House over Lake Victoria",
      },
    },
    {
      title: "The Forest",
      body: "Tropical forest set against the grassland that surrounds it. An ancient tree stands inside, and the full-time spring rises in its roots. Birds, monkeys, and butterflies are present, along with the sound of water that is not always seen. Weaver nests hang in the branches above the path to the cave.",
      image: {
        src: "/images/forest-canopy.jpg",
        alt: "Dense canopy of indigenous trees in the sanctuary forest",
      },
    },
    {
      title: "The Springs",
      body: "A full-time spring rises in the roots of the ancient tree, clean water used for cleansing before and after cave sessions. Seasonal wells open and close with the rains. Neither is a tourist stop. Both are working practice.",
    },
    {
      title: "The Herd",
      body: "Free-roaming goats and cows. Naturally fed. Goat bell at dusk. The herd is part of the land, not a photo opportunity. Guest interaction is welcome but never staged.",
      image: {
        src: "/images/herd-goats.jpg",
        alt: "Free-roaming goats in the sanctuary compound",
      },
    },
    {
      title: "The Fire",
      body: "Fire burns on the shore most evenings. Evening conversation here, with the host and her people. The day is laid down before sleep.",
    },
    {
      title: "The Resident Tortoise",
      body: "Mutaka, a leopard tortoise who has lived on the island longer than any current guest. Seen most afternoons on the stony shore.",
    },
  ],
  lakeHouse: {
    heading: "The Lake House",
    blurb:
      "The Lake House sits on the water and hosts the ba Lubaale who stay in the lake. Fish feeding is done here, always guided. Guests do not sleep here.",
  },
  food: {
    heading: "Island Food",
    intro:
      "Everything served at the sanctuary comes from the island or the lake. Fish caught that morning. Matooke from the garden. Herbs from the forest. Milk from the herd.",
    images: [
      {
        src: "/images/fresh-tilapia.jpg",
        alt: "Fresh tilapia caught from Lake Victoria",
      },
      {
        src: "/images/pineapple-farm-lake.jpg",
        alt: "Pineapple farm on the hillside with Lake Victoria behind",
      },
      {
        src: "/images/bark-cloth-banana-harvest.jpg",
        alt: "Preparing banana harvest in the cookhouse",
      },
    ],
  },
  forest: {
    heading: "The Forest",
    paragraphs: [
      "Tropical forest against the grassland that surrounds it. An ancient tree stands inside, and the full-time spring rises in its roots, providing clean water that is both sacred and healing. Seasonal wells come and go with the rains. Birds, monkeys, butterflies, and the sound of water that is not always seen.",
      "Trails wind through the canopy to the far shore. Bicycle paths for those who want to move. Still spots for those who want to sit.",
    ],
    images: [
      {
        src: "/images/forest-lake-view.jpg",
        alt: "Moss-covered tree with Lake Victoria visible through the forest canopy",
      },
      {
        src: "/images/forest-canopy.jpg",
        alt: "Dense canopy of indigenous trees in the sanctuary forest",
      },
    ],
  },
  arrival: {
    heading: "Arrival by Boat",
    paragraphs: [
      "The sanctuary is reached by boat from the mainland. The crossing takes you past islands, fishing villages, and open water. The sound of the engine fades before the shore comes into view.",
      "There is no dock sign. No resort flag. A wooden jetty, warm earth, and someone waiting.",
    ],
    image: {
      src: "/images/arrival-canoe.jpg",
      alt: "Wooden canoe crossing to the sanctuary island",
    },
  },
  tortoise: {
    heading: "The Resident Tortoise",
    blurb:
      "Mutaka rests on the stony shore, silent and patient, and older than any of us can say.",
  },
};
