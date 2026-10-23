"""Makes a 3D LUT that turns HLG phone video (BT.2100: HLG transfer, BT.2020
primaries) into SDR for the web (BT.709 primaries, sRGB display gamma).

Phones record HDR video as HLG. Shown as it is, an HLG clip looks washed out
on a normal screen, and its strongest colours (the red paint) lie outside
BT.709, so a plain conversion clips them to flat, neon red. For each colour
the LUT:

1. undoes the HLG curve (scene light) and applies the HLG system gamma for
   a 1000 cd/m2 display (display light), as BT.2100 renders it;
2. converts BT.2020 primaries to BT.709 in linear light;
3. eases colours outside BT.709 back inside, keeping their hue and the
   shading on saturated paint (a soft gamut compression in the style of
   ACES's reference gamut compression), instead of clipping them;
4. sets the exposure: display light of `white` cd/m2 becomes SDR white;
5. rolls off highlights above `knee` towards white with a smooth shoulder,
   scaling R, G and B together so colours keep their hue;
6. turns strong reds a few degrees towards orange: the phone renders red
   paint with a crimson cast that the shoot's photos of the same cars don't
   have (greys, skin and other colours are left alone), and scales colour
   by `saturation`;
7. encodes with the sRGB curve, which is how browsers show BT.709 video and
   what the site's photos use.

ffmpeg applies it to the clip's R'G'B' (BT.2020 matrix, limited range, as
float) with lut3d; scripts/films/mobile.sh shows the whole chain.

Usage: python3 -I hlg_sdr_lut.py <out.cube> [white=450] [knee=0.6]
       [red_hue=8] [saturation=1] [size=65]
Needs numpy.
"""
import sys

import numpy as np

# BT.2100 HLG constants.
A, B, C = 0.17883277, 0.28466892, 0.55991073
SYSTEM_GAMMA = 1.2  # for a 1000 cd/m2 display
PEAK = 1000.0
Y2020 = np.array([0.2627, 0.6780, 0.0593])
# Linear BT.2020 RGB to linear BT.709 RGB (both D65).
M2020_709 = np.array([[1.660491, -0.587641, -0.072850],
                      [-0.124550, 1.132900, -0.008349],
                      [-0.018151, -0.100579, 1.118730]])
# Gamut compression: distances from the achromatic axis (per channel, 1.0 =
# the BT.709 gamut edge) start easing in at THRESHOLD, and the furthest
# BT.2020 colour lands at EDGE, just inside the gamut, so even the reddest
# paint keeps a little shading.
THRESHOLD = 0.75
EDGE = 0.96
POWER = 1.2
# OKLab (Björn Ottosson).
_M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                [0.2119034982, 0.6806995451, 0.1073969566],
                [0.0883024619, 0.2817188376, 0.6299787005]])
_M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                [1.9779984951, -2.4285922050, 0.4505937099],
                [0.0259040371, 0.7827717662, -0.8086757660]])


def hlg_inverse_oetf(e):
    e = np.clip(e, 0, 1)
    return np.where(e <= 0.5, e * e / 3, (np.exp((e - C) / A) + B) / 12)


def ootf(scene):
    """Scene light to display light, relative to the display's peak."""
    y = np.maximum(scene @ Y2020, 1e-9)
    return scene * (y ** (SYSTEM_GAMMA - 1))[..., None]


def gamut_limits(samples=65):
    """How far each channel strays outside BT.709 on the BT.2020 gamut's surface."""
    axis = np.linspace(0, 1, samples)
    faces = []
    for fixed in (0, 1):
        for c in range(3):
            u, v = np.meshgrid(axis, axis)
            rgb = np.zeros(u.shape + (3,))
            rgb[..., c] = fixed
            rgb[..., (c + 1) % 3], rgb[..., (c + 2) % 3] = u, v
            faces.append(rgb.reshape(-1, 3))
    lin = np.concatenate(faces) @ M2020_709.T
    ach = lin.max(-1, keepdims=True)
    ok = ach[:, 0] > 1e-6
    dist = (ach[ok] - lin[ok]) / ach[ok]
    return dist.max(0)


def compress(dist, limit):
    """Eases distances above THRESHOLD in, so that `limit` maps to EDGE."""
    lim = np.maximum(limit, EDGE + 1e-3)
    t, room = THRESHOLD, EDGE - THRESHOLD
    scale = (lim - t) / np.power(np.power(room / (lim - t), -POWER) - 1, 1 / POWER)
    over = np.maximum(dist - t, 0) / scale
    eased = t + scale * over / np.power(1 + np.power(over, POWER), 1 / POWER)
    return np.where(dist < t, dist, eased)


def gamut_compress(lin, limits):
    ach = lin.max(-1, keepdims=True)
    safe = np.where(ach > 1e-9, ach, 1.0)
    dist = (ach - lin) / safe
    out = ach - compress(dist, limits) * safe
    return np.where(ach > 1e-9, out, 0.0)


def shoulder(x, knee):
    """Straight up to `knee`, then an exponential roll-off towards 1.0."""
    span = 1 - knee
    return np.where(x <= knee, x, knee + span * (1 - np.exp(-(x - knee) / span)))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def colour(lin, red_hue, saturation):
    """Softens colour to `saturation` and turns strong reds (OKLab hue near
    20 degrees) `red_hue` degrees towards orange."""
    lab = np.cbrt(np.maximum(lin, 0) @ _M1.T) @ _M2.T
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
    # Full turn for strong reds and crimsons, fading out by orange and by
    # magenta, and for muted colours (greys, wood, skin).
    near = np.clip(1 - np.abs(((hue - 18 + 180) % 360) - 180) / 40, 0, 1)
    turn = np.radians(red_hue * smoothstep(0.07, 0.15, chroma) * near * near * (3 - 2 * near))
    a = saturation * (lab[..., 1] * np.cos(turn) - lab[..., 2] * np.sin(turn))
    b = saturation * (lab[..., 1] * np.sin(turn) + lab[..., 2] * np.cos(turn))
    lms = np.stack([lab[..., 0], a, b], -1) @ np.linalg.inv(_M2).T
    return np.clip((lms ** 3) @ np.linalg.inv(_M1).T, 0, 1)


def srgb_encode(lin):
    lin = np.clip(lin, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)


def convert(hlg, white=450.0, knee=0.6, red_hue=8.0, saturation=1.0, limits=None):
    """HLG R'G'B' (BT.2020, 0..1) to SDR sRGB-encoded BT.709 R'G'B' (0..1)."""
    limits = gamut_limits() if limits is None else limits
    display = ootf(hlg_inverse_oetf(hlg)) @ M2020_709.T
    display = gamut_compress(display, limits) * (PEAK / white)
    peak = display.max(-1, keepdims=True)
    display = display * np.where(peak > 1e-9, shoulder(peak, knee) / np.maximum(peak, 1e-9), 0.0)
    if red_hue or saturation != 1:
        display = colour(display, red_hue, saturation)
    return srgb_encode(display)


def main():
    out = sys.argv[1]
    white = float(sys.argv[2]) if len(sys.argv) > 2 else 450.0
    knee = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
    red_hue = float(sys.argv[4]) if len(sys.argv) > 4 else 8.0
    saturation = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    size = int(sys.argv[6]) if len(sys.argv) > 6 else 65
    limits = gamut_limits()
    axis = np.linspace(0, 1, size)
    # .cube order: red changes fastest, then green, then blue.
    b, g, r = np.meshgrid(axis, axis, axis, indexing="ij")
    sdr = convert(np.stack([r, g, b], -1).reshape(-1, 3), white, knee, red_hue, saturation, limits)
    with open(out, "w") as f:
        f.write(f'TITLE "HLG to SDR, white {white:g} cd/m2, knee {knee:g}, reds {red_hue:+g} deg, '
                f'saturation {saturation:g}"\nLUT_3D_SIZE {size}\n')
        f.writelines(f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n" for v in sdr)
    grey = convert(np.array([[0.5, 0.5, 0.5], [0.75, 0.75, 0.75], [1.0, 1.0, 1.0]]), white, knee, red_hue,
                   saturation, limits)
    print(f"{out}: {size}^3, white {white:g} cd/m2, knee {knee:g}, reds {red_hue:+g} deg, saturation "
          f"{saturation:g}, gamut limits "
          f"{limits.round(3)}; HLG 50/75/100% grey -> sRGB {grey[:, 0].round(3)}")


if __name__ == "__main__":
    main()
