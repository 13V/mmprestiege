import variants from "./image-variants.json";

// Responsive sources for a photo in public/images. The WebP sizes come from
// scripts/optimize-images.mjs; the original file stays as the fallback src.
export function responsive(src, sizes) {
  const entry = variants[src];
  return entry ? { src, srcSet: entry.srcset, sizes } : { src };
}
