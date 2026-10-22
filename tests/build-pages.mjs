// Checks the built site: each route has its own title, description, canonical
// URL and link-preview image; unknown pages get a noindex 404; robots.txt,
// sitemap.xml and the Vercel routing are in place. A second build from a
// stock-manager snapshot checks real cars get the same treatment.
// Run `npm run test:pages`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicStock } from "../scripts/stock-source.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { vehicles, sampleStock } = publicStock();
const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false });
    console.log(`FAIL ${name}\n  ${error.message}`);
  }
}
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};
const reader = (dir) => (file) => readFileSync(join(dir, file), "utf8");
const read = reader(join(root, "dist"));
const tag = (html, pattern) => html.match(pattern)?.[1];

check("Home page has its title, canonical URL, share image and dealer details", () => {
  const html = read("index.html");
  expect(tag(html, /<title>([^<]+)/) === "MM Prestige Motors | HSV &amp; Holden Specialists, Adelaide", "home title");
  expect(/<link rel="canonical" href="https:\/\/[^"]+\/"/.test(html), "home canonical");
  expect(/og:image" content="https:\/\/[^"]+\/og-image\.png"/.test(html), "home share image");
  expect(/"@type":"AutoDealer"/.test(html), "AutoDealer structured data");
  expect(existsSync(join(root, "dist/og-image.png")), "og-image.png is published");
});
check("Every car has a page with its own title, description and photo preview", () => {
  for (const car of vehicles) {
    const html = read(`stock/${car.id}.html`);
    const name = `${car.year} ${car.make} ${car.model}`;
    expect(tag(html, /<title>([^<]+)/) === `${name} | MM Prestige Motors`, `${car.id} title`);
    expect(html.includes(`/stock/${car.id}" />`), `${car.id} canonical`);
    expect(/og:image" content="https:\/\/[^"]+\/images\/opt\/[^"]+-share\.jpg\?v=[0-9a-f]{8}"/.test(html), `${car.id} share photo`);
    expect(html.includes(car.status === "sold" ? "· Sold" : "$"), `${car.id} price or sold in description`);
    expect(html.includes("(sample listing)") === sampleStock, `${car.id} sample label follows sampleStock`);
    expect(/"@type":"Car"/.test(html) === !sampleStock, `${car.id} car data only for real stock`);
  }
});
check("Stock page and admin pages have their own titles, and admin pages are noindex", () => {
  expect(tag(read("stock.html"), /<title>([^<]+)/) === "Our collection | MM Prestige Motors", "stock title");
  expect(tag(read("stock/manage.html"), /<title>([^<]+)/) === "Stock manager | MM Prestige Motors", "stock manager title");
  for (const page of ["crm.html", "stock-manager.html", "stock/manage.html"])
    expect(read(page).includes('<meta name="robots" content="noindex" />'), `${page} is noindex`);
});
check("Unknown pages get a noindex 404 page", () => {
  const html = read("404.html");
  expect(tag(html, /<title>([^<]+)/) === "Page not found | MM Prestige Motors", "404 title");
  expect(html.includes('<meta name="robots" content="noindex" />'), "404 noindex");
});
check("robots.txt and sitemap.xml list the public pages", () => {
  const robots = read("robots.txt");
  expect(/Sitemap: https:\/\/\S+\/sitemap\.xml/.test(robots), "sitemap line");
  for (const path of ["/crm", "/stock/manage", "/api/"]) expect(robots.includes(`Disallow: ${path}`), `${path} disallowed`);
  const sitemap = read("sitemap.xml");
  expect((sitemap.match(/<url>/g) || []).length === vehicles.length + 2, "sitemap URL count");
  expect(!sitemap.includes("/stock/manage"), "stock manager not in the sitemap");
});
check("Vercel serves clean URLs with real 404s, and the stock API is a function", () => {
  const config = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  expect(config.cleanUrls === true, "cleanUrls");
  expect(!config.rewrites.some((rule) => rule.source === "/(.*)"), "no catch-all rewrite");
  expect(existsSync(join(root, "api/stock.js")), "api/stock.js");
  const manage = config.headers.find((rule) => rule.source === "/stock/manage")?.headers || [];
  expect(manage.some((header) => header.key === "X-Frame-Options" && header.value === "DENY"), "stock manager can't be framed");
});

// A build from a stock-manager snapshot: one car with an uploaded photo
// (absolute Blob URLs) and one sold car still using a site photo.
const temp = mkdtempSync(join(tmpdir(), "mm-pages-"));
try {
  const blob = "https://abc123.public.blob.vercel-storage.com/stock/photos";
  const snapshot = {
    managed: true,
    updatedAt: "2026-10-17T00:00:00.000Z",
    vehicles: [
      {
        id: "holden-commodore-ss-2015",
        year: 2015,
        make: "Holden",
        model: "Commodore SS",
        variant: "VF · V8 sedan",
        price: 39990,
        kms: 81200,
        transmission: "Manual",
        engine: "6.2L V8",
        fuel: "Petrol",
        body: "Sedan",
        colour: "White",
        power: "",
        status: "available",
        image: `${blob}/p-1-1600.webp`,
        gallery: [`${blob}/p-1-1600.webp`],
        tag: "",
        stock: "MM120",
        description: "A test car.",
      },
      {
        id: "hsv-maloo-2012",
        year: 2012,
        make: "HSV",
        model: "Maloo",
        variant: "",
        price: 0,
        kms: 88100,
        transmission: "Manual",
        engine: "6.2L V8",
        fuel: "Petrol",
        body: "Ute",
        colour: "Gold",
        power: "",
        status: "sold",
        image: "/images/hsv-maloo-e3-front.jpg",
        gallery: ["/images/hsv-maloo-e3-front.jpg"],
        tag: "",
        stock: "MM097",
        description: "",
      },
    ],
    photos: {
      [`${blob}/p-1-1600.webp`]: {
        width: 2400,
        height: 1600,
        srcset: `${blob}/p-1-480.webp 480w, ${blob}/p-1-1600.webp 1600w`,
        share: `${blob}/p-1-share.jpg`,
      },
    },
  };
  writeFileSync(join(temp, "snapshot.json"), JSON.stringify(snapshot));
  execFileSync("npx", ["vite", "build", "--outDir", join(temp, "dist"), "--emptyOutDir"], {
    cwd: root,
    env: { ...process.env, STOCK_SNAPSHOT: join(temp, "snapshot.json") },
    stdio: "ignore",
  });
  const readManaged = reader(join(temp, "dist"));
  check("Real cars get their own pages, previews and structured data", () => {
    const html = readManaged("stock/holden-commodore-ss-2015.html");
    expect(tag(html, /<title>([^<]+)/) === "2015 Holden Commodore SS | MM Prestige Motors", "title");
    expect(html.includes(`og:image" content="${blob}/p-1-share.jpg"`), "uploaded share photo used as is");
    expect(!html.includes("(sample listing)"), "no sample label");
    expect(/"@type":"Car"/.test(html) && html.includes(`"image":"${blob}/p-1-share.jpg"`), "car structured data");
    const sold = readManaged("stock/hsv-maloo-2012.html");
    expect(/og:image" content="https:\/\/[^"]+\/images\/opt\/hsv-maloo-e3-front-share\.jpg\?v=[0-9a-f]{8}"/.test(sold), "site photo preview");
    expect(sold.includes("· Sold") && !sold.includes(" ·  · "), "sold description without an empty variant");
    const sitemap = readManaged("sitemap.xml");
    expect((sitemap.match(/<url>/g) || []).length === 4, "sitemap lists the real cars");
    expect(!existsSync(join(temp, "dist/stock/hsv-gts-2016.html")), "sample listings are gone");
  });
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
