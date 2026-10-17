// The cars the website shows. `virtual:mm-stock` (server/stock/vite-plugin.js)
// holds the stock manager's published cars, or { managed: false } before
// any are published, in which case the sample listings show.
import snapshot from "virtual:mm-stock";
import { sampleVehicles } from "./sample-stock";

export const sampleStock = !snapshot.managed;
export const vehicles = snapshot.managed ? snapshot.vehicles : sampleVehicles;
// Sizes of the photos uploaded through the stock manager, by src.
export const managedPhotos = snapshot.photos || {};

// Dev server only: when the stock manager publishes, website pages reload
// with the new stock (a deployed site rebuilds instead).
if (import.meta.hot)
  import.meta.hot.on("mm-stock:changed", () => {
    if (!window.location.pathname.startsWith("/stock/manage")) window.location.reload();
  });
