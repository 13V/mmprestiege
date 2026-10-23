import siteVariants from "./image-variants.json";
import { managedPhotos } from "./stock";

// Sizes for a photo: site photos in public/images get WebP copies from
// scripts/optimize-images.mjs; photos uploaded in the stock manager are
// resized in the browser when they're added.
const variants = { ...siteVariants, ...managedPhotos };

// Responsive sources for a photo. The original file (or, for uploaded
// photos, the 1600 px copy) stays as the fallback src.
export function responsive(src, sizes) {
  const entry = variants[src];
  return entry ? { src, srcSet: entry.srcset, sizes } : { src };
}

// A site photo's full size, so layouts can keep its shape before it loads.
export function photoSize(src) {
  const entry = siteVariants[src];
  return entry ? { width: entry.width, height: entry.height } : {};
}

// The smallest resized copy of a photo, used as an instant placeholder.
export function smallest(src) {
  const first = variants[src]?.srcset.split(", ")[0];
  return first ? first.split(" ")[0] : src;
}

// Starts loading a photo at the size it will be drawn, so it is ready
// before the page that shows it opens.
const warmed = new Set();
export function prefetch(src, sizes) {
  if (warmed.has(src) || typeof Image === "undefined") return;
  warmed.add(src);
  const image = new Image();
  image.decoding = "async";
  image.sizes = sizes;
  if (variants[src]) image.srcset = variants[src].srcset;
  image.src = src;
}
