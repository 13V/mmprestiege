"""Stabilises and upscales a walkthrough clip into a lossless master.

The camera path is estimated from frame-to-frame feature tracking. The
walking bounce is smoothed out of the up-down path (weighted towards the far
wall and sign, which the eye reads as the camera being steady), side-to-side
movement is smoothed lightly so pans keep their shape, and one constant zoom
hides the moving edges. Roll is left to the gimbal. Each frame is upscaled
4x with Real-ESRGAN (ONNX, see esrgan_onnx.py), then shifted and resized to
the output size.

Usage: python -I stabilise_upscale.py <model.onnx|lanczos> <clip.mp4>
       <first> <end> <out.mkv> [width=1920] [sigma_x=8] [sigma_y=22]
       [sigma_angle=22] [top_weight=0.8] [roll_gain=0]
Frames first..end-1 are written at 30 fps (FFV1, lossless). "lanczos" skips
the upscaler for a quick preview at the clip's own size.
"""
import os
import subprocess
import sys
import time

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d


def read_frames(path):
    cap = cv2.VideoCapture(path)
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            return frames
        frames.append(frame)


def estimate(frames, top_weight=0.7, band=0.42):
    """Per-frame motion (dx, dy, angle) of the frame centre from t to t+1.

    A walking camera's bounce moves near cars more than the far wall, so the
    vertical move blends the whole-frame fit with the median movement of
    features in the top band (walls, sign and ceiling), which is what the eye
    reads as the camera being steady.
    """
    moves = []
    prev = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
    h, w = prev.shape
    ctr = np.array([w / 2, h / 2])
    for frame in frames[1:]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        pts = cv2.goodFeaturesToTrack(prev, maxCorners=600, qualityLevel=0.005, minDistance=8, blockSize=7)
        move = (0.0, 0.0, 0.0)
        if pts is not None and len(pts) >= 12:
            nxt, status, _ = cv2.calcOpticalFlowPyrLK(prev, gray, pts, None, winSize=(21, 21), maxLevel=3)
            good = status.ravel() == 1
            p0, p1 = pts[good].reshape(-1, 2), nxt[good].reshape(-1, 2)
            if len(p0) >= 12:
                m, _ = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=3000)
                if m is not None:
                    moved = m[:, :2] @ ctr + m[:, 2] - ctr
                    top = p0[:, 1] < band * h
                    dy = moved[1]
                    if top.sum() >= 8:
                        dy = top_weight * np.median(p1[top, 1] - p0[top, 1]) + (1 - top_weight) * moved[1]
                    move = (moved[0], dy, np.arctan2(m[1, 0], m[0, 0]))
        moves.append(move)
        prev = gray
    return np.array(moves)


def corrections(moves, sx, sy, sa):
    path = np.vstack([[0.0, 0.0, 0.0], np.cumsum(moves, axis=0)])
    smooth = np.column_stack([
        gaussian_filter1d(path[:, 0], sx, mode="nearest"),
        gaussian_filter1d(path[:, 1], sy, mode="nearest"),
        gaussian_filter1d(path[:, 2], sa, mode="nearest"),
    ])
    return smooth - path


def needed_zoom(c, w, h):
    """Smallest zoom so the shifted, rotated frame still covers the view."""
    cx, cy, ca = c
    corners = np.array([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]])
    rot = np.array([[np.cos(-ca), -np.sin(-ca)], [np.sin(-ca), np.cos(-ca)]])
    lo, hi = 1.0, 1.6
    for _ in range(40):
        z = (lo + hi) / 2
        src = (rot @ (corners / z - [cx, cy]).T).T
        inside = np.all(np.abs(src[:, 0]) <= w / 2) and np.all(np.abs(src[:, 1]) <= h / 2)
        hi, lo = (z, lo) if inside else (hi, z)
    return hi


def main():
    model, clip, first, end, out = sys.argv[1:6]
    first, end = int(first), int(end)
    width = int(sys.argv[6]) if len(sys.argv) > 6 else 1920
    sx, sy, sa = (float(v) for v in (sys.argv[7:10] if len(sys.argv) > 9 else (8, 22, 22)))
    top_weight = float(sys.argv[10]) if len(sys.argv) > 10 else 0.8
    roll_gain = float(sys.argv[11]) if len(sys.argv) > 11 else 0.0
    frames = read_frames(clip)
    h, w = frames[0].shape[:2]
    corr = corrections(estimate(frames, top_weight), sx, sy, sa)
    corr[:, 2] *= roll_gain
    zooms = np.array([needed_zoom(c, w, h) for c in corr[first:end]])
    zoom = float(np.percentile(zooms, 98))
    print(f"{clip}: {len(frames)} frames, using {first}..{end - 1}; zoom {zoom:.3f} (max {zooms.max():.3f}); "
          f"vertical correction max {np.abs(corr[first:end, 1]).max():.1f}px, roll max {np.degrees(np.abs(corr[first:end, 2]).max()):.2f} deg", flush=True)
    out_h = int(round(width * h / w / 2) * 2)
    session = None
    scale = 1
    if model != "lanczos":
        import onnxruntime as ort
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 4
        session = ort.InferenceSession(model, opts, providers=["CPUExecutionProvider"])
        scale = 4
    # Frames are saved one by one, so an interrupted run picks up where it
    # stopped; they are joined into the master at the end.
    frames_dir = out + ".frames"
    os.makedirs(frames_dir, exist_ok=True)
    start, made = time.time(), 0
    for n, t in enumerate(range(first, end)):
        path = os.path.join(frames_dir, f"{n:05d}.png")
        if os.path.exists(path):
            continue
        frame = frames[t]
        if session is not None:
            x = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).astype(np.float32).transpose(2, 0, 1)[None] / 255.0
            y = session.run(None, {"input": x})[0][0].transpose(1, 2, 0)
            big = cv2.cvtColor(np.clip(y * 255.0 + 0.5, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
        else:
            big = frame
        cx, cy, ca = corr[t]
        bh, bw = big.shape[:2]
        ctr = np.array([bw / 2, bh / 2])
        rot = np.array([[np.cos(ca), -np.sin(ca)], [np.sin(ca), np.cos(ca)]])
        # p' = ctr + zoom * (R (p - ctr) + c * scale), then resize to the output.
        a = zoom * rot
        b = ctr + zoom * (np.array([cx, cy]) * scale) - a @ ctr
        resize = np.diag([width / bw, out_h / bh])
        m = np.hstack([resize @ a, (resize @ b)[:, None]])
        interp = cv2.INTER_AREA if session is not None else cv2.INTER_LANCZOS4
        warped = cv2.warpAffine(big, m, (width, out_h), flags=interp, borderMode=cv2.BORDER_REFLECT101)
        cv2.imwrite(path + ".tmp.png", warped, [cv2.IMWRITE_PNG_COMPRESSION, 1])
        os.replace(path + ".tmp.png", path)
        made += 1
        if made % 30 == 1:
            rate = (time.time() - start) / made
            print(f"  frame {n + 1}/{end - first}  {rate:.2f}s/frame  ~{rate * (end - first - n - 1) / 60:.1f} min left", flush=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(frames_dir, "%05d.png"),
                    "-c:v", "ffv1", "-level", "3", "-pix_fmt", "bgr0", out], check=True)
    print(f"wrote {out} ({end - first} frames, {made} new) in {(time.time() - start) / 60:.1f} min", flush=True)


main()
