"""Colour grade for the dealership's photoshoot.

The photographer's edit is bright, flat and a little cool: highlights stop
at light grey, the concrete has a blue tint and the red paint looks pale
orange. This grade gives every photo the same finished look:

1. neutral white balance, measured on the grey concrete, with a touch of
   warmth so the reds sit well;
2. levels, so the brightest lights are white and the darkest shadows are
   near black (the stretch is capped so nothing blows out);
3. an S-curve for depth;
4. richer colour: more saturation for muted colours than for strong ones,
   greys left grey, and strongly coloured paint darkened slightly so it
   looks deep rather than bright;
5. a light clean-up of camera grain (the indoor shots are ISO 640 to 800),
   so flat concrete stays smooth once contrast and sharpening are added;
6. local contrast ("clarity") with an edge-aware filter, so detail is crisp
   without halos round the cars.

Measurements (white balance and levels) come from the whole frame, so every
crop of one shot matches. Sharpening for the web runs after resizing, in
export.py. All maths is float32; colours are sRGB 0..1 unless named linear.
"""
import cv2
import numpy as np

LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)

# Looks. "listing" is for car photos shown on their own, "hero" for photos
# with text over them (darker mid-tones keep white text readable without a
# browser filter) and "portrait" for photos of people (gentler colour, so
# skin stays natural).
LOOKS = {
    "listing": dict(gamma=1.03, contrast=4.0, vibrance=0.28, density=0.10, clarity=0.22),
    "hero": dict(gamma=1.2, contrast=4.4, vibrance=0.28, density=0.10, clarity=0.22, black=0.012),
    "portrait": dict(gamma=1.03, contrast=3.6, vibrance=0.08, saturation=1.0, density=0.03, clarity=0.1),
}

DEFAULT = dict(
    wb=0.85,          # share of the colour cast to remove
    warm=0.004,       # warmth added after neutralising
    black=0.02,       # output level of the darkest 0.05% of the frame
    white=0.975,      # output level of the brightest 0.1%
    max_gain=1.22,    # cap on the levels stretch
    gamma=1.03,       # above 1 darkens the mid-tones
    contrast=4.0,     # S-curve strength
    pivot=0.46,       # S-curve centre
    curve_mix=0.85,   # share of the S-curve (the rest stays straight)
    vibrance=0.28,    # extra saturation for muted colours
    saturation=1.04,  # saturation for every colour
    neutral_lo=0.012, # colours below this chroma stay as they are (greys)
    neutral_hi=0.05,  # full colour boost above this chroma
    density=0.10,     # darkens strongly coloured areas a little
    clarity=0.22,     # local contrast on lightness
    clarity_r=0.008,  # its radius, as a share of the frame width
    denoise=1.65,     # grain clean-up, as a multiple of the frame's measured grain
)

# ---------------------------------------------------------------- colour maths

_LUT8 = np.array([(i / 255) / 12.92 if i <= 10 else ((i / 255 + 0.055) / 1.055) ** 2.4 for i in range(256)],
                 np.float32)


def u8_to_lin(u8):
    return _LUT8[u8]


def srgb_to_lin(a):
    a = np.maximum(a, 0)
    return np.where(a <= 0.04045, a / 12.92, np.power((a + 0.055) / 1.055, 2.4)).astype(np.float32)


def lin_to_srgb(a):
    a = np.maximum(a, 0)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055).astype(np.float32)


# OKLab (Björn Ottosson), a perceptual space where lightness and colour are separate.
_M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                [0.2119034982, 0.6806995451, 0.1073969566],
                [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
_M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                [1.9779984951, -2.4285922050, 0.4505937099],
                [0.0259040371, 0.7827717662, -0.8086757660]], np.float32)
_M1i = np.linalg.inv(_M1).astype(np.float32)
_M2i = np.linalg.inv(_M2).astype(np.float32)


def lin_to_oklab(lin):
    return np.cbrt(lin @ _M1.T) @ _M2.T


def oklab_to_lin(lab):
    lms = lab @ _M2i.T
    return (lms * lms * lms) @ _M1i.T


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def _box(img, r):
    return cv2.boxFilter(img, -1, (2 * r + 1, 2 * r + 1), borderType=cv2.BORDER_REFLECT)


def guided_smooth(img, r, eps, scale=4):
    """Edge-aware blur (a self-guided filter), worked out at 1/scale size."""
    h, w = img.shape
    if scale == 1:
        mean = _box(img, r)
        var = _box(img * img, r) - mean * mean
        a = var / (var + eps)
        b = mean - a * mean
        return _box(a, r) * img + _box(b, r)
    small = cv2.resize(img, (max(1, w // scale), max(1, h // scale)), interpolation=cv2.INTER_AREA)
    rs = max(1, r // scale)
    mean = _box(small, rs)
    var = _box(small * small, rs) - mean * mean
    a = var / (var + eps)
    b = mean - a * mean
    a = cv2.resize(_box(a, rs), (w, h), interpolation=cv2.INTER_LINEAR)
    b = cv2.resize(_box(b, rs), (w, h), interpolation=cv2.INTER_LINEAR)
    return a * img + b


# ---------------------------------------------------------------- measuring

def measure(lin):
    """White balance gains and levels for a frame (linear sRGB)."""
    h, w = lin.shape[:2]
    k = max(1, w // 900)
    small = cv2.resize(lin, (w // k, h // k), interpolation=cv2.INTER_AREA)
    s = lin_to_srgb(small)
    hi, lo = s.max(-1), s.min(-1)
    sat = (hi - lo) / (hi + 1e-4)
    light = lin_to_srgb(small @ LUMA)
    grey = (sat < 0.12) & (light > 0.2) & (light < 0.9)
    neutral = small[grey].mean(0) if grey.sum() > 500 else small.reshape(-1, 3).mean(0)
    black, white = np.percentile(light, [0.05, 99.9])
    return {"neutral": neutral.astype(np.float32), "black": float(black), "white": float(white)}


# ---------------------------------------------------------------- grading

def settings(look="listing", **overrides):
    return {**DEFAULT, **LOOKS[look], **overrides}


def tone_curve(x, p, m):
    """Levels, mid-tone gamma and the S-curve, on sRGB values."""
    black = min(m["black"], 0.06)
    white = max(m["white"], black + (p["white"] - p["black"]) / p["max_gain"])
    y = np.clip((x - black) / (white - black) * (p["white"] - p["black"]) + p["black"], 0, 1)
    y = np.power(y, p["gamma"])
    a, c = p["contrast"], p["pivot"]
    sig = lambda t: 1 / (1 + np.exp(-a * (t - c)))  # noqa: E731
    s = (sig(y) - sig(0.0)) / (sig(1.0) - sig(0.0))
    return (1 - p["curve_mix"]) * y + p["curve_mix"] * s


def global_grade(lin, p, m):
    """The parts of the grade that act on each pixel alone (also used for the films' LUT)."""
    gains = m["neutral"].mean() / m["neutral"]
    gains = 1 + p["wb"] * (gains - 1)
    gains = gains * np.array([1 + p["warm"], 1, 1 - p["warm"]], np.float32)
    gains = (gains / (gains @ LUMA)).astype(np.float32)
    lin = lin * gains
    lut_x = np.linspace(0, 1, 4096, dtype=np.float32)
    lut_y = tone_curve(lut_x, p, m).astype(np.float32)
    idx = np.clip(lin_to_srgb(lin) * 4095 + 0.5, 0, 4095).astype(np.int32)
    lab = lin_to_oklab(srgb_to_lin(lut_y[idx]))
    del idx
    a, b = lab[..., 1], lab[..., 2]
    chroma = np.sqrt(a * a + b * b)
    boost = p["saturation"] * (1 + p["vibrance"] * np.square(1 - np.clip(chroma / 0.2, 0, 1)))
    boost = 1 + (boost - 1) * smoothstep(p["neutral_lo"], p["neutral_hi"], chroma)
    a *= boost
    b *= boost
    lab[..., 0] -= p["density"] * 0.5 * np.clip(chroma * boost / 0.25, 0, 1) * lab[..., 0]
    return lab


def grade(lin, look="listing", measured=None, **overrides):
    """Grades a whole frame. lin is HxWx3 linear sRGB; returns sRGB 0..1."""
    p = settings(look, **overrides)
    m = measured or measure(lin)
    lab = global_grade(lin, p, m)
    if p["denoise"]:
        # Grain is measured from the finest detail (its median is mostly grain,
        # not edges), so clean ISO 100 shots are barely touched.
        light = lab[..., 0]
        grain = 1.4826 * float(np.median(np.abs(light - cv2.GaussianBlur(light, (0, 0), 1.5))))
        eps = (p["denoise"] * grain) ** 2
        lab[..., 0] = guided_smooth(light, 2, eps, scale=1)
        for c in (1, 2):
            lab[..., c] = guided_smooth(lab[..., c], 3, eps * 0.25, scale=1)
    if p["clarity"]:
        light = lab[..., 0]
        r = max(2, int(light.shape[1] * p["clarity_r"]))
        detail = light - guided_smooth(light, r, eps=0.004)
        light += p["clarity"] * detail * smoothstep(0.05, 0.25, light) * (1 - smoothstep(0.85, 1.0, light))
    return lin_to_srgb(np.clip(oklab_to_lin(lab), 0, 1))


# ---------------------------------------------------------------- output

def resize(s, width, height=None):
    """Lanczos resize with the kernel widened for downsizing (no aliasing)."""
    from PIL import Image
    h, w = s.shape[:2]
    height = height or round(h * width / w)
    if (width, height) == (w, h):
        return s
    chans = [np.asarray(Image.fromarray(np.ascontiguousarray(s[..., c]), "F").resize((width, height), Image.LANCZOS))
             for c in range(s.shape[2])]
    return np.clip(np.stack(chans, -1), 0, 1).astype(np.float32)


def sharpen(s, amount=0.55, sigma=0.7):
    """Unsharp mask on lightness, mostly on edges so flat concrete stays smooth."""
    lab = lin_to_oklab(srgb_to_lin(s))
    light = lab[..., 0]
    detail = light - cv2.GaussianBlur(light, (0, 0), sigma)
    gx = cv2.Sobel(light, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(light, cv2.CV_32F, 0, 1, ksize=3)
    edges = smoothstep(0.03, 0.15, cv2.GaussianBlur(np.sqrt(gx * gx + gy * gy), (0, 0), 1.2))
    lab[..., 0] = light + amount * detail * edges
    return lin_to_srgb(np.clip(oklab_to_lin(lab), 0, 1))


def to_u8(s):
    return np.clip(s * 255 + 0.5, 0, 255).astype(np.uint8)
