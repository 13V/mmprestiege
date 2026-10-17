// Unit checks for the stock manager's server code: rego lookups and their
// per-state normalising, car records, the website snapshot, sign-in and the
// file store. No browser or server needed: `node tests/stock-lookup.mjs`.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasSession, loginThrottle, sessionCookie } from "../server/stock/auth.js";
import { handleStockRequest } from "../server/stock/handler.js";
import { lookupVehicle, mockProvider, parseRegCheckXml, regCheckProvider } from "../server/stock/lookup.js";
import { prepareCar, publicSnapshot } from "../server/stock/records.js";
import { ConflictError, emptyDoc, fileStore } from "../server/stock/stores.js";

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push(false);
    console.log(`FAIL ${name}\n  ${error.message}`);
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}
const same = (actual, expected, message) =>
  expect(JSON.stringify(actual) === JSON.stringify(expected), `${message}: got ${JSON.stringify(actual)}`);
const provider = mockProvider({ delay: 0 });
const look = (query, extra = {}) => lookupVehicle({ provider, query, ...extra });

await check("SA lookups give the make, model, year, body, colour, VIN and expiry, and list what's missing", async () => {
  const result = await look({ rego: "s123 abc", state: "SA" });
  same(result.query, { rego: "S123ABC", state: "SA" }, "cleaned query");
  same(
    result.fields,
    { year: 2016, make: "HSV", model: "GTS", body: "Sedan", colour: "Red", vin: "6G1FK5EP0GL303518", regoExpiry: "2027-03-14" },
    "fields",
  );
  same(result.missing, ["variant", "transmission", "engine"], "missing");
  expect(result.extra.insurer === "AAMI", "insurer");
});
await check("NSW, TAS and WA lookups give the full specification, but their vehicle code isn't taken as a VIN", async () => {
  const nsw = await look({ rego: "BEW76P", state: "NSW" });
  same(
    nsw.fields,
    { year: 1994, make: "Ford", model: "Fairmont", variant: "EF", body: "Sedan", transmission: "Automatic", engine: "4.0L 6-cylinder" },
    "NSW fields",
  );
  expect(!("vin" in nsw.fields) && nsw.extra.vehicleCode === "FORFMT---7402E01994A", "vehicle code kept apart");
  const tas = await look({ rego: "E09FK", state: "TAS" });
  expect(tas.fields.model === "CX-5" && tas.fields.variant === "Maxx (4x2)" && tas.fields.transmission === "Manual", "TAS");
  const wa = await look({ rego: "ZM06WA", state: "WA" });
  expect(wa.fields.model === "Mazda6" && wa.fields.variant === "GH · Classic" && wa.fields.engine === "2.5L 4-cylinder", "WA");
});
await check("VIC, QLD, ACT and NT records are read without guessing", async () => {
  const vic = await look({ rego: "ZZA271", state: "VIC" });
  expect(vic.fields.vin === "KMHJU81CSCU459552" && !vic.fields.engine, "VIC engine number isn't an engine size");
  expect(vic.extra.engineNumber === "G4KECU661333", "VIC engine number kept");
  const qld = await look({ rego: "949RWP", state: "QLD" });
  expect(qld.fields.model === "Accent" && qld.fields.body === "Hatch", "QLD model without the body word");
  const act = await look({ rego: "YYF447", state: "ACT" });
  expect(act.fields.make === "Mercedes-Benz" && !act.fields.model, "ACT make, and no model when it only repeats the make");
  const nt = await look({ rego: "CB78MH", state: "NT" });
  expect(nt.fields.regoExpiry === "2017-03-23" && nt.extra.registration === "Registered", "NT expiry from milliseconds");
});
await check("A stolen record carries a warning", async () => {
  const result = await look({ rego: "STOLEN1", state: "VIC" });
  expect(result.warnings.length === 1 && /stolen/.test(result.warnings[0]), "warning");
});
await check("VIN lookups work, and bad input is refused before any lookup is paid for", async () => {
  const result = await look({ vin: "6g1-fk5ep0gl303518" });
  expect(result.fields.make === "Holden" && result.fields.engine === "6.2L" && result.fields.vin === "6G1FK5EP0GL303518", "VIN");
  for (const [query, pattern] of [
    [{ rego: "", state: "SA" }, /Enter the rego/],
    [{ rego: "ABC123", state: "XX" }, /state or territory/],
    [{ vin: "WBA123" }, /too short/],
  ]) {
    const error = await look(query).catch((failure) => failure);
    expect(error.code === "invalid" && pattern.test(error.message), `refused ${JSON.stringify(query)}`);
  }
});
await check("Provider failures become clear messages", async () => {
  for (const [rego, code] of [
    ["NOPE1", "not_found"],
    ["NOCREDIT", "credits"],
    ["BADUSER", "config"],
  ]) {
    const error = await look({ rego, state: "SA" }).catch((failure) => failure);
    expect(error.code === code, `${rego} gives ${code}, got ${error.code}`);
  }
  const offline = await lookupVehicle({ provider: null, query: { rego: "ABC123", state: "SA" } }).catch((e) => e);
  expect(offline.code === "config", "no provider");
});
await check("The live provider posts the rego, state and username, and reads the XML reply", async () => {
  const calls = [];
  const record = { Description: "WHITE MITSUBISHI STATION WAGON", CarMake: { CurrentTextValue: "MITSUBISHI" } };
  const xml = `<?xml version="1.0"?><Vehicle xmlns="http://regcheck.org.uk"><vehicleJson>${JSON.stringify(record)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")}</vehicleJson></Vehicle>`;
  const fake = async (url, init) => {
    calls.push({ url, init });
    if (String(init.body).includes("RegistrationNumber=NONE")) return new Response("No vehicles found", { status: 500 });
    return new Response(xml, { status: 200 });
  };
  const live = regCheckProvider({ username: "madi", fetchImpl: fake });
  same(await live.byRego("YY819H", "SA"), record, "parsed record");
  const body = new URLSearchParams(calls[0].init.body);
  expect(calls[0].url === "https://www.regcheck.org.uk/api/reg.asmx/CheckAustralia", "endpoint");
  expect(calls[0].init.method === "POST" && body.get("State") === "SA" && body.get("username") === "madi", "form");
  const error = await live.byRego("NONE", "SA").catch((failure) => failure);
  expect(error.code === "not_found", "500 means not found");
  expect(parseRegCheckXml("<Vehicle><vehicleJson></vehicleJson></Vehicle>") === null, "empty reply");
});
await check("A repeat lookup within 30 days comes from the cache instead of costing a credit", async () => {
  const saved = new Map();
  const cache = { get: async (key) => saved.get(key) || null, set: async (key, value) => saved.set(key, value) };
  let calls = 0;
  const counting = { ...provider, byRego: (...args) => (calls++, provider.byRego(...args)) };
  const first = await lookupVehicle({ provider: counting, cache, query: { rego: "S123ABC", state: "SA" } });
  const second = await lookupVehicle({ provider: counting, cache, query: { rego: "s123abc", state: "SA" } });
  expect(!first.cached && second.cached && calls === 1, `cached (calls ${calls})`);
  await lookupVehicle({ provider: counting, cache, query: { rego: "S123ABC", state: "SA" }, fresh: true });
  expect(calls === 2, "fresh lookups skip the cache");
});

const photo = (id = "p-abc123") => ({
  id,
  src: `/api/stock/dev-photo/${id}-1600.webp`,
  srcset: `/api/stock/dev-photo/${id}-480.webp 480w, /api/stock/dev-photo/${id}-1600.webp 1600w`,
  width: 2400,
  height: 1600,
  share: `/api/stock/dev-photo/${id}-share.jpg`,
});
const full = { year: 2016, make: "HSV", model: "GTS", kms: "58,420", price: "$94,990", photos: [photo()] };

await check("Drafts can be incomplete; the website needs the basics and a photo", () => {
  const draft = prepareCar({ make: "HSV" }, emptyDoc());
  expect(!draft.errors.length && /^draft-[0-9a-f]{8}$/.test(draft.car.id) && draft.car.stock === "MM101", "draft");
  const missing = prepareCar({ status: "available", make: "HSV", model: "GTS", year: 2016 }, emptyDoc());
  expect(missing.errors[0] === "To put it on the website, add the kilometres, the price and a photo.", missing.errors[0]);
  const ok = prepareCar({ ...full, status: "available", tag: "just arrived" }, emptyDoc());
  expect(!ok.errors.length && ok.car.kms === 58420 && ok.car.price === 94990 && ok.car.tag === "JUST ARRIVED", "cleaned");
  expect(ok.car.id === "hsv-gts-2016" && ok.car.publishedAt, "web address set when it goes live");
});
await check("Web addresses are unique, and kept once a car is live", () => {
  const doc = { ...emptyDoc(), cars: [{ id: "hsv-gts-2016", status: "available", photos: [] }] };
  expect(prepareCar({ ...full, status: "available" }, doc).car.id === "hsv-gts-2016-2", "suffix");
  const live = { ...emptyDoc(), cars: [{ id: "hsv-gts-2016", status: "available", photos: [photo()] }] };
  const renamed = prepareCar({ ...full, id: "hsv-gts-2016", status: "available", model: "Clubsport" }, live);
  expect(renamed.car.id === "hsv-gts-2016", "address kept after a rename");
});
await check("Only the stock manager's own photo addresses are accepted", () => {
  const { car } = prepareCar(
    {
      photos: [
        photo(),
        { id: "p-bad1", src: "javascript:alert(1)" },
        { id: "p-bad2", src: "https://example.com/x.jpg" },
        { id: "p-site", src: "/images/hsv-gts-genf-front.jpg", srcset: "https://evil.example/x.jpg 480w" },
      ],
    },
    emptyDoc(),
  );
  expect(car.photos.length === 2 && car.photos[1].srcset === "", "unsafe photos dropped and unsafe sizes stripped");
});
await check("Sold dates are recorded, and cleared when a car goes back on sale", () => {
  const { car } = prepareCar({ ...full, status: "sold" }, emptyDoc());
  expect(car.soldAt && car.status === "sold", "sold");
  const back = prepareCar({ ...car, status: "available" }, { ...emptyDoc(), cars: [car] });
  expect(back.car.soldAt === null, "back on sale");
});
await check("The website snapshot leaves out drafts and private details", () => {
  const live = prepareCar({ ...full, status: "available", rego: "S123ABC", state: "SA", vin: "6G1FK5EP0GL303518" }, emptyDoc()).car;
  const sold = { ...prepareCar({ ...full, status: "sold", model: "Maloo" }, emptyDoc()).car, id: "hsv-maloo-2016" };
  const draft = prepareCar({ make: "Holden" }, emptyDoc()).car;
  const snapshot = publicSnapshot({ ...emptyDoc(), cars: [sold, draft, live] });
  same(snapshot.vehicles.map((car) => car.id), ["hsv-gts-2016", "hsv-maloo-2016"], "for sale first, no drafts");
  const text = JSON.stringify(snapshot);
  for (const secret of ["S123ABC", "6G1FK5EP0GL303518", "rego", "vin", "lookup"]) expect(!text.includes(secret), `no ${secret}`);
  expect(snapshot.photos[live.photos[0].src].srcset.includes("480w"), "photo sizes");
  same(publicSnapshot({ ...emptyDoc(), cars: [draft] }), { managed: false }, "drafts only keep the samples");
});
await check("Sessions: signed, expiring, and tied to the password", () => {
  const cookie = sessionCookie("correct horse battery", { secure: true });
  expect(/HttpOnly/.test(cookie) && /SameSite=Strict/.test(cookie) && /Secure/.test(cookie) && /Path=\/api\/stock/.test(cookie), "attributes");
  const request = (value) => new Request("https://x/api/stock", { headers: { cookie: value } });
  const value = cookie.split(";")[0];
  expect(hasSession(request(value), "correct horse battery"), "valid");
  expect(!hasSession(request(value), "a different password"), "password change signs out");
  expect(!hasSession(request(value.replace(/\.(.)/, ".x$1")), "correct horse battery"), "tampered");
  expect(!hasSession(request(value), "correct horse battery", Date.now() + 31 * 864e5), "expired");
  const throttle = loginThrottle();
  for (let n = 0; n < 5; n++) throttle.miss("1.2.3.4");
  expect(throttle.wait("1.2.3.4") > 0 && throttle.wait("5.6.7.8") === 0, "five misses lock one address out");
});
await check("The file store refuses a save made from out-of-date stock", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-store-"));
  try {
    const store = fileStore(dir);
    const first = await store.read();
    const { etag } = await store.write({ ...first.doc, version: 1 }, first.etag);
    const error = await store.write({ ...first.doc, version: 2 }, first.etag).catch((failure) => failure);
    expect(error instanceof ConflictError, "stale write refused");
    await store.write({ ...first.doc, version: 2 }, etag);
    expect((await store.read()).doc.version === 2, "fresh write saved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
// An in-memory stand-in for @vercel/blob with the behaviour the store
// relies on: random suffixes, refusing overwrites unless allowed, and ETag
// conditions.
function fakeBlob() {
  const blobs = new Map();
  let serial = 0;
  class BlobPreconditionFailedError extends Error {}
  const url = (pathname) => `https://abc123.public.blob.vercel-storage.com/${pathname}`;
  return {
    blobs,
    BlobPreconditionFailedError,
    async put(pathname, body, options) {
      if (options.access !== "public") throw new Error("this store is public");
      let path = pathname;
      if (options.addRandomSuffix) path = pathname.replace(/(\.[a-z]+)$/, `-${Math.random().toString(36).slice(2, 12)}$1`);
      const existing = blobs.get(path);
      if (options.ifMatch && existing?.etag !== options.ifMatch) throw new BlobPreconditionFailedError();
      if (existing && !options.allowOverwrite && !options.ifMatch) throw new Error("blob already exists");
      const etag = `"e${(serial += 1)}"`;
      blobs.set(path, { body: String(body), etag, uploadedAt: new Date(Date.now() + serial) });
      return { url: url(path), pathname: path, etag };
    },
    async list({ prefix }) {
      return {
        blobs: [...blobs]
          .filter(([path]) => path.startsWith(prefix))
          .map(([path, blob]) => ({ url: url(path), pathname: path, uploadedAt: blob.uploadedAt, etag: blob.etag })),
      };
    },
    async get(pathname, options) {
      const blob = blobs.get(pathname);
      if (!blob || options.useCache !== false) return blob ? { statusCode: 200, stream: new Blob([blob.body]).stream(), blob } : null;
      return { statusCode: 200, stream: new Blob([blob.body]).stream(), blob: { etag: blob.etag } };
    },
    async del(urls) {
      for (const item of [].concat(urls)) blobs.delete(item.replace(/^https:\/\/[^/]+\//, ""));
    },
  };
}
await check("The Blob store keeps its record at an unguessable address and refuses out-of-date saves", async () => {
  const { blobStore } = await import("../server/stock/stores.js");
  const sdk = fakeBlob();
  const store = blobStore(sdk);
  const first = await store.read();
  expect(first.etag === null && first.doc.version === 0, "empty to start");
  const saved = await store.write({ ...first.doc, version: 1 }, first.etag);
  const [record] = [...sdk.blobs.keys()].filter((path) => path.startsWith("stock/data/"));
  expect(/^stock\/data\/stock-[a-z0-9]{10}\.json$/.test(record), `random suffix (${record})`);
  const second = blobStore(sdk); // a fresh function instance finds it again
  const read = await second.read();
  expect(read.doc.version === 1 && read.etag === saved.etag, "found by listing");
  await second.write({ ...read.doc, version: 2 }, read.etag);
  const stale = await store.write({ ...read.doc, version: 2 }, saved.etag).catch((error) => error);
  expect(stale instanceof ConflictError, "stale save refused");
  const lost = await blobStore(sdk).write({ ...read.doc, version: 9 }, null).catch((error) => error);
  expect(lost instanceof ConflictError, "a second first-save is refused too");
  expect([...sdk.blobs.keys()].filter((path) => path.startsWith("stock/history/")).length === 2, "history copies");
  const photo = await store.putPhoto("p-abc123-480.webp", new Uint8Array([1]), "image/webp");
  expect(photo === "https://abc123.public.blob.vercel-storage.com/stock/photos/p-abc123-480.webp", "photo URL");
  await store.deleteFiles([photo, "https://example.com/stock/photos/x.jpg", "/images/hsv-gts-genf-front.jpg"]);
  expect(!sdk.blobs.has("stock/photos/p-abc123-480.webp"), "own photos deleted, nothing else");
  await store.cache.set("rego-SA-S123ABC", { Description: "RED HSV SEDAN" });
  same(await store.cache.get("rego-SA-S123ABC"), { Description: "RED HSV SEDAN" }, "lookup cache");
});
await check("The API refuses requests without its header, unknown calls and fake photos", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-api-"));
  try {
    const password = "a long test password";
    const ctx = { mode: "test", password, store: fileStore(dir), provider, publish: async () => null, secureCookies: false };
    const call = (op, init = {}) => handleStockRequest(new Request(`http://x/api/stock?op=${op}`, init), ctx);
    const status = await (await call("status")).json();
    expect(status.ok && !status.signedIn && status.setup.storage === "file", "status");
    expect((await call("login", { method: "POST", body: "{}" })).status === 403, "no header");
    const cookie = sessionCookie(password, { secure: false }).split(";")[0];
    const headers = { "x-mm-stock": "1", cookie };
    expect((await call("stock", { headers: { cookie: "mm_stock=1.x" } })).status === 401, "bad cookie");
    expect((await call("nope", { method: "POST", headers })).status === 404, "unknown op");
    const form = new FormData();
    form.append("id", "p-fake01");
    form.append("w480", new Blob(["<svg onload=alert(1)>"], { type: "image/jpeg" }), "w480.jpg");
    expect((await call("photo", { method: "POST", headers, body: form })).status === 415, "not really an image");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const failed = results.filter((passed) => !passed).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
if (failed) process.exitCode = 1;
