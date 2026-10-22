#!/bin/bash
# Rebuilds the hero films in public/video from the dealership's walkthrough
# clips (see docs/photo-sources.md):
#   1. stabilise and upscale each clip (stabilise_upscale.py, Real-ESRGAN),
#   2. edit them into seamless loops with slow motion and eased dissolves
#      (edit.sh),
#   3. grade them like the hero photos and encode AV1, HEVC and H.264 at
#      1920 and 1280 px (encode.sh).
# Needs ffmpeg with libx264, libx265 and libsvtav1, and Python 3 with
# opencv-python-headless, numpy, scipy, onnx and onnxruntime (set PYTHON to
# use a virtual environment). Upscaling runs on the CPU, about 3 s a frame.
# Usage: scripts/films/build.sh <folder with clip1.mp4 clip2.mp4 clip3.mp4> [work dir]
set -e
raw=$1; work=${2:-/tmp/mm-films}
here=$(cd "$(dirname "$0")" && pwd)
py=${PYTHON:-python3}
mkdir -p "$work/masters"
release=https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0
for m in realesr-general-x4v3 realesr-general-wdn-x4v3; do
  [ -f "$work/$m.pth" ] || curl -sSL --fail -o "$work/$m.pth" "$release/$m.pth"
done
"$py" -I "$here/esrgan_onnx.py" "$work/realesr-general-x4v3.pth" "$work/realesr-general-wdn-x4v3.pth" 0.5 "$work/esrgan.onnx"
# Clip 1 stops at 18.3 s, before the camera nears the black Clubsport's bonnet.
"$py" -I "$here/stabilise_upscale.py" "$work/esrgan.onnx" "$raw/clip1.mp4" 0 550 "$work/masters/walk-sr.mkv"
"$py" -I "$here/stabilise_upscale.py" "$work/esrgan.onnx" "$raw/clip2.mp4" 0 139 "$work/masters/pan-lineup-sr.mkv"
"$py" -I "$here/stabilise_upscale.py" "$work/esrgan.onnx" "$raw/clip3.mp4" 0 96 "$work/masters/pan-gts-sr.mkv"
"$here/edit.sh" "$work/masters" "$work/edit"
"$here/encode.sh" "$work/edit" "$(cd "$here/../.." && pwd)/public/video"
