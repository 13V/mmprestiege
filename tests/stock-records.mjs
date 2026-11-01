// Unit checks for the stock manager's server code: car records, the website
// snapshot, sign-in, the stores and the API's guards. No browser or server
// needed: `node tests/stock-records.mjs`.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasSession, loginThrottle, sessionCookie } from "../server/stock/auth.js";
import { handleStockRequest } from "../server/stock/handler.js";
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
  for (const secret of ["S123ABC", "6G1FK5EP0GL303518", "rego", "vin"]) expect(!text.includes(secret), `no ${secret}`);
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
});
await check("The API refuses requests without its header, unknown calls and fake photos", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-api-"));
  try {
    const password = "a long test password";
    const ctx = { mode: "test", password, store: fileStore(dir), publish: async () => null, secureCookies: false };
    const call = (op, init = {}) => handleStockRequest(new Request(`http://x/api/stock?op=${op}`, init), ctx);
    const status = await (await call("status")).json();
    expect(status.ok && !status.signedIn && status.setup.storage === "file", "status");
    expect(!("lookup" in status.setup), "no rego lookup in the setup");
    expect((await call("login", { method: "POST", body: "{}" })).status === 403, "no header");
    const cookie = sessionCookie(password, { secure: false }).split(";")[0];
    const headers = { "x-mm-stock": "1", cookie };
    expect((await call("stock", { headers: { cookie: "mm_stock=1.x" } })).status === 401, "bad cookie");
    expect((await call("nope", { method: "POST", headers })).status === 404, "unknown op");
    expect((await call("lookup", { method: "POST", headers, body: "{}" })).status === 404, "the rego lookup is gone");
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
