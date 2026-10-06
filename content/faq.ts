import type { FaqBlock } from "@/lib/cms/blocks";

/** Default FAQ — verbatim copy of the original /faq sections. */
export const faqDefault: FaqBlock = {
  items: [
    {
      q: "Do female visitors really avoid chicken and eggs?",
      paragraphs: [
        "As a house and cultural rule, female visitors do not eat chicken or eggs while at the sanctuary. This is a traditional protocol. It is stated plainly here and on the application form.",
      ],
    },
    {
      q: "Is the sanctuary a clinic?",
      paragraphs: [
        "No. The sanctuary does not provide medical or emergency services. Sessions here are traditional, energetic, and artisanal. They complement and do not replace medical or psychiatric care. The sanctuary does not provide emergency or clinical services.",
      ],
    },
    {
      q: "What should I bring?",
      paragraphs: [
        "Light, modest clothing. Long-leg coverings for sacred ground. A head covering for sun. Easy-off shoes — shoes off on sacred ground, and phones are silenced in the Lake House and never allowed in the cave.",
        "The digital sunset protocol means no screens after dark. Leave behind expectations of Wi-Fi or signal, a heavy schedule, alcohol or recreational drugs, and the need to document everything.",
      ],
    },
    {
      q: "Can several groups visit at once?",
      paragraphs: ["No. One household at a time. Private. Screened. Application-gated."],
    },
    {
      q: "May I take photographs?",
      paragraphs: [
        "Photography and recording are not permitted inside the cave or shrines. Outside the sacred spaces, photographs are welcome but never staged. Do not photograph other guests without permission.",
      ],
    },
    {
      q: "What about cancellation?",
      paragraphs: [
        "Terms are confirmed in writing after approval.",
        "The full terms are on the [Policies](/policies) page.",
      ],
    },
  ],
};
