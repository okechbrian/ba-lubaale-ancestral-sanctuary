import { prepareImageUpload, type PrepareFailure } from "./resize";

/**
 * Upload one photo into the public `cms` bucket.
 *
 * Two steps, and the bytes only cross the network once:
 *   1. ask the server to authorise this exact upload -> a signed Storage URL
 *   2. PUT the photo straight to Storage
 *
 * Step 2 is the whole point. The photo does not pass through a serverless
 * function, so Vercel's 4.5 MB request-body ceiling does not apply and the
 * bucket's own 8 MB limit becomes reachable for the first time.
 *
 * The signed URL's token is the only credential involved, and it expires in
 * about ten minutes — which is why these two calls sit next to each other.
 */

export type UploadFailure = PrepareFailure | "unauthorized" | "invalid_request" | "unsupported_type" | "upload_sign_failed" | "database_not_configured" | "upload_failed" | "network_error";

export type UploadResult =
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; reason: UploadFailure };

const MESSAGES: Record<UploadFailure, string> = {
  unsupported_type:
    "Unsupported format — use JPEG, PNG, WebP or AVIF. Photos from an iPhone are usually HEIC and need converting first.",
  cannot_resize:
    "This browser could not process that photo. Try a JPEG or PNG.",
  too_large: "That photo is too large, even after resizing (max 8 MB).",
  unauthorized: "Your admin session has expired. Sign in again.",
  invalid_request: "That upload request was not understood.",
  upload_sign_failed: "The server could not authorise the upload. Try again.",
  database_not_configured:
    "Photo storage is not configured on this deployment.",
  upload_failed: "The photo could not be stored. Try again.",
  network_error: "Upload failed — check the connection and try again.",
};

function messageFor(reason: UploadFailure): string {
  return MESSAGES[reason] ?? "Upload failed. Try again.";
}

export async function uploadCmsImage(file: File): Promise<UploadResult> {
  const prepared = await prepareImageUpload(file);
  if (!prepared.ok) {
    return { ok: false, reason: prepared.reason };
  }
  const photo = prepared.file;

  let sign: Response;
  try {
    sign = await fetch("/api/admin/content/images/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: photo.name,
        contentType: photo.type,
        size: photo.size,
      }),
    });
  } catch {
    return { ok: false, reason: "network_error" };
  }

  const body = (await sign.json().catch(() => ({}))) as {
    signedUrl?: string;
    path?: string;
    publicUrl?: string;
    error?: string;
  };

  if (!sign.ok || !body.signedUrl || !body.publicUrl) {
    const code = body.error;
    const known: UploadFailure[] = [
      "unauthorized",
      "invalid_request",
      "unsupported_type",
      "upload_sign_failed",
      "database_not_configured",
    ];
    return {
      ok: false,
      reason: known.includes(code as UploadFailure)
        ? (code as UploadFailure)
        : "upload_sign_failed",
    };
  }

  try {
    const put = await fetch(body.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": photo.type, "x-upsert": "false" },
      body: photo,
    });
    if (!put.ok) return { ok: false, reason: "upload_failed" };
  } catch {
    return { ok: false, reason: "network_error" };
  }

  return { ok: true, publicUrl: body.publicUrl, path: body.path ?? "" };
}

/** Owner-facing copy for a failure code. Shared so both editors speak alike. */
export function uploadErrorMessage(reason: UploadFailure): string {
  return messageFor(reason);
}