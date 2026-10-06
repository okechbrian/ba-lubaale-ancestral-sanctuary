/**
 * Slug rules for story URLs — safe to import from a client component (it is
 * pure string logic, no database).
 *
 * Kept separate from lib/db/growth.ts (which is `server-only`) so the admin
 * editor can auto-fill a slug from the title without dragging server code into
 * the browser bundle.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 80;

/** Best-effort slug from a title; the owner can still edit it by hand. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics: "Sé" -> "Se"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}