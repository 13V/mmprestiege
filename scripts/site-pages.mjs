// Gives every route its own title, description, link-preview tags and
// structured data, so shared links and search results show the right page
// or car, and writes robots.txt, sitemap.xml and a 404 page. Vercel serves
// stock/<id>.html at /stock/<id> (cleanUrls) and 404.html for anything else.
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { business, money, number } from "../src/data.js";
import { publicStock } from "./stock-source.mjs";

// The stock manager's published cars, or the sample listings.
const { vehicles, sampleStock, photos } = publicStock();
const variants = {
  ...JSON.parse(readFileSync(new URL("../src/image-variants.json", import.meta.url), "utf8")),
  ...photos,
};
const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (
  process.env.SITE_URL ||
  (production ? `https://${production}` : "https://mmprestiege.vercel.app")
).replace(/\/$/, "");
const NAME = "MM Prestige Motors";
// Uploaded photos already have full URLs; site photos are paths.
const absolute = (src) => (/^https?:\/\//.test(src) ? src : `${SITE_URL}${src}`);
const START = "<!-- site-head -->";
const END = "<!-- /site-head -->";

const dealer = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: NAME,
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/og-image.png`,
  telephone: business.tel,
  email: business.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: business.address,
    addressLocality: business.locality,
    addressRegion: business.region,
    postalCode: business.postcode,
    addressCountry: "AU",
  },
  areaServed: "Adelaide",
  sameAs: business.social.filter((profile) => profile.url).map((profile) => profile.url),
};

const home = {
  path: "/",
  title: `${NAME} | HSV & Holden Specialists, Adelaide`,
  description:
    "MM Prestige Motors — Adelaide's specialist in HSV, Holden and iconic Australian performance cars. Explore our collection in Wingfield, South Australia.",
  schema: dealer,
};

function vehiclePage(car) {
  const name = `${car.year} ${car.make} ${car.model}`;
  const url = `${SITE_URL}/stock/${car.id}`;
  const sold = car.status === "sold";
  const image = variants[car.image]?.share || "/og-image.png";
  const facts = [
    car.variant,
    `${number(car.kms)} km`,
    car.transmission,
    sold ? "Sold" : money(car.price),
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    file: `stock/${car.id}.html`,
    path: `/stock/${car.id}`,
    title: `${name} | ${NAME}`,
    description: `${name}: ${facts}${sampleStock ? " (sample listing)" : ""}. Enquire with ${NAME} in Wingfield, Adelaide.`,
    image,
    schema: sampleStock
      ? undefined
      : {
          "@context": "https://schema.org",
          "@type": "Car",
          name,
          url,
          image: absolute(image),
          brand: { "@type": "Brand", name: car.make },
          model: car.model,
          vehicleModelDate: String(car.year),
          bodyType: car.body,
          color: car.colour,
          fuelType: car.fuel,
          vehicleTransmission: car.transmission,
          vehicleEngine: { "@type": "EngineSpecification", name: car.engine },
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: car.kms,
            unitCode: "KMT",
          },
          itemCondition: "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            url,
            price: car.price,
            priceCurrency: "AUD",
            availability: `https://schema.org/${sold ? "SoldOut" : "InStock"}`,
            seller: { "@type": "AutoDealer", name: NAME },
          },
        },
  };
}

const pages = [
  {
    file: "stock.html",
    path: "/stock",
    title: `Our collection | ${NAME}`,
    description:
      "Browse HSV, Holden and Australian performance cars at MM Prestige Motors in Wingfield, Adelaide, or ask us to find the car you're after.",
  },
  ...vehicles.map(vehiclePage),
  {
    file: "404.html",
    path: "/404",
    title: `Page not found | ${NAME}`,
    description: home.description,
    noindex: true,
  },
  {
    file: "crm.html",
    path: "/crm",
    title: `Sales CRM mockup | ${NAME}`,
    description: "A concept customer and sales pipeline for MM Prestige Motors.",
    noindex: true,
  },
  {
    file: "stock/manage.html",
    path: "/stock/manage",
    title: `Stock manager | ${NAME}`,
    description: "Add and update the cars on the MM Prestige Motors website.",
    noindex: true,
  },
  {
    file: "stock-manager.html",
    path: "/stock-manager",
    title: `Stock management demo | ${NAME}`,
    description: "A concept stock assistant for MM Prestige Motors.",
    noindex: true,
  },
];

const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function head({ path, title, description, image = "/og-image.png", noindex, schema }) {
  const url = `${SITE_URL}${path}`;
  return [
    START,
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    noindex
      ? '<meta name="robots" content="noindex" />'
      : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="en_AU" />',
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${absolute(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    schema &&
      `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
    END,
  ]
    .filter(Boolean)
    .join("\n    ");
}

const robots = `User-agent: *
Allow: /
Disallow: /crm
Disallow: /stock-manager
Disallow: /stock/manage
Disallow: /api/
Disallow: /presentation
Disallow: /downloads/

Sitemap: ${SITE_URL}/sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["/", "/stock", ...vehicles.map((car) => `/stock/${car.id}`)]
  .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
  .join("\n")}
</urlset>
`;

export function sitePages() {
  let outDir = "dist";
  return {
    name: "site-pages",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    // The home page's tags, in the dev server and the build alike.
    transformIndexHtml: (html) => html.replace(START, head(home)),
    async closeBundle() {
      const index = join(outDir, "index.html");
      if (!existsSync(index)) return;
      const html = await readFile(index, "utf8");
      const block = new RegExp(`${START}[\\s\\S]*?${END}`);
      for (const page of pages) {
        const file = join(outDir, page.file);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, html.replace(block, head(page)));
      }
      await writeFile(join(outDir, "robots.txt"), robots);
      await writeFile(join(outDir, "sitemap.xml"), sitemap);
    },
  };
}

// `vite preview` serves the build the way Vercel does: clean URLs and a real
// 404 for unknown pages.
export function cleanUrls(outDir = "dist") {
  return (request, response, next) => {
    const [pathname, query] = (request.url || "/").split("?");
    if (pathname === "/" || /\.[a-z0-9]+$/i.test(pathname)) return next();
    const page = `${pathname.replace(/\/$/, "")}.html`;
    if (existsSync(join(outDir, page))) {
      request.url = `${page}${query === undefined ? "" : `?${query}`}`;
      return next();
    }
    if (existsSync(join(outDir, pathname, "index.html"))) return next();
    response.statusCode = 404;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(readFileSync(join(outDir, "404.html")));
  };
}
