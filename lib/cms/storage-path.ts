/**
 * Object-key policy for the public `cms` bucket.
 *
 * Kept in its own module so it can be tested directly. The important property
 * is not cosmetic: the key is built from a **sanitised stem**, never from raw
 * client input, so a filename containing path separators or traversal cannot
 * steer the write anywhere inside the bucket. The caller passes the filename
 * only as *material* to derive a slug from.
 */

export const CMS_BUCKET = "cms";

/** Matches the bucket's own `file_size_limit`. Storage enforces it for real. */
export const CMS_MAX_BYTES = 8 * 1024 * 1024;

export const CMS_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type CmsContentType = (typeof CMS_ALLOWED_TYPES)[number];

const EXT: Record<CmsContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function isAllowedCmsType(contentType: string): contentType is CmsContentType {
  return (CMS_ALLOWED_TYPES as readonly string[]).includes(contentType);
}

/**
 * Reduce a filename to `[a-z0-9-]`. Everything else — accents, spaces,
 * separators, `..`, control characters — becomes a single hyphen.
 */
export function safeStem(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  return (
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "photo"
  );
}

/**
 * Build the key the object will actually be stored under.
 *
 * `nowMs` is injected so the timestamp prefix is testable rather than
 * dependent on the clock. It is what stops two uploads of `photo.jpg` from
 * colliding, which is why `upsert` can safely stay false.
 */
export function buildCmsObjectPath(
  filename: string,
  contentType: CmsContentType,
  nowMs: number = Date.now(),
): string {
  return `${nowMs}-${safeStem(filename)}.${EXT[contentType]}`;
}