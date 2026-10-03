import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  DuplicateSlugError,
  deleteStory,
  getPublishedStoryBySlug,
  insertGroupInquiry,
  listAllStories,
  listGroupInquiries,
  listPublishedStories,
  markInquiryHandled,
  upsertStory,
} from "@/lib/db/growth";

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DB = process.env.TEST_DATABASE_URL;
const HAS_DB = Boolean(TEST_URL && TEST_KEY && TEST_DB);

if (!HAS_DB) {
  console.warn(
    "[growth-integrity] SKIPPED: set TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_DATABASE_URL (npm run test:integrity starts the real local database).",
  );
}

describe.runIf(HAS_DB)("growth pages (real local Supabase)", () => {
  let pg: Client;
  const RUN = randomUUID().slice(0, 8);

  const story = (over: Record<string, unknown> = {}) => ({
    slug: `story-${RUN}-${randomUUID().slice(0, 8)}`,
    title: "The boat at dawn",
    excerpt: "Why the crossing starts before the light.",
    body: "First paragraph.\n\nSecond paragraph.",
    coverImage: "/images/lake-house.jpg",
    coverAlt: "The lake house at dawn",
    ...over,
  });

  beforeAll(async () => {
    process.env.SUPABASE_URL = TEST_URL!;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_KEY!;
    pg = new Client({ connectionString: TEST_DB });
    await pg.connect();
  }, 30_000);

  afterAll(async () => {
    await pg
      .query("delete from public.stories where slug like $1", [`%${RUN}%`])
      .catch(() => undefined);
    await pg
      .query("delete from public.group_inquiries where email like $1", [
        `%${RUN}%`,
      ])
      .catch(() => undefined);
    await pg.end().catch(() => undefined);
  });

  it("stores a story and keeps drafts out of the public listing", async () => {
    const draft = await upsertStory({ story: story({ published: false }) });

    expect(draft.published).toBe(false);
    expect(draft.published_at).toBeNull();
    // Visible to the owner…
    expect((await listAllStories()).some((s) => s.id === draft.id)).toBe(true);
    // …invisible to the public.
    expect((await listPublishedStories()).some((s) => s.id === draft.id)).toBe(
      false,
    );
    expect(await getPublishedStoryBySlug(draft.slug)).toBeNull();
  });

  it("publishes a story: listing, page lookup and date stamping", async () => {
    const draft = await upsertStory({ story: story({ published: false }) });
    const published = await upsertStory({
      id: draft.id,
      story: { ...draft, published: true } as never,
    });

    expect(published.published).toBe(true);
    expect(published.published_at).not.toBeNull();

    const found = await getPublishedStoryBySlug(draft.slug);
    expect(found?.id).toBe(draft.id);
    expect((await listPublishedStories()).some((s) => s.id === draft.id)).toBe(
      true,
    );
  });

  it("keeps datePublished stable across later edits", async () => {
    const created = await upsertStory({ story: story({ published: true }) });
    const firstPublishedAt = created.published_at;

    const edited = await upsertStory({
      id: created.id,
      story: { ...created, title: "Edited title" } as never,
    });
    expect(edited.title).toBe("Edited title");
    expect(edited.published_at).toBe(firstPublishedAt);
    expect(edited.updated_at >= created.updated_at).toBe(true);

    // Unpublish and republish: still the original date, never back-dated.
    const hidden = await upsertStory({
      id: created.id,
      story: { ...edited, published: false } as never,
    });
    expect(hidden.published_at).toBe(firstPublishedAt);
    const back = await upsertStory({
      id: created.id,
      story: { ...hidden, published: true } as never,
    });
    expect(back.published_at).toBe(firstPublishedAt);
  });

  it("unpublishing removes it from the listing but keeps the row", async () => {
    const created = await upsertStory({ story: story({ published: true }) });
    expect(await getPublishedStoryBySlug(created.slug)).not.toBeNull();

    await upsertStory({
      id: created.id,
      story: { ...created, published: false } as never,
    });
    expect(await getPublishedStoryBySlug(created.slug)).toBeNull();
    expect((await listAllStories()).some((s) => s.id === created.id)).toBe(true);
  });

  it("rejects a duplicate slug with a clear error, not a silent overwrite", async () => {
    const first = await upsertStory({ story: story({ published: true }) });
    await expect(
      upsertStory({ story: story({ slug: first.slug, title: "Impostor" }) }),
    ).rejects.toBeInstanceOf(DuplicateSlugError);

    // The original is untouched.
    const found = await getPublishedStoryBySlug(first.slug);
    expect(found?.title).toBe(first.title);
  });

  it("rejects an invalid slug before it can reach a URL", async () => {
    for (const slug of ["Not Kebab", "trailing-", "--leading", "with_underscore", ""]) {
      await expect(upsertStory({ story: story({ slug }) })).rejects.toThrow();
    }
    // A malformed slug is simply not found on the public path.
    expect(await getPublishedStoryBySlug("Not Kebab")).toBeNull();
  });

  it("normalises an uppercase slug rather than rejecting it", async () => {
    const created = await upsertStory({
      story: story({ published: true, slug: `Story-${RUN}-MixedCase` }),
    });
    // Stored lowercase, so one URL serves one story.
    expect(created.slug).toBe(`story-${RUN}-mixedcase`);
    expect((await getPublishedStoryBySlug(created.slug))?.id).toBe(created.id);
  });

  it("deletes a story and it leaves the listing", async () => {
    const created = await upsertStory({ story: story({ published: true }) });
    expect(await deleteStory(created.id)).toBe(true);
    expect(await deleteStory(created.id)).toBe(false);
    expect(await getPublishedStoryBySlug(created.slug)).toBeNull();
  });

  it("stores a group enquiry exactly as written", async () => {
    const row = await insertGroupInquiry({
      name: `Amos ${RUN}`,
      email: `amos-${RUN}@example.test`,
      organisation: "Ssese Tours",
      groupSize: 14,
      window: "July, flexible",
      message: "We run a circuit and would like to stop for a night.",
    });

    expect(row.handled).toBe(false);
    expect(row.group_size).toBe(14);
    expect(row.window).toBe("July, flexible");

    const listed = await listGroupInquiries();
    expect(listed.some((i) => i.id === row.id)).toBe(true);
  });

  it("accepts an enquiry with only the required fields", async () => {
    const row = await insertGroupInquiry({
      name: "Nameless operator",
      email: `nameless-${RUN}@example.test`,
      message: "Asking on behalf of a walking group of six.",
    });
    expect(row.organisation).toBeNull();
    expect(row.group_size).toBeNull();
    expect(row.window).toBeNull();
  });

  it("marks an enquiry handled exactly once", async () => {
    const row = await insertGroupInquiry({
      name: "Repeat",
      email: `repeat-${RUN}@example.test`,
      message: "Please mark me handled twice if you can.",
    });
    expect(await markInquiryHandled(row.id)).toBe(true);
    expect(await markInquiryHandled(row.id)).toBe(false);
    const after = (await listGroupInquiries()).find((i) => i.id === row.id);
    expect(after?.handled).toBe(true);
    expect(after?.handled_at).not.toBeNull();
  });
});