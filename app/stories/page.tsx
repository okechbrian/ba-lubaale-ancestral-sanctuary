import type { Metadata } from "next";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listPublishedStories } from "@/lib/db/growth";

export const metadata: Metadata = {
  title: "Stories — Ba Lubaale Ancestral Sanctuary",
  description:
    "Notes from the sanctuary: the boat, the garden, the household, and the work of staying. Written by the house.",
};

export const revalidate = 60;

/**
 * /stories — the public index.
 *
 * Honest degradation: with no database the page says so plainly and shows no
 * posts, rather than rendering an empty grid that looks like "we have not
 * written anything yet". With a database but no published stories it says the
 * quieter, truer thing: nothing published yet.
 */
export default async function StoriesPage() {
  let stories: Awaited<ReturnType<typeof listPublishedStories>> = [];
  let dbMissing = false;
  try {
    stories = await listPublishedStories();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <>
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Stories
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            Notes from the house — the boat, the garden, the household, and what
            the land asks of us in a season. Written here by us, not by a
            marketing team.
          </p>
        </div>
      </section>

      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {dbMissing ? (
            <div className="rounded-md border border-ember/40 bg-ember/5 p-8">
              <p className="font-display text-xl text-ink">
                Stories are temporarily unavailable.
              </p>
              <p className="mt-3 text-sm text-ink/70">
                The story archive needs the site database, which is not
                configured right now. Please write to us in the meantime.
              </p>
            </div>
          ) : stories.length === 0 ? (
            <p className="text-ink/60">
              No stories are published yet. Please check back soon.
            </p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <li key={story.id}>
                  <a
                    href={`/stories/${story.slug}`}
                    className="group block h-full rounded-md border border-mist bg-white p-5 transition hover:border-bark"
                  >
                    {story.cover_image && (
                      <img
                        src={story.cover_image}
                        alt={story.cover_alt ?? ""}
                        className="mb-4 aspect-[3/2] w-full rounded object-cover"
                      />
                    )}
                    <h2 className="font-display text-lg font-semibold text-ink group-hover:text-lake">
                      {story.title}
                    </h2>
                    <p className="mt-2 text-sm text-ink/70">{story.excerpt}</p>
                    {story.published_at && (
                      <time
                        dateTime={story.published_at}
                        className="mt-3 block text-xs text-ink/40"
                      >
                        {story.published_at.replace("T", " ").slice(0, 10)}
                      </time>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}