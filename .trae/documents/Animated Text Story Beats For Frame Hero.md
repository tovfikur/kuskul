## What will change
- The hero’s overlay text will become **scene-based** and **animated**, changing at frames:
  - 015, 045, 062, 115, 150, 180
- Each scene will have:
  - headline + subheadline
  - consistent CTA buttons
  - animated entrance/exit (fade + slide + slight blur)
  - professional positioning (left/center/right blocks) and responsive spacing
- Text color + overlay scrim opacity will adapt to the underlying frame so it stays readable.

## Scene plan (mapped to your frame markers)
I’ll implement 7 scenes:
1) Frames 001–014: Brand intro (top-left)
2) Frames 015–044: Multi-tenant + SaaS control (left)
3) Frames 045–061: Unified dashboard (center)
4) Frames 062–114: Students + Staff ops (right)
5) Frames 115–149: Finance + Exams (left)
6) Frames 150–179: AI website generation (center)
7) Frames 180–216: Closing CTA (center)

For each scene I’ll tune:
- **Position**: left/center/right; top alignment early, center later.
- **Animation**: scene transitions use ~8-frame crossfade window + translateX/translateY.
- **Color**: white or near-black depending on background luminance.

## How I’ll “analyze” the frames (so it’s professional, not guessy)
### A) Visual inspection
- I’ll load frames 015/045/062/115/150/180 and inspect composition (where there is negative space).
- Based on that, I’ll finalize scene anchor positions so text avoids busy areas.

### B) Automatic readability guard (runtime)
- After drawing a frame to canvas, sample a small rectangle behind the text block using `getImageData`.
- Compute average luminance and automatically:
  - choose text color (light vs dark)
  - adjust scrim strength
- Cache luminance per frame to avoid repeated pixel work.

## Implementation steps
1) Update `ScrollFrameHero` to support `storyBeats`:
   - array of `{ startFrame, title, subtitle, align, textStyle }`
   - compute current scene from current frame index
2) Add animated overlay styles:
   - CSS transitions (opacity/transform/filter)
   - optional subtle gradient text shimmer on headline (disabled for `prefers-reduced-motion`)
3) Add adaptive text color + scrim based on canvas luminance sampling.
4) Update `LandingPage` to pass the 7 scenes with SaaS-focused copy.

## Files to change
- Update: `frontend/src/components/ScrollFrameHero.tsx`
- Update: `frontend/src/pages/LandingPage.tsx`

## Verification
- Scroll down/up: scene text changes exactly at frames 15/45/62/115/150/180.
- Text always readable (auto color + scrim).
- No lint/type errors.
- Smooth on desktop + acceptable on mobile; reduced-motion shows static text.

If you confirm, I’ll implement the scene system + animations and tune the copy/positions after inspecting those exact frames.