# Weight. The Art of Typographic Balance

A 30-second vertical (9:16, 1080×1920, 30fps) kinetic typography reel.

- `typographic-balance.mp4` is the rendered video, with no audio.
- `voiceover.srt` holds the VO lines timed to the picture.
- `storyboard/storyboard.png` is the visual storyboard, with 12 frames taken from the real render.
- `motion.html` is the source animation. Open it in a browser to preview, and click to pause.
- `render.js` re-renders the MP4 and storyboard frames: `node render.js` (needs Playwright and ffmpeg).

## Creative concept

The original idea was "The Art of Typography Balance" as a list of tips. This version tells it as a physical story.

**Every word has weight, and you can watch it.** A single balance beam runs through the whole film and reacts live to the type placed on it. A tilt readout chip reports *Off-balance* or *Balanced*. The lesson becomes something you see: the viewer watches the beam tip, wobble and finally settle level.

- **Hook:** it opens as a UI prompt ("make my type feel balanced → Generate"), the kind of modern AI interface people already scroll past. The punchline is that you can't generate balance.
- **Structure:** the problem, then four principles (Scale, Weight, Space, Grid), then the resolution. Each principle gets its own visual mechanic rather than a text card.
- **Bookend:** the outro returns to the prompt pill, now asking you to save the video. The last frame fades back into the first, so the reel loops.

## Visual direction

- White ground with soft lilac and violet glow blobs drifting behind a faint dot grid.
- Colours from the profile photo: violet `#5B3BE8`, deep indigo `#3A25B8`, lilac `#B48CF2`, mist `#F2EDFF`, ink `#100C26`.
- Typeface is Inter Display across its full 100–900 weight range. The weight contrast itself is the design material.
- The UI vocabulary (pills, chips, cursor, toasts, inspector-style spacing tags) comes from the reference set.

## Script and scene breakdown

| # | Time | On screen | VO |
|---|------|-----------|----|
| 01 Hook | 0:00–0:03 | Prompt pill types "make my type feel balanced", cursor taps Generate | What if you could just… generate balance? |
| → | 0:02.6 | The request explodes into letters in mixed weights | — |
| 02 Imbalance | 0:03–0:07 | Chaotic words; HEAVY drops onto the beam, which tips to −14° | You can't. Most layouts don't fail on fonts. They fail on balance. |
| → | 0:06.6 | HEAVY slides off the tilted beam and the beam springs back | — |
| 03 Scale | 0:07–0:10.5 | "Aa" ladder (60/97/157/254 px, ×1.618); "Size" lands and tips the beam to +9° | Every word has visual weight, and size is the heaviest. |
| 04 Weight | 0:10.5–0:14 | Thin "Calm" vs small "BOLD"; wght counts 100→900 and the beam levels live | But a small, bold word can balance a big, light one. |
| → | 0:14 | Violet panel sweep carrying "Space" | — |
| 05 Space | 0:14–0:18 | "breathe" tracking opens; card padding shown as violet blocks with px chips | Space has weight too. Let your text breathe. |
| 06 Grid | 0:18–0:22 | 4-column grid draws in; tilted words snap to the margin with flashes | Then lock everything to one invisible grid. |
| 07 Resolution | 0:22–0:26 | Masked title reveal, 4 check pills on the beat, level beam with heavy-small and light-big Aa | Scale. Weight. Space. Grid. That's typographic balance. |
| 08 Outro | 0:26–0:30 | Collapse into a prompt pill, bookmark tap, Saved toast, CTA | Save this for your next layout. |

To customise the end card, edit `CTA` near the top of `motion.html` (for example, add your handle) and re-run `node render.js`.
