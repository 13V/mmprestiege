// Prepares a photo in the browser before upload: resized copies at the
// widths the website serves (like scripts/optimize-images.mjs does for the
// site's own photos) and a 1200 × 630 crop for link previews. Re-encoding
// also drops the camera's metadata, including its GPS location.
const WIDTHS = [480, 960, 1600, 2400];
const SHARE = { width: 1200, height: 630 };

let webpSupport;
function encodeType() {
  if (webpSupport === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupport ? ["image/webp", 0.8] : ["image/jpeg", 0.84];
}

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall back to an <img>, which some browsers decode more formats with.
    }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return image;
  } catch {
    throw new Error("This photo couldn't be opened. Try a JPEG or take it again with the camera.");
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function canvas(width, height) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return [element, context];
}

// Halving in steps keeps fine detail (grilles, badges) from shimmering.
function resize(source, sourceWidth, sourceHeight, width) {
  let current = source;
  let w = sourceWidth;
  let h = sourceHeight;
  while (w / 2 > width) {
    const [next, context] = canvas(Math.round(w / 2), Math.round(h / 2));
    context.drawImage(current, 0, 0, next.width, next.height);
    current = next;
    w = next.width;
    h = next.height;
  }
  const height = Math.round((sourceHeight * width) / sourceWidth);
  const [output, context] = canvas(width, height);
  context.drawImage(current, 0, 0, width, height);
  return output;
}

const toBlob = (element, [type, quality]) =>
  new Promise((resolve, reject) =>
    element.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The photo couldn't be prepared."))), type, quality),
  );

// Returns { width, height, files: [[field, blob], ...] } and a small
// preview URL for the stock manager's own thumbnails.
export async function preparePhoto(file) {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
    throw new Error(`${file.name} isn't a photo.`);
  const image = await decode(file);
  const sourceWidth = image.width || image.naturalWidth;
  const sourceHeight = image.height || image.naturalHeight;
  if (sourceWidth < 400 || sourceHeight < 250)
    throw new Error("This photo is too small for the website. Use one at least 1200 pixels wide.");
  const type = encodeType();
  const widths = WIDTHS.filter((width) => width <= sourceWidth * 0.95);
  if (sourceWidth <= WIDTHS.at(-1) && !widths.some((width) => width >= sourceWidth * 0.9))
    widths.push(sourceWidth);
  const files = [];
  // Largest first, then each smaller size from the one before it.
  let previous = { element: image, width: sourceWidth, height: sourceHeight };
  for (const width of [...widths].sort((a, b) => b - a)) {
    const element = resize(previous.element, previous.width, previous.height, width);
    files.push([`w${width}`, await toBlob(element, type)]);
    previous = { element, width, height: element.height };
  }
  // Link preview: fill 1200 × 630 from the middle of the photo.
  const scale = Math.max(SHARE.width / sourceWidth, SHARE.height / sourceHeight);
  const cropWidth = SHARE.width / scale;
  const cropHeight = SHARE.height / scale;
  const [share, context] = canvas(SHARE.width, SHARE.height);
  context.drawImage(
    image,
    (sourceWidth - cropWidth) / 2,
    (sourceHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    SHARE.width,
    SHARE.height,
  );
  files.push(["share", await toBlob(share, ["image/jpeg", 0.82])]);
  image.close?.();
  const largest = Math.max(...widths);
  const preview = URL.createObjectURL(files.find(([field]) => field === `w${Math.min(...widths)}`)[1]);
  return {
    width: largest,
    height: Math.round((sourceHeight * largest) / sourceWidth),
    files,
    preview,
  };
}

export const newPhotoId = () =>
  `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
