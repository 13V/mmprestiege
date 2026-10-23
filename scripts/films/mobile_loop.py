"""Steadies the phone clip's pan and prepares it to play forwards then
backwards as a seamless loop (the phone hero film, see mobile.sh).

The clip is a slow handheld pan across the showroom that stops and turns
round at both ends. Played forwards from one turning point to the other and
then backwards, it loops without a cut, as long as the camera is still at
the turning points. So the camera path (frame-to-frame feature tracking and
a similarity fit, as in stabilise_upscale.py) is:

1. smoothed, to take out the hand shake while keeping the pan's shape (the
   frames either side of the section are used, so the ends are smoothed as
   well as the middle);
2. eased to a stop at both ends: whatever drift is left at a turning point
   (here the camera still tilts slightly) is faded out over about half a
   second, so the film slows to a stop and sets off again like a pendulum.

The apparent rotation during the pan (about 14 degrees from end to end) is
the perspective of a camera that looks down while it pans, not the phone
rolling, so only its shake is smoothed. One constant zoom (about 2%) hides
the frame edges.

Frames are read through ffmpeg with the HDR to SDR conversion (a lut3d
filter chain) and written as a lossless 16-bit RGB master (FFV1).

Usage: python -I mobile_loop.py <clip.mp4> <hlg-sdr.cube> <first> <last>
       <out.mkv> [sigma_x=7] [sigma_y=12] [sigma_angle=10] [ease=15]
first and last are the turning points (frame numbers in the clip).
"""
import subprocess
import sys

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d

W, H = 1080, 1920  # the clip, upright
AW, AH = 720, 1280  # tracking size


def chain(lut):
    # HLG R'G'B' (BT.2020 matrix, limited range) as float, then the LUT.
    return (f"zscale=rangein=tv:matrixin=bt2020nc:range=pc:filter=spline36,format=gbrpf32le,"
            f"lut3d=file='{lut}':interp=tetrahedral")


def read(clip, lut, first, last, tail, pix_fmt, size, depth):
    """Frames first..last (inclusive) through the SDR chain, as arrays."""
    w, h = size
    vf = f"select='between(n\\,{first}\\,{last})',{chain(lut)},{tail}"
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", clip, "-an", "-vf", vf, "-fps_mode", "passthrough",
                             "-f", "rawvideo", "-pix_fmt", pix_fmt, "-"], stdout=subprocess.PIPE)
    planes = 3 if pix_fmt.startswith("rgb") else 1
    n = w * h * planes * depth
    while True:
        buf = proc.stdout.read(n)
        if len(buf) < n:
            break
        a = np.frombuffer(buf, np.uint16 if depth == 2 else np.uint8)
        yield a.reshape(h, w, planes) if planes > 1 else a.reshape(h, w)
    proc.wait()


def motion(frames):
    """Per-step motion of the frame centre (dx, dy in full-size pixels) and
    rotation (radians), from each frame to the next."""
    k = W / AW
    ctr = np.array([AW / 2, AH / 2])
    moves, prev = [], None
    for gray in frames:
        if prev is not None:
            pts = cv2.goodFeaturesToTrack(prev, maxCorners=800, qualityLevel=0.004, minDistance=8, blockSize=7)
            nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev, gray, pts, None, winSize=(25, 25), maxLevel=4)
            good = st.ravel() == 1
            p0, p1 = pts[good].reshape(-1, 2), nxt[good].reshape(-1, 2)
            m, _ = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=1.0, maxIters=4000)
            moved = m[:, :2] @ ctr + m[:, 2] - ctr
            moves.append((moved[0] * k, moved[1] * k, np.arctan2(m[1, 0], m[0, 0])))
        prev = gray
    return np.array(moves)


def ease_to_rest(smooth, a, b, tau):
    """Subtracts a small correction so the path's velocity is zero at a and b:
    v * s * exp(-s / tau) has slope v at s = 0 and fades out after ~3 tau."""
    t = np.arange(len(smooth), dtype=float)
    v = np.gradient(smooth)
    sa, sb = np.clip(t - a, 0, None), np.clip(b - t, 0, None)
    h = v[a] * sa * np.exp(-sa / tau) - v[b] * sb * np.exp(-sb / tau)
    return smooth - h


def needed_zoom(cx, cy, ca):
    corners = np.array([[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]])
    rot = np.array([[np.cos(-ca), -np.sin(-ca)], [np.sin(-ca), np.cos(-ca)]])
    lo, hi = 1.0, 1.5
    for _ in range(40):
        z = (lo + hi) / 2
        src = (rot @ (corners / z - [cx, cy]).T).T
        inside = np.all(np.abs(src[:, 0]) <= W / 2) and np.all(np.abs(src[:, 1]) <= H / 2)
        hi, lo = (z, lo) if inside else (hi, z)
    return hi


def main():
    clip, lut, first, last, out = sys.argv[1:6]
    first, last = int(first), int(last)
    sx, sy, sa, tau = (float(v) for v in (sys.argv[6:10] if len(sys.argv) > 9 else (7, 12, 10, 15)))
    margin = int(3 * max(sx, sy, sa, tau)) + 2
    lo, hi = max(0, first - margin), last + margin
    gray = read(clip, lut, lo, hi, f"scale={AW}:{AH}:flags=area,format=gray", "gray", (AW, AH), 1)
    moves = motion(gray)
    path = np.vstack([[0.0, 0.0, 0.0], np.cumsum(moves, axis=0)])  # path[i] = frame lo + i
    hi = lo + len(path) - 1
    a, b = first - lo, last - lo
    smooth = np.column_stack([gaussian_filter1d(path[:, i], s, mode="nearest") for i, s in enumerate((sx, sy, sa))])
    target = np.column_stack([ease_to_rest(smooth[:, i], a, b, tau) for i in range(3)])
    corr = (target - path)[a:b + 1]
    v = np.gradient(smooth, axis=0)
    zoom = max(needed_zoom(*c) for c in corr) * 1.002
    print(f"frames {first}..{last} (tracked {lo}..{hi}); speed at the turning points before easing: "
          f"x {v[a, 0]:+.2f} / {v[b, 0]:+.2f} px/frame, y {v[a, 1]:+.2f} / {v[b, 1]:+.2f}, "
          f"angle {np.degrees(v[a, 2]):+.3f} / {np.degrees(v[b, 2]):+.3f} deg/frame; correction max "
          f"x {np.abs(corr[:, 0]).max():.1f} y {np.abs(corr[:, 1]).max():.1f} px, "
          f"angle {np.degrees(np.abs(corr[:, 2]).max()):.2f} deg; zoom {zoom:.4f}", flush=True)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb48le", "-s", f"{W}x{H}",
                            "-framerate", "30", "-i", "-", "-c:v", "ffv1", "-level", "3", "-slices", "4",
                            "-pix_fmt", "gbrp16le", out], stdin=subprocess.PIPE)
    ctr = np.array([W / 2, H / 2])
    count = 0
    for frame, (cx, cy, ca) in zip(read(clip, lut, first, last, "format=rgb48le", "rgb48le", (W, H), 2), corr):
        rot = np.array([[np.cos(ca), -np.sin(ca)], [np.sin(ca), np.cos(ca)]])
        # p' = ctr + zoom * (R (p - ctr) + c)
        m_a = zoom * rot
        m_b = ctr + zoom * np.array([cx, cy]) - m_a @ ctr
        warped = cv2.warpAffine(np.ascontiguousarray(frame), np.hstack([m_a, m_b[:, None]]), (W, H),
                                flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
        enc.stdin.write(warped.tobytes())
        count += 1
    enc.stdin.close()
    enc.wait()
    print(f"wrote {out}: {count} frames", flush=True)
    np.savetxt(out + ".path.csv", np.column_stack([np.arange(lo, hi + 1), path, smooth, target]), delimiter=",",
               fmt="%.4f", header="frame,x,y,angle,smooth_x,smooth_y,smooth_angle,target_x,target_y,target_angle")


main()
