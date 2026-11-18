## Root Cause (Why Hero Is Blank)
- The overlay opacity is time-based, but the timer never advances because `beatEnterStartMsRef` is only set when `beatChanged` is true.
- On first render, `activeBeatRef.current` starts at `0`, `nextBeatIndex` is also `0`, so `beatChanged` is false and `beatEnterStartMsRef` stays `0`.
- Then every update uses `startMs = beatEnterStartMsRef.current || now`, which becomes `now` each time → `elapsedMs` stays `0` → opacity stays `0` → text never appears.

## Fixes To Implement
### 1) Always initialize the first beat timer
- Change initial `activeBeatRef.current` to `-1` (or add a one-time init guard) so the first call treats beat 0 as a “change”.
- Set `beatEnterStartMsRef.current = now` on first run, guaranteeing `elapsedMs` increases and the overlay fades in.

### 2) Ensure first frame renders immediately
- Load and draw **frame-001** on mount (same behavior as reduced-motion currently does), so the hero never shows a black canvas while waiting for IntersectionObserver.
- Keep the IntersectionObserver preload for the remaining frames for performance.

### 3) Make the overlay animation reliable
- Keep the time-based entrance/move, but make it independent from scroll velocity once triggered:
  - start when a beat becomes active
  - continue via rAF until it reaches full opacity and reaches the target position
  - don’t reset the start time unless the beat changes

## Files To Update
- `frontend/src/components/ScrollFrameHero.tsx`
  - Fix beat initialization (timer + refs)
  - Load/draw first frame on mount
  - Minor guardrails so opacity can’t get stuck at 0

## Verification
- Reload without scrolling: hero shows frame-001 and text appears within ~0.6s.
- Scroll: frames scrub correctly; beat changes still occur at 015/045/062/115/150/180.
- No console errors; no blank screen.

If you confirm, I’ll implement these fixes and verify in Docker that the hero renders on first load and animations work consistently.