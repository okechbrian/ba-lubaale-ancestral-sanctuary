import { readdir } from "fs/promises";
import { join, extname } from "path";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

/** Repo photo library (`public/images`) for the admin image pickers. */
export async function listLibraryImages(): Promise<string[]> {
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
