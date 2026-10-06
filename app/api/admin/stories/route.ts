import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import {
  DuplicateSlugError,
  deleteStory,
  listAllStories,
  upsertStory,
} from "@/lib/db/growth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const storySchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().min(1, "A slug is required.").max(120),
    title: z.string().trim().min(1, "A title is required.").max(200),
    excerpt: z
      .string()
      .trim()
      .min(1, "An excerpt is required — it is what people read on the index.")
      .max(400),
    body: z.string().trim().min(1, "The story cannot be empty.").max(20_000),
    cover_image: z
      .string()
      .trim()
      .max(500)
      .refine((s) => !s || s.startsWith("/images/") || s.startsWith("https://"), {
        message: "Cover must be /images/<file> or an https URL.",
      })
      .optional(),
    cover_alt: z.string().trim().max(300).optional(),
    published: z.boolean().optional(),
    author: z.string().trim().max(120).optional(),
  })
  .strict();

/**
 * GET  /api/admin/stories  — every story, drafts included.
 * POST /api/admin/stories  — create (no id) or update (with id).
 *
 * Session-guarded. Saving validates before it writes, so a broken story can
 * never be published by accident.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const stories = await listAllStories();
    return Response.json({ ok: true, stories });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "story list failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "stories_unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = storySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { id, ...story } = parsed.data;
  try {
    const saved = await upsertStory({
      id,
      story: {
        slug: story.slug,
        title: story.title,
        excerpt: story.excerpt,
        body: story.body,
        coverImage: story.cover_image ?? null,
        coverAlt: story.cover_alt ?? null,
        published: story.published === true,
        author: story.author ?? null,
      },
    });
    return Response.json({ ok: true, story: saved });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    if (err instanceof DuplicateSlugError) {
      return Response.json({ error: "duplicate_slug" }, { status: 409 });
    }
    // SlugError and friends carry an operator-readable message.
    const message = err instanceof Error ? err.message : "unknown";
    if (message.includes("slug")) {
      return Response.json({ error: "invalid_slug", message }, { status: 400 });
    }
    console.error("story save failed:", message);
    return Response.json({ error: "story_save_failed" }, { status: 500 });
  }
}

/** DELETE /api/admin/stories — delete one story by id. */
export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const removed = await deleteStory(id);
    if (!removed) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "story delete failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "story_delete_failed" }, { status: 500 });
  }
}