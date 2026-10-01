import sharp from "sharp";
import { stat } from "fs/promises";

/**
 * Next serves the source file untouched at any requested width, so a 1080-wide
 * hero is stretched by the browser to fill a 1920-2880px viewport. This rewrites
 * each hero source as a 2x Lanczos3 upscale (capped at 2400px) with a light
 * unsharp pass, so the resampling happens once, server side, with a proper
 * filter, instead of by the browser with a cheap one.
 *
 * Upscaling cannot invent detail. It replaces the browser's resample with a
 * better one. Originals are recoverable from git.
 */
const DIR = "public/images";
const CAP = 2400;
const QUALITY = 85;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/upscale-heroes.mjs <name.jpg> [...]");
  process.exit(1);
}

for (const file of files) {
  const src = `${DIR}/${file}`;
  const beforeSize = (await stat(src)).size;
  const before = await sharp(src).metadata();
  const w = before.width;
  const h = before.height;
  const target = Math.min(Math.max(w, h) * 2, CAP);

  if (Math.max(w, h) >= CAP) {
    console.log(`  SKIP  ${file} (${w}x${h}) already at or above cap`);
    continue;
  }

  const tmp = `${src}.tmp`;
  await sharp(src)
    .resize({
      width: target,
      height: target,
      fit: "inside",
      kernel: "lanczos3",
    })
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(tmp);

  const after = await sharp(tmp).metadata();
  const afterSize = (await stat(tmp)).size;
  const { rename } = await import("fs/promises");
  await rename(tmp, src);
  console.log(
    `  ${file} ${w}x${h} -> ${after.width}x${after.height}  ` +
      `${Math.round(beforeSize / 1024)}KB -> ${Math.round(afterSize / 1024)}KB`,
  );
}
console.log("Done");