#!/bin/bash
# Makes the phone hero film from the dealership's HDR phone clip (see
# docs/photo-sources.md): a slow pan across the showroom, upright (portrait),
# that plays forwards and then backwards, so it loops without a cut.
#  1. A 3D LUT converts the clip's HDR (HLG, BT.2020) to SDR for the web
#     (hlg_sdr_lut.py: 450 cd/m2 white, a soft shoulder, reds turned slightly
#     towards orange and colour eased to 80%, so the paint matches the photos).
#  2. mobile_loop.py steadies the pan between its two turning points
#     (frames 73 and 274) and eases the camera to a stop at both, as a
#     lossless 16-bit master.
#  3. A light temporal clean-up and 0.8x slow motion with motion-interpolated
#     frames, as edit.sh does for the desktop films; then the same frames in
#     reverse, without repeating the turning frames.
#  4. The hero photos' grade (scripts/photos/film_lut.py), then AV1, HEVC and
#     H.264 at 1080 x 1920 and 720 x 1280, tagged BT.709, as encode.sh does.
# Needs ffmpeg with zscale, libsvtav1, libx265 and libx264, and Python 3 with
# numpy, scipy and opencv-python-headless (set PYTHON to use a virtual
# environment). After re-encoding, bump FILM_VERSION in src/main.jsx.
# Usage: scripts/films/mobile.sh <clip.mp4> [work dir]
set -e
clip=$1; work=${2:-/tmp/mm-mobile-film}
here=$(cd "$(dirname "$0")" && pwd)
out=$(cd "$here/../.." && pwd)/public/video
py=${PYTHON:-python3}
mkdir -p "$work" "$out"

"$py" -I "$here/hlg_sdr_lut.py" "$work/hlg-sdr.cube" 450 0.6 8 0.8 65
"$py" -I "$here/mobile_loop.py" "$clip" "$work/hlg-sdr.cube" 73 274 "$work/mobile-steady.mkv"

slow="hqdn3d=0:0:3:3,minterpolate=fps=37.5:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none,setpts=1.25*PTS,fps=30"
ffmpeg -v error -y -i "$work/mobile-steady.mkv" -vf "format=gbrp,$slow" -c:v ffv1 -level 3 -slices 4 "$work/mobile-slow.mkv"
n=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$work/mobile-slow.mkv")
ffmpeg -v error -y -i "$work/mobile-slow.mkv" -filter_complex "
 [0:v]split[f][b];
 [b]reverse,trim=start_frame=1:end_frame=$((n - 1)),setpts=PTS-STARTPTS[r];
 [f][r]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v ffv1 -level 3 -slices 4 "$work/mobile-loop.mkv"
echo "loop: $n slowed frames forwards, $((n - 2)) backwards ($(( (2 * n - 2) * 10 / 30 ))/10 s)"

src="$work/mobile-loop.mkv"
"$py" -I "$here/../photos/film_lut.py" "$src" "$work/mobile-grade.cube" hero
grade="format=gbrp,lut3d=file='$work/mobile-grade.cube':interp=tetrahedral"
tags="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
to709() { echo "scale=$1:-2:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p"; }
for width in 1080 720; do
  if [ "$width" = 1080 ]; then av1=38; hevc=28; else av1=36; hevc=27; fi
  vf="$grade,$(to709 $width)"
  ffmpeg -v error -y -i "$src" -vf "$vf" -an $tags -c:v libsvtav1 -preset 4 -crf $av1 -g 60 \
    -svtav1-params tune=0 -movflags +faststart "$out/showroom-mobile-$width.av1.mp4" 2>&1 | grep -v "^Svt" || true
  ffmpeg -v error -y -i "$src" -vf "$vf" -an $tags -c:v libx265 -preset slow -crf $hevc -tag:v hvc1 \
    -x265-params "keyint=60:min-keyint=60:scenecut=0:log-level=error" -movflags +faststart "$out/showroom-mobile-$width.hevc.mp4"
done
ffmpeg -v error -y -i "$src" -vf "$grade,$(to709 720)" -an $tags -c:v libx264 -profile:v high \
  -preset slow -crf 23 -g 60 -movflags +faststart "$out/showroom-mobile-720.mp4"
# The phone hero's still (and the photo for reduced motion and data saver):
# the loop's first frame, graded, so the film fades in without a jump.
ffmpeg -v error -y -i "$src" -vf "$grade,format=rgb24" -frames:v 1 -q:v 2 \
  "$(cd "$here/../.." && pwd)/public/images/showroom-mobile.jpg"
ls -l "$out"/showroom-mobile-*
