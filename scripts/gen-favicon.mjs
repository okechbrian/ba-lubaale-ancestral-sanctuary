import sharp from "sharp";
import { writeFileSync } from "fs";

async function run() {
  const src = "public/images/cowrie-necklace-still.jpg";

  // Create favicon-32.png (center crop square from top of necklace)
  await sharp(src)
    .extract({ left: 70, top: 0, width: 400, height: 400 })
    .resize(32, 32)
    .png()
    .toFile("public/favicon-32x32.png");

  // Create apple-touch-icon (180x180)
  await sharp(src)
    .extract({ left: 70, top: 0, width: 400, height: 400 })
    .resize(180, 180)
    .png()
    .toFile("public/apple-touch-icon.png");

  // Create favicon.svg — simple canopy-color circle with cowrie shell shape
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" fill="#2F4A3C"/>
    <ellipse cx="16" cy="15" rx="5" ry="7" fill="none" stroke="#C4A574" stroke-width="1.5"/>
    <line x1="16" y1="8" x2="16" y2="22" stroke="#C4A574" stroke-width="1"/>
    <line x1="13" y1="11" x2="19" y2="11" stroke="#C4A574" stroke-width="0.8"/>
    <line x1="13" y1="14" x2="19" y2="14" stroke="#C4A574" stroke-width="0.8"/>
    <line x1="13.5" y1="17" x2="18.5" y2="17" stroke="#C4A574" stroke-width="0.8"/>
  </svg>`;
  writeFileSync("public/favicon.svg", svg);

  console.log("Favicons created");
}

run().catch(console.error);
