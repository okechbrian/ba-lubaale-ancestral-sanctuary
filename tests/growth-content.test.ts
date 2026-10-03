import { describe, expect, it } from "vitest";
import { MAX_SLUG_LENGTH, SLUG_PATTERN, slugify } from "@/lib/growth/slug";
import { groupInquirySchema } from "@/lib/growth/schema";
import { forGroupsBlockSchema } from "@/lib/cms/blocks";
import { forGroupsDefault } from "@/content/for-groups";

describe("slugify", () => {
  it("produces lowercase kebab-case URLs", () => {
    expect(slugify("The Boat at Dawn")).toBe("the-boat-at-dawn");
    expect(slugify("  Rain on the Lake  ")).toBe("rain-on-the-lake");
    expect(slugify("What's new?!")).toBe("what-s-new");
    expect(slugify("A---B")).toBe("a-b");
    expect(slugify("2026: a year")).toBe("2026-a-year");
  });

  it("strips diacritics instead of dropping the letters", () => {
    expect(slugify("Séances in the cave")).toBe("seances-in-the-cave");
  });

  it("never emits leading, trailing or doubled hyphens", () => {
    const slug = slugify("---hello   world!!!---");
    expect(slug).toBe("hello-world");
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });

  it("caps the length and does not end mid-hyphen", () => {
    const long = slugify("word ".repeat(60));
    expect(long.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(long.endsWith("-")).toBe(false);
  });

  it("returns an empty string for input with nothing sluggable", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });
});

describe("groupInquirySchema", () => {
  const valid = {
    name: "Amos",
    email: "amos@example.test",
    message: "We run a two-week circuit and would like to stop for a night.",
  };

  it("accepts a minimal enquiry and treats optional fields as optional", () => {
    const parsed = groupInquirySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("coerces group_size from a form string and rejects nonsense", () => {
    expect(
      groupInquirySchema.safeParse({ ...valid, group_size: "12" }).success,
    ).toBe(true);
    expect(
      groupInquirySchema.safeParse({ ...valid, group_size: 12.5 }).success,
    ).toBe(false);
    expect(
      groupInquirySchema.safeParse({ ...valid, group_size: "many" }).success,
    ).toBe(false);
    expect(
      groupInquirySchema.safeParse({ ...valid, group_size: 900 }).success,
    ).toBe(false);
  });

  it("requires a name, a valid email and a real message", () => {
    expect(groupInquirySchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(groupInquirySchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(groupInquirySchema.safeParse({ ...valid, message: "hi" }).success).toBe(false);
  });

  it("rejects unknown fields and a filled honeypot", () => {
    expect(
      groupInquirySchema.safeParse({ ...valid, surprise: true }).success,
    ).toBe(false);
    expect(
      groupInquirySchema.safeParse({ ...valid, website: "spam" }).success,
    ).toBe(false);
  });
});

describe("for-groups content block", () => {
  it("the shipped default is valid content", () => {
    expect(forGroupsBlockSchema.safeParse(forGroupsDefault).success).toBe(true);
  });

  it("carries no prices and no capacity claims", () => {
    // Content locks: a figure written here would be one the site invented.
    const text = JSON.stringify(forGroupsDefault);
    expect(text).not.toMatch(/\$\s?\d/); // no dollar amounts
    expect(text).not.toMatch(/\bUSD\b/i);
    expect(text).not.toMatch(/\bper (person|guest|night|day)\b/i);
    expect(text).not.toMatch(/\bup to \d+\b/i); // no capacity promise
    expect(text).not.toMatch(/\b\d+\s*(guests|people)\s+max\b/i);
    expect(text).not.toMatch(/\b\d{3,}\b/); // no large numbers at all
  });

  it("does not invent testimonials or partners", () => {
    const text = JSON.stringify(forGroupsDefault).toLowerCase();
    expect(text).not.toContain("testimonial");
    expect(text).not.toContain("partner");
    expect(text).not.toContain("as featured");
  });

  it("rejects a block missing its inquiry section", () => {
    const broken = { ...forGroupsDefault } as Record<string, unknown>;
    delete broken.inquiry;
    expect(forGroupsBlockSchema.safeParse(broken).success).toBe(false);
  });
});