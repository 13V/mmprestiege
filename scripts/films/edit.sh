#!/bin/bash
# Edits the stabilised, upscaled masters into the two looping hero films.
#  - 0.8x slow motion with motion-interpolated in-between frames, so the
#    films play at a true 30 fps.
#  - Smoothstep-eased dissolves: the walk-in's end dissolves into its start so
#    it loops without a jump (the loop then opens as the camera enters the
#    showroom); the pans dissolve into one another and back round.
# Usage: edit.sh <masters dir> <work dir> [walk] [pans]   (both by default)
# Writes <work>/walk-loop.mkv and <work>/pans-loop.mkv (lossless).
set -e
in=$1; work=$2; shift 2
mkdir -p "$work"
ease="A*(P*P*(3-2*P))+B*(1-P*P*(3-2*P))"
slow="hqdn3d=0:0:3:3,minterpolate=fps=37.5:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none,setpts=1.25*PTS,fps=30"
frames() { ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$1"; }
slow_down() { ffmpeg -v error -y -i "$in/$1.mkv" -vf "$slow" -c:v ffv1 "$work/$1-slow.mkv"; }

# Walk-in loop: dissolve 48 frames (1.6 s) of the end into the start, then
# rotate so the loop opens at clip time ~10.5 s (entering the showroom).
walk() {
  slow_down walk-sr
  local n k=48 off rot
  n=$(frames "$work/walk-sr-slow.mkv")
  off=$(python3 -c "print(($n - 2 * $k) / 30)")
  rot=$(( 315 * 5 / 4 - k ))
  ffmpeg -v error -y -i "$work/walk-sr-slow.mkv" -filter_complex "
   [0:v]split[a][b];
   [a]trim=start_frame=$k,setpts=PTS-STARTPTS[A];
   [b]trim=end_frame=$k,setpts=PTS-STARTPTS[B];
   [A][B]xfade=transition=custom:duration=1.6:offset=$off:expr='$ease',split[l1][l2];
   [l1]trim=start_frame=$rot,setpts=PTS-STARTPTS[p1];
   [l2]trim=end_frame=$rot,setpts=PTS-STARTPTS[p2];
   [p1][p2]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v ffv1 "$work/walk-loop.mkv"
  echo "walk: $n slowed frames -> loop $(python3 -c "print(($n - $k) / 30)") s (rotated by $rot frames)"
}

# Pans: the line-up (minus its first 1.4 s) dissolves into the GTS pan, which
# dissolves back into the line-up's first 1.4 s, so the pair loops.
pans() {
  slow_down pan-lineup-sr
  slow_down pan-gts-sr
  local nl ng k=42 o1 o2
  nl=$(frames "$work/pan-lineup-sr-slow.mkv")
  ng=$(frames "$work/pan-gts-sr-slow.mkv")
  o1=$(python3 -c "print(($nl - 2 * $k) / 30)")
  o2=$(python3 -c "print(($nl - $k + $ng - 2 * $k) / 30)")
  ffmpeg -v error -y -i "$work/pan-lineup-sr-slow.mkv" -i "$work/pan-gts-sr-slow.mkv" -filter_complex "
   [0:v]split[l1][l2];
   [l1]trim=start_frame=$k,setpts=PTS-STARTPTS[A];
   [l2]trim=end_frame=$k,setpts=PTS-STARTPTS[H];
   [1:v]setpts=PTS-STARTPTS[C];
   [A][C]xfade=transition=custom:duration=1.4:offset=$o1:expr='$ease'[AC];
   [AC][H]xfade=transition=custom:duration=1.4:offset=$o2:expr='$ease'[v]" -map "[v]" -c:v ffv1 "$work/pans-loop.mkv"
  echo "pans: line-up $nl + GTS $ng slowed frames -> loop $(python3 -c "print(($nl - $k + $ng - $k) / 30)") s"
}

for film in ${*:-walk pans}; do
  case $film in
    walk | pans) "$film" ;;
    *) echo "unknown film: $film" >&2; exit 1 ;;
  esac
done
