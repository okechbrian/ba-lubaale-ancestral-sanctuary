import type { MetadataRoute } from "next";
import { listPublishedStories } from "@/lib/db/growth";

/**
 * Sitemap.
 *
 * Static pages are listed unconditionally; published stories are read from the
 * database. With no database the story URLs are simply absent — the sitemap must
 * never advertise a page that would 404 for everyone.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ba-lubaale-ancestral-sanctuary.vercel.app";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/the-land`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/the-cave`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/the-host`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/immersions`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/practices`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/atelier`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/prepare`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/arrive`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/for-groups`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/vouchers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/policies`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  let stories: Awaited<ReturnType<typeof listPublishedStories>> = [];
  try {
    stories = await listPublishedStories(200);
  } catch {
    // No database: no story URLs. An absent entry is honest; a broken one is not.
    stories = [];
  }

  const storyEntries: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${base}/stories/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticEntries, ...storyEntries];
}