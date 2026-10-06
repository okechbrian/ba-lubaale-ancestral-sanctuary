import "server-only";
import { getDb } from "@/lib/db/client";
import { MAX_SLUG_LENGTH, SLUG_PATTERN } from "@/lib/growth/slug";
import type { GroupInquiryRow, StoryRow } from "@/lib/db/types";

/** Re-exported so server callers have one import for slug rules. */
export { MAX_SLUG_LENGTH, SLUG_PATTERN, slugify } from "@/lib/growth/slug";

/**
 * Slug rules: lowercase kebab-case. The database has a CHECK for the same
 * pattern, so this is the friendly version of the same rule — a bad slug is
 * rejected before it can reach a URL.
 */
export class SlugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlugError";
  }
}

export function assertValidSlug(slug: string): string {
  const clean = slug.trim().toLowerCase();
  if (!clean) throw new SlugError("A slug is required.");
  if (clean.length > MAX_SLUG_LENGTH) {
    throw new SlugError(`Keep the slug under ${MAX_SLUG_LENGTH} characters.`);
  }
  if (!SLUG_PATTERN.test(clean)) {
    throw new SlugError(
      "Use lowercase letters, numbers and single hyphens only (e.g. the-boat-at-dawn).",
    );
  }
  return clean;
}

export interface NewStory {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage?: string | null;
  coverAlt?: string | null;
  published?: boolean;
  author?: string | null;
}

/** Published stories, newest first — what /stories shows. */
export async function listPublishedStories(
  limit = 50,
): Promise<StoryRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("stories")
    .select("*")
    .eq("published", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listPublishedStories failed: ${error.message}`);
  return (data ?? []) as StoryRow[];
}

/** Every story, drafts included — the admin editor's list. */
export async function listAllStories(): Promise<StoryRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listAllStories failed: ${error.message}`);
  return (data ?? []) as StoryRow[];
}

/** Published story by slug. Drafts and unknown slugs are indistinguishable. */
export async function getPublishedStoryBySlug(
  slug: string,
): Promise<StoryRow | null> {
  let clean: string;
  try {
    clean = assertValidSlug(slug);
  } catch {
    return null;
  }
  const db = getDb();
  const { data, error } = await db
    .from("stories")
    .select("*")
    .eq("slug", clean)
    .eq("published", true)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new Error(`getPublishedStoryBySlug failed: ${error.message}`);
  return (data as StoryRow | null) ?? null;
}

export async function getStoryById(id: string): Promise<StoryRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("stories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getStoryById failed: ${error.message}`);
  return (data as StoryRow | null) ?? null;
}

export class DuplicateSlugError extends Error {
  constructor(slug: string) {
    super(`A story already uses the slug "${slug}".`);
    this.name = "DuplicateSlugError";
  }
}

/**
 * Create or update a story.
 *
 * `published_at` is stamped the first time a story goes live and never changed
 * afterwards, so JSON-LD's datePublished stays truthful. Unpublishing keeps it
 * (the story may return), but the story leaves the listing, the post page and
 * the sitemap.
 */
export async function upsertStory(input: {
  id?: string;
  story: NewStory;
}): Promise<StoryRow> {
  const db = getDb();
  const slug = assertValidSlug(input.story.slug);
  const now = new Date().toISOString();

  if (input.id) {
    const existing = await getStoryById(input.id);
    if (!existing) throw new Error("No such story.");
    // Stamped only when the story goes from unpublished to published. Comparing
    // `published` alone would re-stamp on every save while published, which
    // would move datePublished forward — the opposite of what it means.
    const publishing =
      input.story.published === true && existing.published_at === null;
    const { data, error } = await db
      .from("stories")
      .update({
        slug,
        title: input.story.title,
        excerpt: input.story.excerpt,
        body: input.story.body,
        cover_image: input.story.coverImage ?? null,
        cover_alt: input.story.coverAlt ?? null,
        published: input.story.published === true,
        published_at: publishing ? now : existing.published_at,
        author: input.story.author ?? null,
        updated_at: now,
      })
      .eq("id", input.id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateSlugError(slug);
      throw new Error(`update story failed: ${error.message}`);
    }
    return data as StoryRow;
  }

  const published = input.story.published === true;
  const { data, error } = await db
    .from("stories")
    .insert({
      slug,
      title: input.story.title,
      excerpt: input.story.excerpt,
      body: input.story.body,
      cover_image: input.story.coverImage ?? null,
      cover_alt: input.story.coverAlt ?? null,
      published,
      published_at: published ? now : null,
      author: input.story.author ?? null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new DuplicateSlugError(slug);
    throw new Error(`create story failed: ${error.message}`);
  }
  return data as StoryRow;
}

export async function deleteStory(id: string): Promise<boolean> {
  const db = getDb();
  const { data, error } = await db
    .from("stories")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`deleteStory failed: ${error.message}`);
  return ((data ?? []) as { id: string }[]).length === 1;
}

export interface NewGroupInquiry {
  name: string;
  email: string;
  organisation?: string | null;
  groupSize?: number | null;
  /**
   * The window a group is considering, as free text. The column is quoted
   * ("window") because WINDOW is reserved in SQL — but the field name here is
   * plain `window`, since that is what callers read and write.
   */
  window?: string | null;
  message: string;
}

/** Store a group enquiry. Nothing here implies a quote or a booking. */
export async function insertGroupInquiry(
  input: NewGroupInquiry,
): Promise<GroupInquiryRow> {
  const db = getDb();
  const { data, error } = await db
    .from("group_inquiries")
    .insert({
      name: input.name,
      email: input.email,
      organisation: input.organisation ?? null,
      group_size: input.groupSize ?? null,
      window: input.window ?? null,
      message: input.message,
      // (no special handling needed: supabase-js quotes the identifier)
    })
    .select()
    .single();
  if (error) throw new Error(`insertGroupInquiry failed: ${error.message}`);
  return data as GroupInquiryRow;
}

export async function listGroupInquiries(limit = 200): Promise<GroupInquiryRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("group_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listGroupInquiries failed: ${error.message}`);
  return (data ?? []) as GroupInquiryRow[];
}

export async function markInquiryHandled(id: string): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("group_inquiries")
    .update({ handled: true, handled_at: now })
    .eq("id", id)
    .eq("handled", false)
    .select("id");
  if (error) throw new Error(`markInquiryHandled failed: ${error.message}`);
  return ((data ?? []) as { id: string }[]).length === 1;
}