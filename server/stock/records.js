// What a car record may contain, what it needs before it can go on the
// website, and which of its fields the website may see.
import { randomBytes } from "node:crypto";
import { AUSTRALIAN_STATES } from "./normalize.js";
import { cleanRego, cleanVin } from "./lookup.js";

export const STATUSES = ["draft", "available", "sold"];
export const isLive = (car) => car?.status === "available" || car?.status === "sold";

const PHOTO_URL = [
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/stock\/photos\/[A-Za-z0-9._-]+$/,
  /^\/api\/stock\/dev-photo\/[A-Za-z0-9._-]+$/,
  /^\/images\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/,
];
export const isPhotoUrl = (value) => typeof value === "string" && PHOTO_URL.some((pattern) => pattern.test(value));

const str = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
const longText = (value, max) =>
  typeof value === "string" ? value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "";
function int(value, min, max) {
  if (value === "" || value == null) return null;
  const number = Math.round(Number(String(value).replace(/[^\d.-]/g, "")));
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function photo(input) {
  if (!input || !isPhotoUrl(input.src)) return null;
  const entries = String(input.srcset || "")
    .split(",")
    .map((entry) => entry.trim().split(/\s+/))
    .filter(([url, width]) => isPhotoUrl(url) && /^\d{2,4}w$/.test(width || ""));
  return {
    id: /^[a-z0-9-]{6,40}$/.test(input.id || "") ? input.id : randomBytes(8).toString("hex"),
    src: input.src,
    srcset: entries.map((entry) => entry.join(" ")).join(", "),
    width: int(input.width, 1, 10000),
    height: int(input.height, 1, 10000),
    share: isPhotoUrl(input.share) ? input.share : "",
  };
}
// Every stored file behind a photo, for deleting it.
export const photoFiles = (item) =>
  [item.src, item.share, ...String(item.srcset || "").split(",").map((entry) => entry.trim().split(/\s+/)[0])].filter(
    (url) => url && !url.startsWith("/images/"),
  );

export const slug = (value) =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function uniqueId(base, cars, self) {
  const taken = new Set(cars.filter((car) => car.id !== self).map((car) => car.id));
  taken.add("manage");
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

// Cleans what the stock manager sent. Drafts may be incomplete; a car on
// the website needs the basics and a photo.
export function prepareCar(input, doc, now = new Date()) {
  const existing = doc.cars.find((car) => car.id === input?.id);
  const thisYear = now.getFullYear();
  const car = {
    id: existing?.id || "",
    status: STATUSES.includes(input?.status) ? input.status : "draft",
    stock: str(input?.stock, 12).toUpperCase().replace(/[^A-Z0-9-]/g, ""),
    year: int(input?.year, 1900, thisYear + 1),
    make: str(input?.make, 40),
    model: str(input?.model, 40),
    variant: str(input?.variant, 80),
    body: str(input?.body, 30),
    colour: str(input?.colour, 30),
    transmission: str(input?.transmission, 30),
    engine: str(input?.engine, 60),
    fuel: str(input?.fuel, 20),
    power: str(input?.power, 20),
    kms: int(input?.kms, 0, 2000000),
    price: int(input?.price, 0, 20000000),
    tag: str(input?.tag, 28).toUpperCase(),
    description: longText(input?.description, 3000),
    rego: cleanRego(input?.rego),
    state: AUSTRALIAN_STATES.includes(input?.state) ? input.state : "",
    vin: cleanVin(input?.vin),
    regoExpiry: /^\d{4}-\d{2}-\d{2}$/.test(input?.regoExpiry || "") ? input.regoExpiry : "",
    photos: (Array.isArray(input?.photos) ? input.photos : []).slice(0, 40).map(photo).filter(Boolean),
    lookup: input?.lookup
      ? {
          provider: str(input.lookup.provider, 40),
          at: str(input.lookup.at, 30),
          description: str(input.lookup.description, 120),
          query: str(input.lookup.query, 40),
        }
      : existing?.lookup || null,
    importedFrom: existing?.importedFrom || null,
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    publishedAt: existing?.publishedAt || null,
    soldAt: existing?.soldAt || null,
  };

  const errors = [];
  if (isLive(car)) {
    const missing = [];
    if (!car.year) missing.push("the year");
    if (!car.make) missing.push("the make");
    if (!car.model) missing.push("the model");
    if (car.kms == null) missing.push("the kilometres");
    if (car.status === "available" && !car.price) missing.push("the price");
    if (!car.photos.length) missing.push("a photo");
    if (missing.length)
      errors.push(
        `To put it on the website, add ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}` : missing[0]}.`,
      );
  }

  // Drafts get a temporary id. The web address (e.g. hsv-gts-2016) is set
  // the first time the car goes on the website, and then never changes.
  if (!car.id) car.id = `draft-${randomBytes(4).toString("hex")}`;
  if (car.id.startsWith("draft-") && isLive(car) && !errors.length)
    car.id = uniqueId(slug([car.make, car.model, car.year].filter(Boolean).join(" ")) || "car", doc.cars, car.id);
  if (!car.stock) car.stock = `MM${doc.nextStock || 101}`;
  if (isLive(car) && !car.publishedAt) car.publishedAt = now.toISOString();
  if (car.status === "sold" && existing?.status !== "sold") car.soldAt = now.toISOString();
  if (car.status !== "sold") car.soldAt = null;
  return { car, existing, errors };
}

// The website's view: cars on the website (newest first, sold last) with
// only their public fields, and each photo's sizes for srcset.
export function publicSnapshot(doc) {
  const live = doc.cars
    .filter(isLive)
    .sort(
      (a, b) =>
        (a.status === "sold") - (b.status === "sold") ||
        String(b.status === "sold" ? b.soldAt : b.publishedAt).localeCompare(
          String(a.status === "sold" ? a.soldAt : a.publishedAt),
        ),
    );
  if (!live.length) return { managed: false };
  const photos = {};
  const vehicles = live.map((car) => {
    for (const item of car.photos)
      if (item.srcset)
        photos[item.src] = { width: item.width, height: item.height, srcset: item.srcset, share: item.share || item.src };
    return {
      id: car.id,
      year: car.year,
      make: car.make,
      model: car.model,
      variant: car.variant,
      price: car.price || 0,
      kms: car.kms || 0,
      transmission: car.transmission,
      engine: car.engine,
      fuel: car.fuel,
      body: car.body,
      colour: car.colour,
      power: car.power,
      status: car.status,
      image: car.photos[0]?.src || "",
      gallery: car.photos.map((item) => item.src),
      tag: car.tag,
      stock: car.stock,
      description: car.description,
    };
  });
  return { managed: true, updatedAt: doc.updatedAt, vehicles, photos };
}
