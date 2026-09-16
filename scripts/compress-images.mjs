import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import sharp from "sharp";

const dir = process.argv[2] || "public/images";
const maxDim = parseInt(process.argv[3] || "2400", 10);
const quality = parseInt(process.argv[4] || "75", 10);

async function run() {
  const files = (await readdir(dir)).filter((f) =>
    [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase())
  );
  console.log(`Found ${files.length} images in ${dir}`);
  for (const file of files) {
    const src = join(dir, file);
    const meta = await sharp(src).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (Math.max(w, h) <= maxDim) {
      console.log(`  SKIP ${file} (${w}x${h})`);
      continue;
    }
    await sharp(src)
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toFile(src + ".tmp");
    const { rename } = await import("fs/promises");
    await rename(src + ".tmp", src);
    const newMeta = await sharp(src).metadata();
    console.log(`  ${file} ${w}x${h} -> ${newMeta.width}x${newMeta.height}`);
  }
  console.log("Done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
