import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveContent } from "@/lib/cms";
import {
  atelierBlockSchema,
  caveBlockSchema,
  faqBlockSchema,
  hostBlockSchema,
  landBlockSchema,
  momentsBlockSchema,
  testimonialsBlockSchema,
} from "@/lib/cms/blocks";
import { parseInlineLinks } from "@/components/InlineText";
import { faqDefault } from "@/content/faq";
import { momentsDefault } from "@/content/moments";
import { testimonialsDefault } from "@/content/testimonials";
import { landDefault } from "@/content/the-land";
import { hostDefault } from "@/content/the-host";
import { caveDefault } from "@/content/the-cave";
import { atelierDefault } from "@/content/atelier";

const KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterAll(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("content defaults validate", () => {
  it("faqDefault passes its schema", () => {
    expect(faqBlockSchema.safeParse(faqDefault).success).toBe(true);
  });

  it("momentsDefault passes its schema", () => {
    expect(momentsBlockSchema.safeParse(momentsDefault).success).toBe(true);
  });

  it("the-land default passes its schema", () => {
    expect(landBlockSchema.safeParse(landDefault).success).toBe(true);
  });

  it("the-host default passes its schema", () => {
    expect(hostBlockSchema.safeParse(hostDefault).success).toBe(true);
  });

  it("the-cave default passes its schema", () => {
    expect(caveBlockSchema.safeParse(caveDefault).success).toBe(true);
  });

  it("atelier default passes its schema", () => {
    expect(atelierBlockSchema.safeParse(atelierDefault).success).toBe(true);
  });

  it("testimonials default passes its schema (three empty slots)", () => {
    expect(
      testimonialsBlockSchema.safeParse(testimonialsDefault).success,
    ).toBe(true);
  });

  it("rejects broken shapes (bad save can never publish)", () => {
    expect(faqBlockSchema.safeParse({ items: [] }).success).toBe(false);
    expect(faqBlockSchema.safeParse({ items: [{ q: "x" }] }).success).toBe(false);
    expect(
      momentsBlockSchema.safeParse({
        moments: [{ src: "javascript:alert(1)", alt: "x", caption: "y" }],
      }).success,
    ).toBe(false);
    expect(
      momentsBlockSchema.safeParse({
        moments: [{ src: "/images/a.jpg", alt: "", caption: "y" }],
      }).success,
    ).toBe(false);
    // testimonials: strict three slots, strings only, no extra keys.
    expect(
      testimonialsBlockSchema.safeParse({
        one: { quote: "Said out loud", author: "A guest" },
        two: { quote: "", author: "" },
        three: { quote: "", author: "" },
      }).success,
    ).toBe(true);
    expect(
      testimonialsBlockSchema.safeParse({
        one: { quote: 42, author: "" },
        two: { quote: "", author: "" },
        three: { quote: "", author: "" },
      }).success,
    ).toBe(false);
    expect(
      testimonialsBlockSchema.safeParse({
        one: { quote: "", author: "" },
        two: { quote: "", author: "" },
        three: { quote: "", author: "" },
        four: { quote: "", author: "" },
      }).success,
    ).toBe(false);
    expect(
      testimonialsBlockSchema.safeParse({
        one: { quote: "", author: "" },
        two: { quote: "", author: "" },
      }).success,
    ).toBe(false);
  });
});

describe("resolveContent", () => {
  it("returns in-repo defaults when the database is not configured", async () => {
    const faq = await resolveContent("content:faq", faqBlockSchema, faqDefault);
    expect(faq).toEqual(faqDefault);
    const moments = await resolveContent(
      "content:moments",
      momentsBlockSchema,
      momentsDefault,
    );
    expect(moments).toEqual(momentsDefault);
  });
});

describe("parseInlineLinks", () => {
  it("keeps plain text literal", () => {
    expect(parseInlineLinks("No links here.")).toEqual([
      { text: "No links here." },
    ]);
  });

  it("extracts a safe relative link", () => {
    expect(parseInlineLinks("See the [Policies](/policies) page.")).toEqual([
      { text: "See the " },
      { text: "Policies", href: "/policies" },
      { text: " page." },
    ]);
  });

  it("extracts multiple links", () => {
    expect(parseInlineLinks("[a](/x) and [b](https://example.com)")).toEqual([
      { text: "a", href: "/x" },
      { text: " and " },
      { text: "b", href: "https://example.com" },
    ]);
  });

  it("never produces unsafe hrefs", () => {
    expect(parseInlineLinks("[bad](javascript:alert)")).toEqual([
      { text: "bad(javascript:alert)" },
    ]);
    expect(parseInlineLinks("[bad](http://evil.example)")).toEqual([
      { text: "bad(http://evil.example)" },
    ]);
  });
});
