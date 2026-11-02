#!/bin/bash
# usage: render_parallel.sh START END WORKERS OUT
cd "$(dirname "$0")/build"
S=$1; E=$2; W=$3; OUT=$4
mkdir -p ../chunks; rm -f ../chunks/part_*.mp4 ../chunks/list.txt
python3 - "$S" "$E" "$W" > ../chunks/ranges.txt <<'PY'
import sys
s,e,w=float(sys.argv[1]),float(sys.argv[2]),int(sys.argv[3])
fps=30; f0=round(s*fps); f1=round(e*fps); n=f1-f0
for i in range(w):
    a=f0+n*i//w; b=f0+n*(i+1)//w
    print(f"{a/fps:.4f} {b/fps:.4f} {i}")
PY
while read a b i; do
  node render.js $a $b ../chunks/part_$i.mp4 > ../chunks/log_$i.txt 2>&1 &
  echo "file 'part_$i.mp4'" >> ../chunks/list.txt
done < ../chunks/ranges.txt
wait
ffmpeg -y -v error -f concat -safe 0 -i ../chunks/list.txt -c copy "$OUT"
echo "video done: $OUT"
