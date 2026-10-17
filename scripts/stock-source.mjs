// Which cars the website shows: the stock manager's published cars when
// there are any (a snapshot written by scripts/stock-snapshot.mjs before
// each build), otherwise the sample listings.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sampleVehicles } from "../src/sample-stock.js";

export const snapshotFile = () => resolve(process.env.STOCK_SNAPSHOT || ".stock/snapshot.json");

export function readSnapshot(file = snapshotFile()) {
  if (!existsSync(file)) return { managed: false };
  try {
    const snapshot = JSON.parse(readFileSync(file, "utf8"));
    return snapshot?.managed && Array.isArray(snapshot.vehicles) && snapshot.vehicles.length
      ? snapshot
      : { managed: false };
  } catch {
    return { managed: false };
  }
}

export const publicStock = (snapshot = readSnapshot()) =>
  snapshot.managed
    ? { vehicles: snapshot.vehicles, sampleStock: false, photos: snapshot.photos || {} }
    : { vehicles: sampleVehicles, sampleStock: true, photos: {} };
