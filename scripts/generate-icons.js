import sharp from "sharp";
import fs from "fs";
import path from "path";

const svgBuffer = fs.readFileSync(path.resolve("public/pwa-icon.svg"));

async function generate() {
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve("public/logo.png"));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve("public/icon-512.png"));

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve("public/icon-192.png"));

  console.log("Successfully generated all PWA PNG icons with white background and solid black logo!");
}

generate().catch(console.error);
