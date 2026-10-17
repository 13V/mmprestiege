// Runs before `vite build`: reads the stock manager's cars from the Vercel
// Blob store and writes the website's view of them to .stock/snapshot.json.
// If the store can't be read the build fails, so Vercel keeps the last good
// version of the site live. With no store connected, the site keeps the
// sample listings. Setting STOCK_SNAPSHOT points the build at a fixed file
// instead (used by the tests).
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { publicSnapshot } from "../server/stock/records.js";
import { blobStore } from "../server/stock/stores.js";
import { snapshotFile } from "./stock-source.mjs";

if (process.env.STOCK_SNAPSHOT) {
  console.log(`Stock: using ${process.env.STOCK_SNAPSHOT}.`);
} else if (!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN)) {
  await rm(snapshotFile(), { force: true });
  console.log("Stock: no Blob store connected, so the site shows the sample listings.");
} else {
  const { doc } = await blobStore(await import("@vercel/blob")).read();
  const snapshot = publicSnapshot(doc);
  await mkdir(dirname(snapshotFile()), { recursive: true });
  await writeFile(snapshotFile(), JSON.stringify(snapshot));
  console.log(
    snapshot.managed
      ? `Stock: ${snapshot.vehicles.length} cars from the stock manager.`
      : "Stock: no cars published yet, so the site shows the sample listings.",
  );
}
