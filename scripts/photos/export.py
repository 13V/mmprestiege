"""Makes the site photos in public/images from the photoshoot originals.

Each shot is graded once as a whole frame (grade.py), then every crop listed
for it in photos.txt is cut, resized, sharpened for the web and saved as a
high-quality JPEG with no camera metadata. Run `npm run images` afterwards to
make the WebP sizes.

Usage: python3 -I scripts/photos/export.py <folder of originals> [name ...]
The originals are MMMOTOR.CWATSON.jpg and MMMOTOR.CWATSON-2.jpg to -29.jpg.
Give names to remake only those photos. Needs numpy, opencv-python-headless
and Pillow.
"""
import os
import sys
import time
from collections import defaultdict

import numpy as np
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import grade as g  # noqa: E402

OUT = os.path.join(HERE, "..", "..", "public", "images")


def read_spec():
    rows = []
    for line in open(os.path.join(HERE, "photos.txt")):
        line = line.split("#")[0].strip()
        if not line:
            continue
        name, shot, x0, y0, x1, y1, width, look = line.split()
        rows.append(dict(name=name, shot=int(shot), box=tuple(map(float, (x0, y0, x1, y1))),
                         width=int(width), look=look))
    return rows


def original(folder, shot):
    name = "MMMOTOR.CWATSON.jpg" if shot == 1 else f"MMMOTOR.CWATSON-{shot}.jpg"
    with Image.open(os.path.join(folder, name)) as im:
        return np.asarray(ImageOps.exif_transpose(im).convert("RGB"))


def save_jpeg(s, path):
    Image.fromarray(g.to_u8(s)).save(path, quality=90, subsampling=0, optimize=True, progressive=True)


def make(row, frame):
    h, w = frame.shape[:2]
    x0, y0, x1, y1 = row["box"]
    crop = frame[round(y0 * h):round(y1 * h), round(x0 * w):round(x1 * w)]
    path = os.path.join(OUT, row["name"])
    width = min(row["width"], crop.shape[1])
    ratio = crop.shape[1] / width
    out = g.resize(crop, width)
    # Downsized photos take normal web sharpening; full-size crops only a little.
    out = g.sharpen(out, amount=0.55 if ratio >= 1.5 else 0.3)
    save_jpeg(out, path)
    return out.shape[1], out.shape[0]


def main():
    folder, names = sys.argv[1], set(sys.argv[2:])
    rows = [r for r in read_spec() if not names or r["name"] in names]
    if names - {r["name"] for r in rows}:
        sys.exit(f"not in photos.txt: {', '.join(sorted(names - {r['name'] for r in rows}))}")
    by_shot = defaultdict(list)
    for r in rows:
        by_shot[r["shot"]].append(r)
    for shot, shot_rows in sorted(by_shot.items()):
        start = time.time()
        lin = g.u8_to_lin(original(folder, shot))
        measured = g.measure(lin)
        for look in sorted({r["look"] for r in shot_rows}):
            frame = g.grade(lin, look, measured)
            for r in (r for r in shot_rows if r["look"] == look):
                w, h = make(r, frame)
                size = os.path.getsize(os.path.join(OUT, r["name"])) // 1024
                print(f"{r['name']:<32} shot {shot:>2} {look:<8} {w}x{h} {size} KB", flush=True)
            del frame
        print(f"  shot {shot} done in {time.time() - start:.0f} s", flush=True)


if __name__ == "__main__":
    main()
