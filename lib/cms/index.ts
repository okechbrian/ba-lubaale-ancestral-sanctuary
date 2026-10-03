import type { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  CMS_KEYS,
  atelierBlockSchema,
  caveBlockSchema,
  faqBlockSchema,
  forGroupsBlockSchema,
  hostBlockSchema,
  landBlockSchema,
  momentsBlockSchema,
  testimonialsBlockSchema,
} from "@/lib/cms/blocks";

/** Every owner-editable block: settings key  zod schema (save validates). */
export const CMS_REGISTRY = {
  [CMS_KEYS.moments]: momentsBlockSchema,
  [CMS_KEYS.faq]: faqBlockSchema,
  [CMS_KEYS.testimonials]: testimonialsBlockSchema,
  [CMS_KEYS.theLand]: landBlockSchema,
  [CMS_KEYS.theHost]: hostBlockSchema,
  [CMS_KEYS.theCave]: caveBlockSchema,
  [CMS_KEYS.atelier]: atelierBlockSchema,
  [CMS_KEYS.forGroups]: forGroupsBlockSchema,
} as const;

export class UnknownCmsKeyError extends Error {
  constructor(public key: string) {
    super(`Unknown content block: ${key}`);
  }
}

export class InvalidCmsContentError extends Error {
  constructor(public issues: { path: (string | number)[]; message: string }[]) {
    super("Content failed validation");
  }
}

/**
 * Owner-editable content overrides, stored in the `settings` table under a
 * `content:*` key (same honest pattern as pricing settings):
 *
 * - database not configured  → in-repo defaults (site never breaks)
 * - override fails validation → in-repo defaults (a bad admin save can never
 *   publish broken content; the admin API surfaces the error instead)
 *
 * The public pages re-render every `revalidate` seconds, so owner edits
 * appear within a minute without a redeploy.
 */
export async function resolveContent<Block>(
  key: string,
  schema: z.ZodType<Block>,
  defaults: Block,
): Promise<Block> {
  try {
    const db = getDb();
    const { data, error } = await db
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data?.value) return defaults;
    const parsed = schema.safeParse(data.value);
    return parsed.success ? parsed.data : defaults;
  } catch {
    return defaults;
  }
}

/** Raw override value for a known block key; undefined = no override (or no DB). */
export async function getContentOverride(key: string): Promise<unknown> {
  try {
    const schema = CMS_REGISTRY[key as keyof typeof CMS_REGISTRY];
    if (!schema) return undefined;
    const db = getDb();
    const { data, error } = await db
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return undefined;
    return data.value ?? undefined;
  } catch {
    return undefined;
  }
}

/** Validate + persist an override. Throws Unknown/Invalid/Database errors. */
export async function saveContent(key: string, value: unknown): Promise<void> {
  const schema = CMS_REGISTRY[key as keyof typeof CMS_REGISTRY];
  if (!schema) throw new UnknownCmsKeyError(key);
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidCmsContentError(
      parsed.error.issues.map((i) => ({
        path: i.path.map((p) => (typeof p === "symbol" ? String(p) : p)),
        message: i.message,
      })),
    );
  }
  const db = getDb();
  const { error } = await db
    .from("settings")
    .upsert([{ key, value: parsed.data }], { onConflict: "key" });
  if (error) throw new Error(`saveContent failed: ${error.message}`);
}

/** Remove an override — the site falls back to the in-repo defaults. */
export async function deleteContent(key: string): Promise<void> {
  const schema = CMS_REGISTRY[key as keyof typeof CMS_REGISTRY];
  if (!schema) throw new UnknownCmsKeyError(key);
  const db = getDb();
  const { error } = await db.from("settings").delete().eq("key", key);
  if (error) throw new Error(`deleteContent failed: ${error.message}`);
}
