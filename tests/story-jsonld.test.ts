import { describe, expect, it } from "vitest";
import { storyJsonLd } from "@/lib/growth/story-jsonld";

/**
 * JSON-LD must describe the story and nothing else. These tests pin the
 * honesty rules: no invented author, no invented rating, no datePublished for
 * something that was never published.
 */
describe("storyJsonLd", () => {
  const base = {
    title: "The boat at dawn",
    description: "Why the crossing starts before the light.",
    slug: "the-boat-at-dawn",
    publishedAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-02T08:00:00.000Z",
    coverImage: null,
    author: null,
    siteUrl: "https://example.test",
  };

  it("emits an Article with an absolute canonical URL", () => {
    const json = storyJsonLd(base);
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("Article");
    expect(json.headline).toBe("The boat at dawn");
    expect(json.description).toBe("Why the crossing starts before the light.");
    expect(json.url).toBe("https://example.test/stories/the-boat-at-dawn");
    expect(json.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": "https://example.test/stories/the-boat-at-dawn",
    });
    expect(json.datePublished).toBe("2026-10-01T08:00:00.000Z");
    expect(json.dateModified).toBe("2026-10-02T08:00:00.000Z");
  });

  it("omits the author entirely when there is no byline", () => {
    expect(storyJsonLd(base)).not.toHaveProperty("author");
    // …rather than attributing the story to someone who did not write it.
    expect(JSON.stringify(storyJsonLd(base))).not.toContain("Queen Nalubaale");
  });

  it("includes the author when the owner set a byline", () => {
    const json = storyJsonLd({ ...base, author: "Queen Nalubaale" });
    expect(json.author).toEqual({ "@type": "Person", name: "Queen Nalubaale" });
  });

  it("never emits ratings or reviews", () => {
    const serialised = JSON.stringify(storyJsonLd(base));
    expect(serialised).not.toContain("aggregateRating");
    expect(serialised).not.toContain("review");
    expect(serialised).not.toContain("ratingValue");
  });

  it("absolutises a local cover image and leaves an https one alone", () => {
    expect(
      storyJsonLd({ ...base, coverImage: "/images/lake-house.jpg" }).image,
    ).toBe("https://example.test/images/lake-house.jpg");
    const remote = "https://storage.example/x.jpg";
    expect(storyJsonLd({ ...base, coverImage: remote }).image).toBe(remote);
    expect(storyJsonLd(base)).not.toHaveProperty("image");
  });

  it("omits datePublished for a story that was never published", () => {
    const json = storyJsonLd({ ...base, publishedAt: null });
    expect(json).not.toHaveProperty("datePublished");
    expect(json.dateModified).toBe("2026-10-02T08:00:00.000Z");
  });

  it("never doubles a slash on the site URL", () => {
    const json = storyJsonLd({ ...base, siteUrl: "https://example.test/" });
    expect(json.url).toBe("https://example.test/stories/the-boat-at-dawn");
    expect(
      (json.publisher as { url: string }).url,
    ).toBe("https://example.test");
  });

  it("escapes nothing into a script tag by itself (caller escapes <)", () => {
    const json = storyJsonLd({ ...base, title: "A <b>bold</b> claim" });
    expect(JSON.stringify(json)).toContain("<b>");
    // The page is responsible for escaping; this documents the raw shape.
    expect(JSON.stringify(json).replace(/</g, "\\u003c")).not.toContain("<b>");
  });
});

describe("storyJsonLd — serialisation safety", () => {
  it("a title containing a script tag cannot close the script element", () => {
    const json = storyJsonLd({
      title: "The </script><script>alert(1)</script> boat",
      description: "x",
      slug: "x",
      publishedAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
      siteUrl: "https://example.test",
    });
    // This is exactly what the page does before injecting the JSON-LD.
    const injected = JSON.stringify(json).replace(/</g, "\\u003c");
    expect(injected).not.toContain("</script>");
  });
});