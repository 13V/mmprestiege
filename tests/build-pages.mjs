// Checks the built site: each route has its own title, description, canonical
// URL and link-preview image; unknown pages get a noindex 404; robots.txt,
// sitemap.xml and the Vercel routing are in place. Run `npm run test:pages`.
import { readFileSync, existsSync } from "node:fs";
import { vehicles, sampleStock } from "../src/data.js";

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
const read = (file) => readFileSync(new URL(`../dist/${file}`, import.meta.url), "utf8");
const tag = (html, pattern) => html.match(pattern)?.[1];

check("Home page has its title, canonical URL, share image and dealer details", () => {
  const html = read("index.html");
  expect(tag(html, /<title>([^<]+)/) === "MM Prestige Motors | HSV &amp; Holden Specialists, Adelaide", "home title");
  expect(/<link rel="canonical" href="https:\/\/[^"]+\/"/.test(html), "home canonical");
  expect(/og:image" content="https:\/\/[^"]+\/og-image\.png"/.test(html), "home share image");
  expect(/"@type":"AutoDealer"/.test(html), "AutoDealer structured data");
  expect(existsSync(new URL("../dist/og-image.png", import.meta.url)), "og-image.png is published");
});
check("Every car has a page with its own title, description and photo preview", () => {
  for (const car of vehicles) {
    const html = read(`stock/${car.id}.html`);
    const name = `${car.year} ${car.make} ${car.model}`;
    expect(tag(html, /<title>([^<]+)/) === `${name} | MM Prestige Motors`, `${car.id} title`);
    expect(html.includes(`/stock/${car.id}" />`), `${car.id} canonical`);
    expect(/og:image" content="https:\/\/[^"]+\/images\/opt\/[^"]+-share\.jpg"/.test(html), `${car.id} share photo`);
    expect(html.includes(car.status === "sold" ? "· Sold" : "$"), `${car.id} price or sold in description`);
    expect(html.includes("(sample listing)") === sampleStock, `${car.id} sample label follows sampleStock`);
    expect(/"@type":"Car"/.test(html) === !sampleStock, `${car.id} car data only for real stock`);
  }
});
check("Stock page and admin concepts have their own titles", () => {
  expect(tag(read("stock.html"), /<title>([^<]+)/) === "Our collection | MM Prestige Motors", "stock title");
  for (const page of ["crm.html", "stock-manager.html"])
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
  expect(robots.includes("Disallow: /crm"), "crm disallowed");
  const sitemap = read("sitemap.xml");
  expect((sitemap.match(/<url>/g) || []).length === vehicles.length + 2, "sitemap URL count");
});
check("Vercel serves clean URLs with real 404s", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  expect(config.cleanUrls === true, "cleanUrls");
  expect(!config.rewrites.some((rule) => rule.source === "/(.*)"), "no catch-all rewrite");
});
const failed = results.filter((result) => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
