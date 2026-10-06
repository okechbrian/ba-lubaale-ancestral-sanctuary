import type { TestimonialsBlock } from "@/lib/cms/blocks";

/**
 * Default guest voices — all three slots EMPTY, so the homepage section is
 * hidden until the owner enters real quotes in Admin → Content.
 * Never invent a quote: an empty slot is the honest default.
 */
export const testimonialsDefault: TestimonialsBlock = {
  one: { quote: "", author: "" },
  two: { quote: "", author: "" },
  three: { quote: "", author: "" },
};
