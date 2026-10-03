import type { ForGroupsBlock } from "@/lib/cms/blocks";

/**
 * Default copy for /for-groups — the shape of the page, not business claims.
 *
 * Hard rules baked into this default:
 *   - no prices, no capacity numbers, no availability promises. A group visit is
 *     quoted in conversation, and any figure written here would be one the site
 *     invented rather than one the owner confirmed;
 *   - no testimonials or named partners;
 *   - the inquiry copy asks for what an operator actually needs (size, window,
 *     shape) without promising a reply time.
 *
 * The owner edits all of it in Admin → Content.
 */
export const forGroupsDefault: ForGroupsBlock = {
  hero: {
    heading: "For tour operators and retreat leaders",
    lead: "Ba Lubaale is a private sanctuary on the lake. It can host a group that arrives together — a tour company with a fixed window, a retreat house with a season of silence, a school coming to learn where they sit. The shape is set in conversation, not by a package.",
    image: {
      src: "/images/lake-house.jpg",
      alt: "The lake house at Ba Lubaale Ancestral Sanctuary",
    },
  },
  intro: {
    heading: "What a group visit looks like",
    paragraphs: [
      "A group here is not a conference with beds attached. It is a household that has to work: the boat runs when the water is right, the garden is tended, the meals are cooked, and everyone who comes shares that work according to what they can carry.",
      "We plan the days together before anyone travels. That conversation covers the window you have, the shape of your group, what you want people to leave with, and what you are willing to be part of while they are here.",
    ],
  },
  offerings: [
    {
      title: "Tour operators",
      body: "If you run regular routes through this part of Uganda, a stop here can be an evening and a morning rather than a stop-and-go. Tell us the window you are working to and we will say plainly whether it fits.",
    },
    {
      title: "Retreat houses and facilitators",
      body: "Silence, practice and structure over consecutive days, with the same people in the same place from waking to sleep. Facilitators are welcome to hold their own sessions; the rest of the day belongs to the land and the household.",
    },
    {
      title: "Schools and study groups",
      body: "Students who are learning about the lake, the soil and the boat can learn them from the inside. Group enquiry only — we will not take a class large enough to disturb the house.",
    },
  ],
  planning: {
    heading: "Planning a group visit",
    items: [
      {
        title: "Group size",
        body: "The house has to run as a household with you in it, so the number you can bring is a conversation, not a number on this page. Tell us how many and we will answer honestly.",
      },
      {
        title: "Dates and seasons",
        body: "Tell us the window you are considering rather than fixed dates. What is possible depends on the water, the garden and who is in the house.",
      },
      {
        title: "Accommodation and meals",
        body: "Beds are simple and shared by arrangement; food is grown and cooked here. Everything else — what is possible, what it asks of you — is settled in the conversation before you travel.",
      },
      {
        title: "What we ask of a group",
        body: "Participation in the daily work, respect for the silence after dark, and no alcohol on the sanctuary. These are house rules, not terms of trade.",
      },
    ],
  },
  inquiry: {
    heading: "Write to us about your group",
    paragraphs: [
      "Tell us who you are, roughly how many people you have in mind, the window you are considering, and what you want the days to do.",
      "This form does not book anything and asks for no payment. We read every enquiry and reply by email with an honest answer — including when the answer is that it will not work.",
    ],
  },
  closing: {
    heading: "Before you write",
    paragraphs: [
      "If your dates are fixed and your group is large, write early: it is better to have a clear no than a hopeful maybe.",
    ],
  },
};