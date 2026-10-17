#!/bin/bash
# Encodes the looping films for the web: 1920 px for desktops and 1280 px for
# phones, as AV1 (Chrome, Edge, Firefox), HEVC (Safari) and an H.264 fallback.
# The quality settings measure about 40 to 41 dB PSNR against the lossless
# edit, which looks the same as the edit at 100%. Phones scale their cut up,
# so it gets a little more headroom. Colour is converted and tagged as BT.709,
# like the source clips, so every browser decodes it the same way.
# Usage: encode.sh <work dir with walk-loop.mkv and pans-loop.mkv> <out dir>
#        [walk] [pans]   (both by default)
set -e
work=$1; out=$2; shift 2
mkdir -p "$out"
# The home film carries the home hero's CSS grade, brightness(0.84)
# contrast(1.12) saturate(1.1) (src/mm-prestige.css), in the file, so the
# browser doesn't have to filter every frame. Brightness and contrast make one
# straight-line curve (rounded), then saturate is a colour matrix.
curve="clip(0.9408*val-14.8,0,255)"
home_grade="format=gbrp,lutrgb=r='$curve':g='$curve':b='$curve',colorchannelmixer=rr=1.0787:rg=-0.0715:rb=-0.0072:gr=-0.0213:gg=1.0285:gb=-0.0072:br=-0.0213:bg=-0.0715:bb=1.1028"
tags="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
to709() { echo "scale=$1:-2:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p"; }
for film in ${*:-walk pans}; do
  src="$work/$film-loop.mkv"
  grade=null
  [ "$film" = walk ] && grade=$home_grade
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
