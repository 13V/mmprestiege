// Writes web-sized WebP copies of every photo in public/images to
// public/images/opt, plus a 1200 × 630 JPEG crop for link previews, and
// records them in src/image-variants.json so pages can offer srcset.
// Run `npm run images` after adding or replacing photos.
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const SOURCE = "public/images";
const OUTPUT = "public/images/opt";
const WIDTHS = [480, 960, 1600, 2400];
const SHARE = { width: 1200, height: 630 };

async function newer(source, target) {
  try {
    return (await stat(source)).mtimeMs > (await stat(target)).mtimeMs;
  } catch {
    return true;
  }
}

await mkdir(OUTPUT, { recursive: true });
const manifest = {};
const files = (await readdir(SOURCE))
  .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
  .sort();
for (const file of files) {
  const input = join(SOURCE, file);
  const { name } = parse(file);
  const { width, height } = await sharp(input).metadata();
  // Never upscale; keep the full-size width when no step comes close to it.
  const widths = WIDTHS.filter((w) => w <= width * 0.95);
  if (width <= WIDTHS.at(-1) && !widths.some((w) => w >= width * 0.9))
    widths.push(width);
  for (const w of widths) {
    const output = join(OUTPUT, `${name}-${w}.webp`);
    if (await newer(input, output))
      await sharp(input).resize({ width: w }).webp({ quality: 78, effort: 5 }).toFile(output);
  }
  const share = join(OUTPUT, `${name}-share.jpg`);
  if (await newer(input, share))
    await sharp(input)
      .resize({ ...SHARE, fit: "cover" })
      .flatten({ background: "#111111" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(share);
  manifest[`/images/${file}`] = {
    width,
    height,
    srcset: widths.map((w) => `/images/opt/${name}-${w}.webp ${w}w`).join(", "),
    share: `/images/opt/${name}-share.jpg`,
  };
}
await writeFile("src/image-variants.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Optimised ${files.length} photos into ${OUTPUT}.`);
