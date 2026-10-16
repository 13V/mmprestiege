// Renders the branded link-preview image (public/og-image.png, 1200 × 630)
// over the showroom photo, and the app icons from public/favicon.svg. Run
// `npm run share-image` after changing the brand, phone number, address or
// the showroom photo (run `npm run images` first so its WebP sizes exist).
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";
import { business } from "../src/data.js";

const font = async (file) =>
  `data:font/woff2;base64,${(await readFile(new URL(`../node_modules/${file}`, import.meta.url))).toString("base64")}`;
const display = await font("@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2");
const body = await font("@fontsource/manrope/files/manrope-latin-600-normal.woff2");
const photo = `data:image/webp;base64,${(await readFile(new URL("../public/images/opt/showroom-lineup-1600.webp", import.meta.url))).toString("base64")}`;

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Display; src: url(${display}); font-weight: 800; }
@font-face { font-family: Body; src: url(${body}); font-weight: 600; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; background: #111; color: #f5f5f3; font-family: Body, sans-serif; }
.card { position: relative; width: 100%; height: 100%; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; background: #111; }
.card > * { position: relative; z-index: 1; }
.card > .photo { position: absolute; inset: 0 0 0 34%; z-index: 0; background: url(${photo}) 50% 62% / cover; }
.photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, #111 0%, #111111e0 16%, #11111170 46%, #11111114 100%), linear-gradient(0deg, #111111b3 0%, #11111100 34%); }
.card::after { content: ""; position: absolute; inset: 24px; z-index: 2; border: 1px solid #ffffff1f; border-radius: 22px; }
.mark b { display: block; font: 800 128px/0.9 Display; letter-spacing: 0.02em; text-transform: uppercase; }
.mark small { display: block; margin-top: 18px; font-size: 22px; letter-spacing: 0.5em; color: #c9c9cd; }
.rule { width: 96px; height: 6px; margin: 34px 0 30px; background: #d42536; border-radius: 3px; }
h1 { font: 800 56px/1 Display; text-transform: uppercase; letter-spacing: 0.01em; }
p { font-size: 26px; color: #c9c9cd; }
p b { color: #f5f5f3; font-weight: 600; }
</style><div class="card"><div class="photo" aria-hidden="true"></div><div><div class="mark"><b>MM Prestige</b><small>MOTORS</small></div>
<div class="rule"></div><h1>HSV &amp; Holden specialists</h1></div>
<p>${business.locality}, South Australia &nbsp;·&nbsp; <b>${business.phone}</b></p></div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await writeFile("public/og-image.png", await page.screenshot({ type: "png" }));
await browser.close();

const icon = await readFile("public/favicon.svg");
await sharp(icon, { density: 600 }).resize(180, 180).flatten({ background: "#151515" }).png().toFile("public/apple-touch-icon.png");
await sharp(icon, { density: 300 }).resize(32, 32).png().toFile("public/favicon-32.png");
console.log("Wrote public/og-image.png, apple-touch-icon.png and favicon-32.png.");
