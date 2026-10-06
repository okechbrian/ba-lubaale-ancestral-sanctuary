import { readdir } from "fs/promises";
import { extname, join } from "path";
import { getDb, DatabaseNotConfiguredError } from "@/lib/db/client";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
const BUCKET = "cms";

/**
 * Photo library for the admin image pickers: repo photos (`public/images`)
 * plus owner uploads stored in the public `cms` Supabase bucket (public URLs).
 * Missing database or bucket = repo photos only, never an error.
 */
export async function listLibraryImages(): Promise<string[]> {
  const local = await listLocalImages();
  const uploaded = await listUploadedImages();
  return [...new Set([...local, ...uploaded])].sort((a, b) =>
    a.localeCompare(b),
  );
}

async function listLocalImages(): Promise<string[]> {
  try {
    const dir = join(process.cwd(), "public", "images");
    const files = await readdir(dir);
    return files
      .filter((f) => IMAGE_EXT.includes(extname(f).toLowerCase()))
      .sort()
      .map((f) => `/images/${f}`);
  } catch {
    return [];
  }
}

async function listUploadedImages(): Promise<string[]> {
  try {
    const db = getDb();
    const { data, error } = await db.storage.from(BUCKET).list("", {
      limit: 200,
      sortBy: { column: "name", order: "desc" },
    });
    if (error || !data) return [];
    return data
      .filter((f) => typeof f.name === "string" && IMAGE_EXT.includes(extname(f.name).toLowerCase()))
      .map((f) => db.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) return [];
    return [];
  }
}
