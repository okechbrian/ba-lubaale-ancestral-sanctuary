import type { HostBlock } from "@/lib/cms/blocks";

/** Default /the-host copy — verbatim from the original page. */
export const hostDefault: HostBlock = {
  heroImage: {
    src: "/images/host-portrait-headwrap.jpg",
    alt: "Queen Nalubaale outdoors in a brown headwrap and gold collar",
  },
  bio: {
    heading: "Seer, Healer, Master Artisan",
    paragraphs: [
      "I work with voice, hands, breath, water, fire, wind, and earth, as well as with bark, cowrie, and root water beside the fire that has burned on this shore longer than any of us can remember. Being of Ssese origin, I am close to my ancestors.",
      "This sanctuary is not a place I started. It is a place I was given, and I knowingly inherited this responsibility in August 1998. The work I carry came from the women who kept this place long before me. It is old, it is living, and it is not mine to sell, but only to hold and share.",
      "My Munyoro mother taught me the techniques I work with here. Her mother, my grandmother and a princess of Tooro, raised me in my early years.",
      "I do not offer guarantees. I offer time, silence, and those techniques. What happens in the cave is between you and the space. I am the one who holds the door.",
    ],
    image: {
      src: "/images/host-measuring-bark.jpg",
      alt: "Queen Nalubaale measuring bark cloth with tape in the banana grove",
    },
  },
  work: {
    heading: "The Work",
    images: [
      {
        src: "/images/host-compound-walk.jpg",
        alt: "Queen Nalubaale walking through the compound in blue wax print",
      },
      {
        src: "/images/host-night-fire.jpg",
        alt: "Queen Nalubaale at night by the fire in bark cloth and cowrie",
      },
      {
        src: "/images/host-lake-scarf.jpg",
        alt: "Queen Nalubaale with green scarf, lake behind",
      },
    ],
  },
  quote: {
    text: "“I listen to the wave upon the shore, the breath within your chest, and the stories carried in the roots of this land. Welcome home to yourself.”",
    cite: "— Queen Nalubaale",
  },
};
