#!/bin/bash
# Encodes the looping films for the web: 1920 px for desktops and 1280 px for
# phones, as AV1 (Chrome, Edge, Firefox), HEVC (Safari) and an H.264 fallback.
# The quality settings measure about 40 to 41 dB PSNR against the lossless
# edit, which looks the same as the edit at 100%. Phones scale their cut up,
# so it gets a little more headroom. Colour is converted and tagged as BT.709,
# like the source clips, so every browser decodes it the same way.
# Usage: encode.sh <work dir with walk-loop.mkv and pans-loop.mkv> <out dir>
#        [walk] [pans]   (both by default)
# Set PYTHON to use a virtual environment with numpy and opencv.
set -e
work=$1; out=$2; shift 2
here=$(cd "$(dirname "$0")" && pwd)
py=${PYTHON:-python3}
mkdir -p "$out"
# Each film gets the hero photos' colour grade (scripts/photos/grade.py), so
# it matches the photo it fades in over: a 3D LUT measured on the film's own
# frames, applied in RGB before the conversion to BT.709.
tags="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
to709() { echo "scale=$1:-2:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p"; }
for film in ${*:-walk pans}; do
  src="$work/$film-loop.mkv"
  "$py" -I "$here/../photos/film_lut.py" "$src" "$work/$film-grade.cube" hero
  grade="format=gbrp,lut3d=file='$work/$film-grade.cube':interp=tetrahedral"
  for width in 1920 1280; do
    if [ "$width" = 1920 ]; then av1=38; hevc=28; else av1=36; hevc=27; fi
    vf="$grade,$(to709 $width)"
    ffmpeg -v error -y -i "$src" -vf "$vf" -an $tags -c:v libsvtav1 -preset 4 -crf $av1 -g 60 \
      -svtav1-params tune=0 -movflags +faststart "$out/showroom-$film-$width.av1.mp4" 2>&1 | grep -v "^Svt" || true
    ffmpeg -v error -y -i "$src" -vf "$vf" -an $tags -c:v libx265 -preset slow -crf $hevc -tag:v hvc1 \
      -x265-params "keyint=60:min-keyint=60:scenecut=0:log-level=error" -movflags +faststart "$out/showroom-$film-$width.hevc.mp4"
  done
  ffmpeg -v error -y -i "$src" -vf "$grade,$(to709 1280)" -an $tags -c:v libx264 -profile:v high \
    -preset slow -crf 23 -g 60 -movflags +faststart "$out/showroom-$film-1280.mp4"
done
ls -l "$out"
