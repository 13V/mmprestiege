// Where the stock lives. Production uses a public Vercel Blob store (photos
// must be public); development and tests use a folder on disk.
//
// The stock record (cars, drafts, regos and VINs) is a single JSON blob
// created once with a random suffix, so its URL can't be guessed; only the
// server can find it by listing the store. Edits overwrite it in place with
// the ETag it was read with, so two devices can't overwrite each other.
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export class ConflictError extends Error {
  constructor() {
    super("The stock changed on another device. Reload to see the latest.");
    this.code = "conflict";
  }
}

export const emptyDoc = () => ({ version: 0, updatedAt: null, nextStock: 101, cars: [] });

const LOOKUP_DAYS = 30;
const fresh = (date) => Date.now() - new Date(date).getTime() < LOOKUP_DAYS * 864e5;

export function blobStore(blob) {
  const { put, list, del, get, BlobPreconditionFailedError } = blob;
  let dataPath = null;

  async function findData() {
    if (dataPath) return dataPath;
    const { blobs } = await list({ prefix: "stock/data/", limit: 20 });
    const main = blobs
      .filter((item) => /^stock\/data\/stock-[^/]+\.json$/.test(item.pathname))
      .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))[0];
    dataPath = main?.pathname || null;
    return dataPath;
  }
  async function readJson(pathname) {
    const result = await get(pathname, { access: "public", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return { json: JSON.parse(await new Response(result.stream).text()), etag: result.blob.etag };
  }
  const json = (value) => JSON.stringify(value);

  return {
    kind: "blob",
    async read() {
      const path = await findData();
      if (!path) return { doc: emptyDoc(), etag: null };
      const found = await readJson(path);
      if (!found) {
        dataPath = null;
        return { doc: emptyDoc(), etag: null };
      }
      return { doc: found.json, etag: found.etag };
    },
    async write(doc, etag) {
      let result;
      try {
        if (!etag) {
          if (await findData()) throw new ConflictError();
          result = await put("stock/data/stock.json", json(doc), {
            access: "public",
            addRandomSuffix: true,
            contentType: "application/json",
            cacheControlMaxAge: 60,
          });
          dataPath = result.pathname;
        } else {
          result = await put(dataPath, json(doc), {
            access: "public",
            allowOverwrite: true,
            ifMatch: etag,
            contentType: "application/json",
            cacheControlMaxAge: 60,
          });
        }
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) throw new ConflictError();
        throw error;
      }
      // A dated copy every save, pruned to the latest 40, in case a change
      // ever needs undoing.
      await put(`stock/history/${new Date().toISOString().replace(/[:.]/g, "-")}.json`, json(doc), {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
      }).catch(() => {});
      if (doc.version % 10 === 0) {
        const { blobs } = await list({ prefix: "stock/history/", limit: 1000 }).catch(() => ({ blobs: [] }));
        const old = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(40);
        if (old.length) await del(old.map((item) => item.url)).catch(() => {});
      }
      return { etag: result.etag };
    },
    async putPhoto(name, bytes, contentType) {
      const result = await put(`stock/photos/${name}`, bytes, {
        access: "public",
        contentType,
        cacheControlMaxAge: 31536000,
      });
      return result.url;
    },
    async deleteFiles(urls) {
      const own = urls.filter((url) => /\.public\.blob\.vercel-storage\.com\/stock\/photos\//.test(url));
      if (own.length) await del(own);
    },
    cache: {
      async get(key) {
        const { blobs } = await list({ prefix: `stock/lookups/${key}/`, limit: 10 });
        const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
        if (!latest || !fresh(latest.uploadedAt)) return null;
        return (await readJson(latest.pathname))?.json || null;
      },
      async set(key, value) {
        await put(`stock/lookups/${key}/lookup.json`, json(value), {
          access: "public",
          addRandomSuffix: true,
          contentType: "application/json",
        });
      },
    },
  };
}

// Development and tests: the same behaviour in a folder.
export function fileStore(dir) {
  const dataFile = join(dir, "stock.json");
  const photos = join(dir, "photos");
  const lookups = join(dir, "lookups");
  const tag = (body) => createHash("sha256").update(body).digest("hex").slice(0, 16);
  async function writeAtomic(file, body) {
    await mkdir(join(file, ".."), { recursive: true });
    const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(temp, body);
    await rename(temp, file);
  }
  return {
    kind: "file",
    dir,
    photoDir: photos,
    async read() {
      if (!existsSync(dataFile)) return { doc: emptyDoc(), etag: null };
      const body = await readFile(dataFile, "utf8");
      return { doc: JSON.parse(body), etag: tag(body) };
    },
    async write(doc, etag) {
      const current = existsSync(dataFile) ? tag(await readFile(dataFile, "utf8")) : null;
      if (current !== etag) throw new ConflictError();
      const body = JSON.stringify(doc, null, 2);
      await writeAtomic(dataFile, body);
      return { etag: tag(body) };
    },
    async putPhoto(name, bytes) {
      await writeAtomic(join(photos, name), Buffer.from(bytes));
      return `/api/stock/dev-photo/${name}`;
    },
    async deleteFiles(urls) {
      for (const url of urls) {
        const match = url.match(/^\/api\/stock\/dev-photo\/([A-Za-z0-9._-]+)$/);
        if (match) await rm(join(photos, match[1]), { force: true });
      }
    },
    cache: {
      async get(key) {
        const file = join(lookups, `${key}.json`);
        if (!existsSync(file)) return null;
        const saved = JSON.parse(await readFile(file, "utf8"));
        return fresh(saved.at) ? saved.record : null;
      },
      async set(key, record) {
        await writeAtomic(join(lookups, `${key}.json`), JSON.stringify({ at: new Date().toISOString(), record }));
      },
    },
    async photoFile(name) {
      if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
      const file = join(photos, name);
      return existsSync(file) ? readFile(file) : null;
    },
    async listPhotos() {
      return existsSync(photos) ? readdir(photos) : [];
    },
  };
}
