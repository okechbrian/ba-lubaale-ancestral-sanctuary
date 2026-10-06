import type { Metadata } from "next";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listAllStories } from "@/lib/db/growth";
import StoryEditor from "@/components/admin/StoryEditor";

export const metadata: Metadata = { title: "Stories" };
export const dynamic = "force-dynamic";

/**
 * /admin/stories — write, publish and retire stories.
 *
 * Drafts are invisible to the public: the listing, the post page and the
 * sitemap all filter on `published`, so leaving something half-written here
 * cannot leak it.
 */
export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  let stories: Awaited<ReturnType<typeof listAllStories>> = [];
  let dbMissing = false;
  try {
    stories = await listAllStories();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  const editing = edit ? stories.find((s) => s.id === edit) : undefined;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Stories</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Notes from the house, published on <code>/stories</code>. Each published
        story gets its own URL, appears in the sitemap and is marked up as an
        Article for search engines. Drafts stay invisible until you publish them.
      </p>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — stories cannot be written or listed.
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-2">
            {stories.length === 0 && (
              <li className="text-sm text-ink/60">No stories yet.</li>
            )}
            {stories.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-mist bg-white px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-medium text-ink">{s.title}</span>
                  <span className="ml-2 font-mono text-xs text-ink/40">
                    /{s.slug}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      s.published
                        ? "bg-canopy/15 text-canopy"
                        : "bg-bark-soft/20 text-ink/60"
                    }`}
                  >
                    {s.published ? "published" : "draft"}
                  </span>
                  <a
                    href={`/admin/stories?edit=${s.id}`}
                    className="font-semibold text-lake"
                  >
                    Edit
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-lg font-semibold text-ink">
            {editing ? `Edit: ${editing.title}` : "Write a story"}
          </h2>
          <StoryEditor
            key={editing?.id ?? "new"}
            initial={
              editing
                ? {
                    id: editing.id,
                    slug: editing.slug,
                    title: editing.title,
                    excerpt: editing.excerpt,
                    body: editing.body,
                    cover_image: editing.cover_image ?? "",
                    cover_alt: editing.cover_alt ?? "",
                    published: editing.published,
                    author: editing.author ?? "",
                  }
                : undefined
            }
          />
        </>
      )}
    </div>
  );
}