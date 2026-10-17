// The stock manager's API, as a web-standard handler: the Vercel function
// (api/stock.js) and the Vite dev server (vite-plugin.js) both call it.
// Every call is /api/stock?op=<name>; the reply is JSON.
import { randomBytes } from "node:crypto";
import { sampleVehicles } from "../../src/sample-stock.js";
import { clearCookie, hasSession, loginThrottle, passwordMatches, sessionCookie } from "./auth.js";
import { LookupError, lookupVehicle } from "./lookup.js";
import { isLive, photoFiles, prepareCar } from "./records.js";
import { ConflictError } from "./stores.js";

class ValidationError extends Error {}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      ...headers,
    },
  });
const fail = (status, code, message, extra = {}) => json({ ok: false, code, message, ...extra }, status);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readBody(request) {
  try {
    return (await request.json()) || {};
  } catch {
    return {};
  }
}

const throttle = loginThrottle();

export async function handleStockRequest(request, ctx) {
  const op = new URL(request.url).searchParams.get("op") || "";
  const method = request.method;
  try {
    if (method === "GET" && op === "status") return json(status(ctx, hasSession(request, ctx.password)));
    // Every change needs this header. Pages on other sites can't send it
    // without the browser asking first, and the API never says yes.
    if (method !== "GET" && request.headers.get("x-mm-stock") !== "1")
      return fail(403, "forbidden", "This request isn't allowed.");
    if (method === "POST" && op === "login") return await login(request, ctx);
    if (method === "POST" && op === "logout")
      return json({ ok: true }, 200, { "set-cookie": clearCookie(ctx.secureCookies) });
    if (!hasSession(request, ctx.password)) return fail(401, "signed_out", "Please sign in.");
    if (method === "POST" && op === "lookup") return await lookup(request, ctx);
    if (!ctx.store) return fail(503, "no_storage", "Storage isn't connected yet, so cars can't be saved.");
    switch (`${method} ${op}`) {
      case "GET stock":
        return await getStock(ctx);
      case "POST save":
        return await save(request, ctx);
      case "POST delete":
        return await remove(request, ctx);
      case "POST photo":
        return await uploadPhoto(request, ctx);
      case "POST import":
        return await importListings(request, ctx);
      case "POST publish":
        return json({ ok: true, publish: await ctx.publish() });
      default:
        return fail(404, "unknown", "Unknown request.");
    }
  } catch (error) {
    if (error instanceof ConflictError) return fail(409, "conflict", error.message);
    if (error instanceof ValidationError) return fail(422, "invalid", error.message);
    if (error instanceof LookupError) {
      const code = { invalid: 400, not_found: 404, config: 503, credits: 402 }[error.code] || 502;
      return fail(code, error.code, error.message, { detail: error.detail });
    }
    ctx.log?.(error);
    return fail(500, "error", "Something went wrong. Try again in a moment.");
  }
}

function status(ctx, signedIn) {
  return {
    ok: true,
    signedIn,
    mode: ctx.mode,
    setup: {
      login: Boolean(ctx.password),
      passwordTooShort: Boolean(ctx.passwordTooShort),
      storage: ctx.store?.kind || null,
      lookup: ctx.provider?.name || null,
      publish: ctx.publishMode || null,
    },
  };
}

async function login(request, ctx) {
  if (!ctx.password)
    return fail(503, "no_password", "Sign-in isn't set up yet. Add STOCK_ADMIN_PASSWORD in Vercel.");
  const who = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const wait = throttle.wait(who);
  if (wait) return fail(429, "slow_down", `Too many tries. Wait ${wait} seconds and try again.`);
  const { password } = await readBody(request);
  if (!passwordMatches(password || "", ctx.password)) {
    throttle.miss(who);
    await sleep(ctx.mode === "production" ? 700 : 50);
    return fail(401, "wrong_password", "That password isn't right.");
  }
  throttle.clear(who);
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(ctx.password, { secure: ctx.secureCookies }) });
}

async function lookup(request, ctx) {
  const body = await readBody(request);
  const result = await lookupVehicle({
    provider: ctx.provider,
    cache: ctx.store?.cache,
    query: body,
    fresh: Boolean(body.fresh),
  });
  return json({ ok: true, result });
}

async function getStock(ctx) {
  const [{ doc }, credits] = await Promise.all([
    ctx.store.read(),
    ctx.provider?.credits ? ctx.provider.credits().catch(() => null) : null,
  ]);
  return json({ ok: true, version: doc.version, cars: doc.cars, credits });
}

// Reads the stock, applies one change, and saves it. The website rebuilds
// when the change touches a car that is (or was) on it.
async function mutate(ctx, expectedVersion, change) {
  const { doc, etag } = await ctx.store.read();
  if (expectedVersion != null && expectedVersion !== doc.version) throw new ConflictError();
  const { doc: next, result = {}, cleanup = [], affectsSite = false } = change(structuredClone(doc));
  next.version = doc.version + 1;
  next.updatedAt = new Date().toISOString();
  await ctx.store.write(next, etag);
  if (cleanup.length) await ctx.store.deleteFiles(cleanup).catch((error) => ctx.log?.(error));
  const publish = affectsSite ? await ctx.publish() : null;
  return json({ ok: true, version: next.version, cars: next.cars, publish, ...result });
}

const nextStockNumber = (current, stock) => {
  const number = Number(/^MM(\d+)$/.exec(stock || "")?.[1]);
  return Number.isFinite(number) && number >= current ? number + 1 : current;
};

async function save(request, ctx) {
  const body = await readBody(request);
  return mutate(ctx, body.expectedVersion, (doc) => {
    const { car, existing, errors } = prepareCar(body.car || {}, doc);
    if (errors.length) throw new ValidationError(errors.join(" "));
    const cars = existing ? doc.cars.map((item) => (item.id === existing.id ? car : item)) : [car, ...doc.cars];
    const kept = new Set(car.photos.flatMap(photoFiles));
    const cleanup = existing ? existing.photos.flatMap(photoFiles).filter((url) => !kept.has(url)) : [];
    return {
      doc: { ...doc, cars, nextStock: nextStockNumber(doc.nextStock || 101, car.stock) },
      result: { car },
      cleanup,
      affectsSite: isLive(car) || isLive(existing),
    };
  });
}

async function remove(request, ctx) {
  const body = await readBody(request);
  return mutate(ctx, body.expectedVersion, (doc) => {
    const car = doc.cars.find((item) => item.id === body.id);
    if (!car) throw new ValidationError("That car has already been removed.");
    return {
      doc: { ...doc, cars: doc.cars.filter((item) => item.id !== car.id) },
      cleanup: car.photos.flatMap(photoFiles),
      affectsSite: isLive(car),
    };
  });
}

// One photo per request: its resized copies (w480, w960, w1600, w2400) and
// a 1200 × 630 crop for link previews, made in the browser.
const MAX_FILE = 3_000_000;
function imageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ["image/jpeg", "jpg"];
  const tag = (start) => String.fromCharCode(...bytes.slice(start, start + 4));
  if (tag(0) === "RIFF" && tag(8) === "WEBP") return ["image/webp", "webp"];
  return null;
}
async function uploadPhoto(request, ctx) {
  if (Number(request.headers.get("content-length") || 0) > 4_400_000)
    return fail(413, "too_large", "That photo is too large to upload.");
  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "invalid", "No photo received.");
  }
  const id = String(form.get("id") || "");
  if (!/^[a-z0-9-]{6,40}$/.test(id)) return fail(400, "invalid", "No photo received.");
  const size = (name) => {
    const value = Number(form.get(name));
    return Number.isInteger(value) && value > 0 && value <= 10000 ? value : null;
  };
  const uploads = [];
  for (const [field, file] of form.entries()) {
    const match = /^(?:w(\d{3,4})|share)$/.exec(field);
    if (!match || typeof file === "string") continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = imageType(bytes);
    if (!type) return fail(415, "unsupported", "Photos must be JPEG or WebP.");
    if (bytes.length > MAX_FILE) return fail(413, "too_large", "That photo is too large to upload.");
    const width = match[1] ? Number(match[1]) : 0;
    uploads.push({ width, bytes, type: type[0], name: `${id}-${width || "share"}.${type[1]}` });
  }
  const sizes = uploads.filter((item) => item.width).sort((a, b) => a.width - b.width);
  if (!sizes.length) return fail(400, "invalid", "No photo received.");
  const urls = await Promise.all(uploads.map((item) => ctx.store.putPhoto(item.name, item.bytes, item.type)));
  uploads.forEach((item, index) => (item.url = urls[index]));
  const main = sizes.find((item) => item.width >= 1600) || sizes.at(-1);
  return json({
    ok: true,
    photo: {
      id,
      src: main.url,
      srcset: sizes.map((item) => `${item.url} ${item.width}w`).join(", "),
      width: size("width"),
      height: size("height"),
      share: uploads.find((item) => !item.width)?.url || main.url,
    },
  });
}

// Copies the website's current (sample) listings in as drafts, with their
// photos, so Madi can correct the details and publish them.
async function importListings(request, ctx) {
  const body = await readBody(request);
  return mutate(ctx, body.expectedVersion, (doc) => {
    const done = new Set(doc.cars.map((car) => car.importedFrom).filter(Boolean));
    const now = new Date().toISOString();
    const added = sampleVehicles
      .filter((car) => !done.has(car.id))
      .map((car) => ({
        id: `draft-${randomBytes(4).toString("hex")}`,
        status: "draft",
        stock: car.stock,
        year: car.year,
        make: car.make,
        model: car.model,
        variant: car.variant,
        body: car.body,
        colour: car.colour,
        transmission: car.transmission,
        engine: car.engine,
        fuel: car.fuel,
        power: car.power,
        kms: car.kms,
        price: car.price,
        tag: car.tag,
        description: car.description,
        rego: "",
        state: "",
        vin: "",
        regoExpiry: "",
        photos: car.gallery.map((src) => ({
          id: `site-${randomBytes(5).toString("hex")}`,
          src,
          srcset: "",
          width: null,
          height: null,
          share: "",
        })),
        lookup: null,
        importedFrom: car.id,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        soldAt: null,
      }));
    return { doc: { ...doc, cars: [...doc.cars, ...added] }, result: { imported: added.length } };
  });
}
