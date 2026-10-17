import variants from "./image-variants.json";

// Responsive sources for a photo in public/images. The WebP sizes come from
// scripts/optimize-images.mjs; the original file stays as the fallback src.
export function responsive(src, sizes) {
  const entry = variants[src];
  return entry ? { src, srcSet: entry.srcset, sizes } : { src };
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
