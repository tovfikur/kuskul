## Goal
Upgrade the current frame-scrub hero text so it becomes **cinematic**:
- Fade in → subtle emphasis transform → fade out **before next beat**
- Dynamic styling (color/weight/outline/glow)
- Smart placement that avoids busy areas based on automatic frame analysis
- Different motion styles per scene energy (pop/slide/twist/fade)

## What Already Exists (Baseline)
- Beat switching at frames 015/045/062/115/150/180
- Canvas rendering with scroll-controlled frame index
- Basic entrance animation and luminance-based light/dark text mode

## Enhancements To Implement
### 1) Beat Timeline Envelope (fade-in/hold/fade-out)
For each beat window (from `beat.startFrame` to `nextBeat.startFrame - 1`):
- Compute `beatProgress` = normalized progress inside the beat window.
- Apply an opacity envelope:
  - `fadeIn` region: 0 → 1 (e.g. first 12–18% of beat)
  - `hold` region: stays near 1
  - `fadeOut` region: 1 → 0 (last 12–18% of beat)
- This guarantees the current text fades out smoothly **before** the next beat appears.

### 2) Dynamic Motion Style (scene energy)
Automatically choose a motion style per beat using a lightweight “energy” score:
- Sample a small region of pixels from the canvas on the current frame and a nearby frame.
- Compute a cheap frame-delta metric (average absolute RGB diff) to estimate motion intensity.
- Map energy → animation style:
  - Low energy: slow scale + fade (cinematic)
  - Medium: slide + slight scale
  - High: subtle pop + micro-rotate (very small, premium)
- Apply as CSS transforms driven by `beatProgress` (no heavy animation libs).

### 3) Smart Text Placement (avoid key elements)
Instead of fixed left/center/right, choose placement by scoring candidate anchors each time a beat starts:
- Define a grid of candidate rectangles (e.g. 9 positions: left/center/right × top/mid/bottom).
- For each candidate region, compute scores from canvas pixels:
  - Luminance (for contrast)
  - Variance/edge density (busy background = bad)
  - Optional: saturation penalty (very colorful area may reduce readability)
- Pick the best region and cache it for the beat.
- Result: text automatically moves to the “quiet” area of the frame.

### 4) Dynamic Styling (readability + polish)
Based on the chosen region stats:
- Set text mode light/dark
- Adjust overlay panel strength:
  - brighter background → stronger dark scrim
  - darker background → lighter glass panel
- Add professional readability accents:
  - subtle shadow
  - optional thin stroke (only when necessary)
- Scale typography slightly with available “quiet space”:
  - small region → smaller title
  - large region → bigger title

### 5) Minimal Renders (performance)
To keep scroll smooth:
- Avoid React re-rendering every scroll tick.
- Compute frame/beat progress inside rAF and set CSS variables on the overlay container (e.g. `--opacity`, `--tx`, `--ty`, `--scale`, `--rot`).
- Only set React state when the beat changes (rare).

## Files To Update
- `frontend/src/components/ScrollFrameHero.tsx`
  - Add beat window progress
  - Add energy scoring
  - Add multi-candidate placement scoring + caching
  - Drive overlay via CSS variables for smoothness
- `frontend/src/pages/LandingPage.tsx`
  - Keep the beat trigger frames (015/045/062/115/150/180)
  - Optionally refine the copy for each beat

## Verification
- Scroll slowly and quickly:
  - text fades in/out naturally, never hard cuts
  - beat switch occurs exactly at the trigger frames
  - text position avoids busy areas (moves when needed)
  - readability is always good (auto color + scrim)
- Check performance:
  - no noticeable jank; sampling runs only on beat change and occasional frame intervals

If you confirm, I’ll implement the scoring + cinematic envelope and tune the parameters (fade window size, motion intensity caps, sampling size) for the smoothest professional result.