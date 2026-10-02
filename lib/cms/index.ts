import type { z } from "zod";
import { getDb } from "@/lib/db/client";

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
