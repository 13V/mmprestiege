// Writes web-sized WebP copies of every photo in public/images to
// public/images/opt, plus a 1200 × 630 JPEG crop for link previews, and
// records them in src/image-variants.json so pages can offer srcset.
// Run `npm run images` after adding or replacing photos (the shoot photos
// themselves are made by scripts/photos/export.py). Copies that no photo
// uses any more are deleted.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const SOURCE = "public/images";
const OUTPUT = "public/images/opt";
// 3200 px covers full-width photos on 2× screens up to 1,600 px wide.
const WIDTHS = [480, 960, 1600, 2400, 3200];
// Smart subsampling keeps red paint crisp against black trim. Resized copies
// get light sharpening on edges, which resizing softens; the full-size copy
// is already sharpened.
const WEBP = { quality: 82, effort: 6, smartSubsample: true };
const SHARPEN = { sigma: 0.5, m1: 0.3, m2: 1.5 };
const SHARE = { width: 1200, height: 630 };

// Each URL carries a short hash of its file, so browsers fetch a photo again
// as soon as it changes instead of keeping a copy cached for a day.
const versioned = async (file) =>
  `/${file.replace(/^public\//, "")}?v=${createHash("sha1").update(await readFile(file)).digest("hex").slice(0, 8)}`;

async function newer(source, target) {
  try {
    return (await stat(source)).mtimeMs > (await stat(target)).mtimeMs;
  } catch {
    return true;
  }
}

await mkdir(OUTPUT, { recursive: true });
const manifest = {};
const keep = new Set();
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
    keep.add(output);
    if (!(await newer(input, output))) continue;
    let image = sharp(input).resize({ width: w });
    if (w < width) image = image.sharpen(SHARPEN);
    await image.webp(WEBP).toFile(output);
  }
  const share = join(OUTPUT, `${name}-share.jpg`);
  keep.add(share);
  if (await newer(input, share))
    await sharp(input)
      .resize({ ...SHARE, fit: "cover" })
      .flatten({ background: "#111111" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(share);
  manifest[`/images/${file}`] = {
    width,
    height,
    srcset: (await Promise.all(widths.map(async (w) => `${await versioned(join(OUTPUT, `${name}-${w}.webp`))} ${w}w`))).join(", "),
    share: await versioned(share),
  };
}
await writeFile("src/image-variants.json", `${JSON.stringify(manifest, null, 2)}\n`);
const stale = (await readdir(OUTPUT)).map((file) => join(OUTPUT, file)).filter((file) => !keep.has(file));
await Promise.all(stale.map((file) => rm(file)));
console.log(`Optimised ${files.length} photos into ${OUTPUT}` + (stale.length ? `; removed ${stale.length} unused copies.` : "."));
