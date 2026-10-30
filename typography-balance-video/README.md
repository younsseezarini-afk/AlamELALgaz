# Type Has Weight — storyboard

Refined concept for the reel originally titled **“The Art of Typography Balance”** (@younsse.ezarini).

Words sit on a chrome balance beam. A designer's cursor fixes the tilt one lever at a time (size, weight, color, space), then chooses an axis. A tilt readout counts from 14.0° down to 0.0°. The last frame loops into the first.

| File | What it is |
| --- | --- |
| `storyboard.html` | Full storyboard page: brand and reference analysis, concept, script, 12 annotated frames, motion system |
| `frames/F01.png` … `F12.png` | Clean key frames, 1080 × 1920 |
| `frames/contact-sheet.jpg` | All 12 frames on one sheet |
| `assets/` | Avatar and chrome renders cropped from the “Design Balance” carousel |
| `render-frames.js` | Re-exports the frames from `storyboard.html` (`node render-frames.js`, needs Playwright) |
| `type-has-weight-reel.mp4` | The finished reel: 45.7 s, 1080 × 1920, 30 fps, motion-blurred, music and sound effects at −14 LUFS |
| `reel.html` | The animation source. Every frame is computed from the timeline by `renderAt(t)`; open it in a browser to watch it live |
| `assets/cut/` | Transparent cut-outs of the chrome objects, used as 3D stickers |
| `render-reel.js`, `make-audio.py` | Rebuild the reel (commands below) |
| `typography-motion.mp4` | Second video: 32 s motion graphics built from the “FINAL — Younsse Ezarini — Typography” Canva carousel, in the reference style |
| `typography-reel.html`, `assets/typo/` | Its animation source and the five carousel pages |
| `assets/obj3d.js`, `assets/vendor/` | The 3D objects (Aa key, A/a coins, Aa shield, keys, heart and plus coins), modelled in three.js r160 and rendered live each frame, so they have clean edges and real 3D rotation. Rebuild with `REEL=typography-reel.html node render-reel.js video 30 4`, then the same audio and ffmpeg steps |

## Rebuild the reel

```bash
node render-reel.js video 30 4       # 4 sub-frames per frame are averaged for motion blur → .seg0–3.mp4, .sfx.json
python3 make-audio.py                # writes .audio.wav from the cue list
ffmpeg -f concat -safe 0 -i .segs.txt -i .audio.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -shortest -movflags +faststart type-has-weight-reel.mp4
```

The motion follows the reference reel: a card cascade that explodes into a ray burst, blur-in words on gradient-mesh, dark and paper grounds, whip transitions, a dealt card fan and a second burst before the end card. The soundtrack is synthesized (105 BPM four-on-the-floor in F minor, dropping out for the typing beat) with sound effects timed to the on-screen actions. There is no voiceover yet; the script below is ready to record over it.

## Voiceover (45.7 s, 105 BPM)

| # | Time | Line |
| --- | --- | --- |
| 01 | 0:00.0 | Your layout isn't ugly. It's unbalanced. |
| 02 | 0:04.6 | Every word has weight. And your eye feels it before it reads it. |
| 03 | 0:09.1 | Size is the heaviest lever. Pick one hero, then scale down the rest. |
| 04 | 0:13.7 | Weight works too. A big, light word can balance a small, bold one. |
| 05 | 0:18.3 | Color adds weight. One bright word can hold up a whole paragraph. |
| 06 | 0:22.9 | Space is weight you can't see. Give your key line room to breathe. |
| 07 | 0:27.4 | Center it for calm. Offset it for energy, then counter the heavy side. |
| 08 | 0:32.0 | Then nudge, step back, and nudge again. |
| 09 | 0:34.3 | Same words. Same space. Now it sits still. |
| 10 | 0:38.9 | Type has weight. Design with it. Save this for your next layout. |
| 11 | 0:43.4 | Follow for more. |
