import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getPublishedStoryBySlug } from "@/lib/db/growth";
import { siteOrigin, storyJsonLd } from "@/lib/growth/story-jsonld";

export const revalidate = 60;

/** Only published stories have metadata; a draft 404s like any unknown slug. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const story = await getPublishedStoryBySlug(slug);
    if (!story) return { title: "Story not found" };
    return {
      title: `${story.title} — Ba Lubaale Ancestral Sanctuary`,
      description: story.excerpt,
      openGraph: {
        title: story.title,
        description: story.excerpt,
        type: "article",
        publishedTime: story.published_at ?? undefined,
        ...(story.cover_image ? { images: [story.cover_image] } : {}),
      },
    };
  } catch {
    // No database: no metadata to invent.
    return { title: "Stories — Ba Lubaale Ancestral Sanctuary" };
  }
}

/**
 * /stories/[slug] — one story.
 *
 * Unknown slug, draft and "the database is missing" all end in the same honest
 * 404 rather than an error page or an empty article.
 */
export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let story: Awaited<ReturnType<typeof getPublishedStoryBySlug>> = null;
  let dbMissing = false;
  try {
    story = await getPublishedStoryBySlug(slug);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }
  if (dbMissing || !story) notFound();

  const jsonLd = storyJsonLd({
    title: story.title,
    description: story.excerpt,
    slug: story.slug,
    publishedAt: story.published_at,
    updatedAt: story.updated_at,
    coverImage: story.cover_image,
    author: story.author,
    siteUrl: siteOrigin(),
  });

  return (
    <>
      <script
        type="application/ld+json"
        // Server-rendered from validated row data; < > escaped so a stray
        // character in a title cannot break out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <article className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link href="/stories" className="text-xs font-semibold text-lake">
            ← All stories
          </Link>
          <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {story.title}
          </h1>
          <p className="mt-3 text-sm text-ink/50">
            {story.author ?? "Ba Lubaale Ancestral Sanctuary"}
            {story.published_at && (
              <>
                {" · "}
                <time dateTime={story.published_at}>
                  {story.published_at.replace("T", " ").slice(0, 10)}
                </time>
              </>
            )}
          </p>

          {story.cover_image && (
            <img
              src={story.cover_image}
              alt={story.cover_alt ?? ""}
              className="mt-8 aspect-[3/2] w-full rounded-md object-cover"
            />
          )}

          <div className="mt-8 space-y-4 text-ink/80">
            {story.body.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}