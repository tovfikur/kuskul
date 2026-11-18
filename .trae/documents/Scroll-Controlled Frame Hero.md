## What You’ll Get
- A **full-screen (100vh) scroll-controlled hero** that plays your 216 JPEG frames forward/backward as the user scrolls.
- After the last frame, the page continues scrolling normally into the next sections.
- A **professional overlay** (headline, description, CTA) that stays readable with subtle gradient overlay + optional fade/parallax.

## Key Technical Approach (Best Performance)
- Render frames onto a **single `<canvas>`** (much faster than swapping `<img>` tags).
- Use a **sticky hero** pattern:
  - Outer wrapper has extra scroll height (e.g., `scrollLength = frames * pixelsPerFrame`).
  - Inside is a `position: sticky; top: 0; height: 100vh` canvas.
  - Map scroll progress within that wrapper → frame index.
- Use `requestAnimationFrame` to throttle rendering and keep scroll silky.

## Implementation Steps
### 1) Add a reusable component
Create `frontend/src/components/ScrollFrameHero.tsx` (name can match your conventions) that:
- Accepts:
  - `frameCount` (216)
  - `framePath(i)` → `/header_resource/ezgif-frame-001.jpg` … `/ezgif-frame-216.jpg`
  - `pixelsPerFrame` (tuning knob, e.g. 10–20)
  - overlay content props (title/subtitle/CTA)
- Uses canvas:
  - Set canvas size to match container * devicePixelRatio (cap DPR to 2 for perf)
  - Draw the current frame with `drawImage`, covering (object-fit: cover) semantics

### 2) Scroll mapping (forward + reverse)
Inside the component:
- Measure wrapper top offset and wrapper scrollable height.
- Compute:
  - `progress = clamp((scrollY - start) / (scrollRange), 0..1)`
  - `frameIndex = round(progress * (frameCount - 1))`
- On scroll up/down, this automatically reverses.

### 3) Preload strategy (no lag)
- Immediately load:
  - frame 1
  - a small “critical set” (e.g. first 20 frames)
- Then lazy-load the rest:
  - start when hero is near viewport (IntersectionObserver)
  - use a concurrency limit (e.g. 4–6 simultaneous image loads)
- Keep an in-memory array `Image[] | null[]` so frames don’t re-download.

### 4) Overlay UI + polish
- Add a top overlay panel:
  - gradient scrim at top/bottom for readability
  - subtle text shadow
  - optional fade out as progress approaches 1
  - optional slight parallax translateY based on progress
- Add a “Scroll to explore” hint that fades as the user scrolls.

### 5) Integrate into the homepage
Update `frontend/src/pages/LandingPage.tsx`:
- Replace the current hero section with `<ScrollFrameHero />`
- Keep the rest of the landing sections below it (features/pricing/CTA).

### 6) Responsiveness + accessibility
- Respect `prefers-reduced-motion`:
  - show a static frame (e.g. frame 1 or mid-frame)
  - disable scroll animation
- Mobile tuning:
  - use a larger `pixelsPerFrame` (shorter scroll) or fewer frames (optional)

## Verification
- Open `http://localhost:3000/` and confirm:
  - scrolling plays frames smoothly forward/reverse
  - CPU usage stays reasonable
  - after last frame, scroll continues naturally
  - text overlay remains readable
- Quick checks in Chrome devtools:
  - Network: frames load from `/header_resource/...`
  - Performance: no long scroll jank

If you confirm, I’ll implement the component + integrate it into the landing page using your `public/header_resource/ezgif-frame-001.jpg` → `ezgif-frame-216.jpg` assets.