import "server-only";

/**
 * JSON-LD for a story, as schema.org/Article.
 *
 * Built from the row and nothing else. Two rules keep it honest:
 *   - no `aggregateRating`, no `review`, no invented `wordCount` — we do not
 *     publish opinions we have not measured;
 *   - no `author` at all when the story has no byline, rather than attributing
 *     it to someone who did not write it.
 *
 * The caller passes the absolute site URL so the JSON is never relative.
 */
export interface StoryJsonLdInput {
  title: string;
  description: string;
  slug: string;
  /** ISO date, or null for a story that was never published. */
  publishedAt: string | null;
  updatedAt: string;
  coverImage?: string | null;
  author?: string | null;
  siteUrl: string;
}

export function storyJsonLd(input: StoryJsonLdInput): Record<string, unknown> {
  const url = `${input.siteUrl.replace(/\/$/, "")}/stories/${input.slug}`;
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    // Only a published story has a datePublished; omit rather than guess.
    ...(input.publishedAt
      ? { datePublished: input.publishedAt, dateModified: input.updatedAt }
      : { dateModified: input.updatedAt }),
    publisher: {
      "@type": "Organization",
      name: "Ba Lubaale Ancestral Sanctuary",
      url: input.siteUrl.replace(/\/$/, ""),
    },
  };
  if (input.author) {
    json.author = { "@type": "Person", name: input.author };
  }
  if (input.coverImage) {
    json.image = input.coverImage.startsWith("http")
      ? input.coverImage
      : `${input.siteUrl.replace(/\/$/, "")}${input.coverImage}`;
  }
  return json;
}

/** Absolute site origin, from the same env var every email uses. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://ba-lubaale.vercel.app").replace(
    /\/$/,
    "",
  );
}