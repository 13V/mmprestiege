"""Makes a 3D colour LUT that gives a hero film the photos' grade.

The white balance and levels are measured on frames spread through the film,
then the per-pixel part of grade.py's look (white balance, tone curve and
colour) is sampled on a 33-point cube. scripts/films/encode.sh applies it
with ffmpeg's lut3d filter. Grain clean-up and clarity are left out: they
work on neighbouring pixels, and the upscaled films are already clean.

Usage: python3 -I scripts/photos/film_lut.py <film.mkv> <out.cube> [look]
(look defaults to "hero"). Needs ffmpeg, numpy and opencv-python-headless.
"""
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import grade as g  # noqa: E402

SIZE = 33
SAMPLES = 24


def frames(path, width=640):
    """Evenly spaced frames, converted to RGB the same way encode.sh does."""
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                            "-show_entries", "stream=nb_read_packets,width,height", "-of", "csv=p=0", path],
                           check=True, capture_output=True, text=True).stdout.strip().split(",")
    w, h, count = int(probe[0]), int(probe[1]), int(probe[2])
    height = round(h * width / w / 2) * 2
    step = max(1, count // SAMPLES)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf",
                          f"select='not(mod(n\\,{step}))',format=gbrp,scale={width}:{height}:flags=area",
                          "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, height, width, 3)


def main():
    film, out = sys.argv[1], sys.argv[2]
    look = sys.argv[3] if len(sys.argv) > 3 else "hero"
    sample = frames(film)
    measured = g.measure(g.u8_to_lin(sample.reshape(-1, sample.shape[2], 3)))
    axis = np.linspace(0, 1, SIZE, dtype=np.float32)
    # .cube order: red changes fastest, then green, then blue.
    b, gr, r = np.meshgrid(axis, axis, axis, indexing="ij")
    rgb = np.stack([r, gr, b], -1).reshape(-1, 1, 3)
    lab = g.global_grade(g.srgb_to_lin(rgb), g.settings(look), measured)
    graded = g.lin_to_srgb(np.clip(g.oklab_to_lin(lab), 0, 1)).reshape(-1, 3)
    with open(out, "w") as f:
        f.write(f'TITLE "MM Prestige {look} grade"\nLUT_3D_SIZE {SIZE}\n')
        f.writelines(f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n" for v in graded)
    n = measured["neutral"]
    print(f"{os.path.basename(film)}: {len(sample)} frames, neutral {n.round(4)}, "
          f"levels {measured['black']:.3f}-{measured['white']:.3f} -> {out}")


if __name__ == "__main__":
    main()
