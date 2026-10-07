/** Client-side pre-upload processing: downscale to ≤2400px, encode WebP. */

const MAX_DIMENSION = 2400;
const QUALITY = 0.82;
/** Keeps a resized photo comfortably inside the bucket's 8 MB limit. */
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type PrepareFailure =
  /** e.g. a phone's HEIC — the browser cannot decode it and we will not lie. */
  | "unsupported_type"
  /** The browser could not produce a WebP from it. */
  | "cannot_resize"
  /** Even after downscaling it is too big for the bucket. */
  | "too_large";

export type PrepareResult =
  | { ok: true; file: File; resized: boolean }
  | { ok: false; reason: PrepareFailure };

/**
 * Prepare a photo for upload.
 *
 * This used to fall back to returning the ORIGINAL file whenever the browser
 * could not decode it, silently. That was how a 6 MB phone JPEG — or a HEIC
 * the browser would not touch — reached the server anyway, and the failure then
 * surfaced as an opaque platform error rather than anything the owner could act
 * on. Now every path that cannot produce a sane upload says so.
 */
export async function prepareImageUpload(file: File): Promise<PrepareResult> {
  // Check the type BEFORE trying to decode it: a HEIC would fail in
  // createImageBitmap anyway, but the owner gets a far better message.
  if (!ALLOWED.has(file.type)) {
    return { ok: false, reason: "unsupported_type" };
  }

  let canvas: HTMLCanvasElement | null = null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { ok: false, reason: "cannot_resize" };
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
  } catch {
    return { ok: false, reason: "cannot_resize" };
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas!.toBlob(resolve, "image/webp", QUALITY),
  );
  if (!blob || blob.type !== "image/webp") {
    return { ok: false, reason: "cannot_resize" };
  }
  if (blob.size > MAX_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  const out = new File([blob], `${base}.webp`, { type: "image/webp" });
  return { ok: true, file: out, resized: out.size !== file.size };
}