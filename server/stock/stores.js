// Where the stock lives. Production uses a public Vercel Blob store (photos
// must be public); development and tests use a folder on disk.
//
// In the Blob store, the stock record (cars, drafts, regos and VINs) is
// never overwritten: each save writes a new blob,
// stock/records/v0000042-<random>.json, and the newest version is found by
// listing the store. Vercel's CDN can keep serving an overwritten blob's old
// content for a minute or more, so a save straight after another (or the
// website build a save starts) could read stale stock; a new address is
// always read fresh, and listing goes to the Blob API rather than the CDN.
// The random suffix keeps the records' addresses unguessable, and the latest
// 40 versions are kept, in case a change ever needs undoing.
//
// A save names the version it was based on (its "etag", the pathname of the
// version it read). If that's no longer the newest, or another save of the
// same version got there first, it's refused, so two devices can't
// overwrite each other.
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

const RECORD = /^v(\d{7})-[A-Za-z0-9]+\.json$/;
const KEEP = 40;

export function blobStore(blob, { prefix = "stock/records/" } = {}) {
  const { put, list, del, get } = blob;

  // Every saved version, newest first; of two saves of the same version, the
  // first to arrive comes first.
  async function versions() {
    const found = [];
    let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const item of page.blobs) {
        const match = RECORD.exec(item.pathname.slice(prefix.length));
        if (match) found.push({ ...item, version: Number(match[1]) });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return found.sort((a, b) => b.version - a.version || new Date(a.uploadedAt) - new Date(b.uploadedAt));
  }

  return {
    kind: "blob",
    async read() {
      const [latest] = await versions();
      if (!latest) return { doc: emptyDoc(), etag: null };
      const result = await get(latest.url, { access: "public" });
      // Never fall back to empty stock: a save or a website build would then
      // wipe the cars. Failing keeps the last good version.
      if (!result || result.statusCode !== 200) throw new Error(`The stock record ${latest.pathname} couldn't be read.`);
      return { doc: JSON.parse(await new Response(result.stream).text()), etag: latest.pathname };
    },
    async write(doc, etag) {
      const [latest] = await versions();
      if ((latest?.pathname ?? null) !== (etag ?? null)) throw new ConflictError();
      const saved = await put(`${prefix}v${String(doc.version).padStart(7, "0")}.json`, JSON.stringify(doc), {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
      });
      const after = await versions();
      const first = after.find((item) => item.version === doc.version);
      if (first && first.pathname !== saved.pathname) {
        await del(saved.url).catch(() => {});
        throw new ConflictError();
      }
      const old = after.slice(KEEP);
      if (old.length) await del(old.map((item) => item.url)).catch(() => {});
      return { etag: saved.pathname };
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
  };
}

// Development and tests: the same behaviour in a folder.
export function fileStore(dir) {
  const dataFile = join(dir, "stock.json");
  const photos = join(dir, "photos");
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
