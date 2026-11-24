// Converts the mockup photos in public/mockups from PNG to WebP (about 10x smaller).
// Run once after adding new photos:  node scripts/optimize-mockups.mjs
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "mockups");
for (const file of await readdir(dir)) {
  if (!file.endsWith(".png")) continue;
  const src = path.join(dir, file);
  const out = path.join(dir, file.replace(/\.png$/, ".webp"));
  const info = await sharp(src).webp({ quality: 84 }).toFile(out);
  await unlink(src);
  console.log(`${file} -> ${path.basename(out)} (${Math.round(info.size / 1024)} KB)`);
}
