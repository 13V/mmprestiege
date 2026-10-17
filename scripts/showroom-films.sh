#!/bin/bash
# Builds the hero films in public/video from the dealership's walkthrough
# clips (see docs/photo-sources.md), in two sizes (1280 px for desktop, 848 px
# for phones) and two codecs (AV1, with H.264 for browsers without AV1).
# Needs an ffmpeg build with libx264 and libsvtav1.
# Usage: scripts/showroom-films.sh <folder with clip1.mp4 to clip5.mp4> [out]
set -e
raw=$1; out=${2:-public/video}
mkdir -p "$out"
for width in 1280 848; do
  if [ "$width" = 848 ]; then sc="hqdn3d=1.5:1.5:6:6"; else sc="hqdn3d=1.5:1.5:6:6,scale=${width}:-2:flags=lanczos,cas=0.35"; fi
  # Walk-in: clip 1 at 0.8x (24 fps). The end dissolves into the start so it
  # loops seamlessly; the loop is rotated to open inside the showroom.
  ffmpeg -v error -y -i "$raw/clip1.mp4" -filter_complex "
   [0:v]setpts=PTS*1.25,fps=24,$sc,split[a][b];
   [a]trim=start_frame=30,setpts=PTS-STARTPTS[A];
   [b]trim=end_frame=30,setpts=PTS-STARTPTS[B];
   [A][B]xfade=transition=fade:duration=1.25:offset=21.875,split[l1][l2];
   [l1]trim=start_frame=285,setpts=PTS-STARTPTS[p1];
   [l2]trim=end_frame=285,setpts=PTS-STARTPTS[p2];
   [p1][p2]concat=n=2:v=1:a=0,format=yuv420p[v]" -map "[v]" -an -c:v ffv1 "$out/walk-$width.mkv"
  # Pans: the line-up (clip 2), the GTS to the Clubsport (clip 3) and back
  # (clip 5), dissolving into each other and round to the start.
  ffmpeg -v error -y -i "$raw/clip2.mp4" -i "$raw/clip3.mp4" -i "$raw/clip5.mp4" -filter_complex "
   [0:v]setpts=PTS*1.25,fps=24,$sc,split[a1][a2];
   [1:v]setpts=PTS*1.25,fps=24,$sc[c];
   [2:v]setpts=PTS*1.25,fps=24,$sc[e];
   [a1]trim=start_frame=24,setpts=PTS-STARTPTS[A];
   [a2]trim=end_frame=24,setpts=PTS-STARTPTS[Ahead];
   [A][c]xfade=transition=fade:duration=1:offset=3.79[AC];
   [AC][e]xfade=transition=fade:duration=1:offset=6.79[ACE];
   [ACE][Ahead]xfade=transition=fade:duration=1:offset=10.5,format=yuv420p[v]" -map "[v]" -an -c:v ffv1 "$out/pans-$width.mkv"
  for film in walk pans; do
    ffmpeg -v error -y -i "$out/$film-$width.mkv" -c:v libx264 -profile:v high -preset slow -crf 25 -g 48 -pix_fmt yuv420p -movflags +faststart -an "$out/showroom-$film-$width.mp4"
    ffmpeg -v error -y -i "$out/$film-$width.mkv" -c:v libsvtav1 -preset 5 -crf 38 -g 48 -pix_fmt yuv420p -movflags +faststart -an "$out/showroom-$film-$width.av1.mp4"
  done
done
rm -f "$out"/*.mkv
ls -l "$out"
