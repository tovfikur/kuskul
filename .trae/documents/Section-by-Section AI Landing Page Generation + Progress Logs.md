## Analysis (Why it feels slow + why output quality is inconsistent)
- Current generator asks the model to produce the entire website JSON in one shot ([prompt_builder.py](file:///p:/KusKul/backend/app/ai_module/prompt_builder.py)). That makes responses large and more likely to be malformed/non-JSON.
- The prompt’s example schema doesn’t match the frontend renderer props (e.g., prompt uses `props.title.text`, renderer expects `props.heading`/`props.subheading`) ([WebsitePreview.tsx](file:///p:/KusKul/frontend/src/features/websites/components/WebsitePreview.tsx)).
- The frontend preview only renders a small subset of section types today (`hero`, `about`, `programs/academics`, `admissions`, `contact`, `footer`) and shows “Unknown section type” for the rest.
- There is no step logging inside the AI generation flow, so long model inference looks “stuck” in terminal.

## What “Perfect” Means for Your Spec
- Generate one section at a time (Header, Hero, Quick Info, About, Highlights, Programs, Gallery, Team, Notices, Admission CTA, Testimonials, Contact/Footer), then combine into a single valid page JSON.
- Respect two orders:
  - Desktop order via `order`
  - Mobile order via a new `orderMobile` (or `order_mobile`) field per section.
- Ensure the final JSON matches what the frontend can render (so no more unknown sections).
- Print progress in the API logs for each step/section, plus periodic “still running” logs during model inference.

## Implementation Plan
### 1) Define a Section Contract (JSON shape)
- Add a canonical set of supported section types and required props in backend (single source of truth).
- Update prompt examples to match frontend expectations (e.g., `hero.props.heading/subheading/ctaText/ctaLink`).
- Add `orderMobile` to section objects so the same JSON supports desktop + mobile reorder.

### 2) Generate Website “One Section at a Time”
- New generation pipeline:
  1. Generate `metadata` + `theme` (small JSON).
  2. For each section in your list, call the model with a prompt that requests ONLY that section object.
  3. Validate each section (basic shape) and the final combined website JSON.
  4. If a section fails, regenerate that section once; if still failing, replace it with a deterministic fallback section.
- Result: smaller AI tasks, higher success rate, easier debugging.

### 3) Add Terminal Progress + Streaming Logs
- Add step logs like:
  - “AI: building prompt”, “AI: generating section 3/12 Quick Info Bar”, “AI: validating section”
- Enable streaming inference for each section and print a heartbeat every ~10s while generating (so the terminal always shows progress).
- Make it configurable with env vars (e.g., `AI_PROGRESS_LOGS=true`, `AI_STREAM_PROGRESS=true`).

### 4) Implement the Missing Frontend Section Renderers
- Extend [WebsitePreview.tsx](file:///p:/KusKul/frontend/src/features/websites/components/WebsitePreview.tsx) to render:
  - `header` / `navbar`
  - `quick_info`
  - `highlights`
  - `gallery`
  - `team`
  - `notices`
  - `testimonials`
- Update sorting logic:
  - Desktop: sort by `order`
  - Mobile: sort by `orderMobile` when viewport is small.

### 5) “Notices / Events” CMS Integration (Public-safe)
- Add a public endpoint that returns published notices for a tenant subdomain (no auth), because the current notices API requires auth + `X-School-Id` ([notices.py](file:///p:/KusKul/backend/app/api/v1/endpoints/notices.py)).
- Update the `notices` section renderer to fetch from that public endpoint when configured, otherwise fall back to static list in the JSON.

### 6) Verification
- Run:
  - One generation request and confirm progress logs appear continuously.
  - Confirm JSON renders all sections without “Unknown section type”.
  - Confirm mobile order differs from desktop.
  - Confirm notices load via public endpoint (if enabled).

Once you confirm, I’ll implement this end-to-end and you’ll see “Generating section X/Y …” and periodic progress updates in the API terminal while the website is being created.