## Goals
- Make `http://localhost:3000/` look like a **premium SaaS landing**: modern, clean, animated, and sales-focused.
- Keep it **fast** (no heavy animation libraries) and consistent with the existing MUI design system.
- Remove the MUI Grid v2 warnings on the landing page by using the correct Grid API.

## What I’ll Change
### 1) Rebuild the Landing Page layout (marketing-grade)
Update [LandingPage.tsx](file:///p:/KusKul/frontend/src/pages/LandingPage.tsx) to include:
- **Hero**: strong headline, subheadline, primary CTA (Sign in), secondary CTA (Explore).
- **Social proof** row: “Multi-tenant”, “Role-based”, “AI website generation”, “Audit logs”.
- **Product preview** section: a styled dashboard mock (pure MUI components) with subtle motion.
- **Feature grid**: your modules (Academic/Students/Staff/Finance/Logistics/Exams/Events/Websites).
- **How it works**: 3-step onboarding for SaaS admin + tenant admin.
- **Pricing/Plans** (simple): Starter / Pro / Enterprise cards (no payment integration).
- **Final CTA**: “Launch your school in minutes” + Sign in.

### 2) Add professional animations (no new dependencies)
Implement “polished but safe” animations using:
- CSS keyframes via MUI `sx` (gradient shimmer, floating blobs, subtle pulse).
- Hover transitions (cards, buttons).
- Scroll-reveal using a tiny IntersectionObserver hook (fade/slide-in once).

### 3) Fix MUI Grid warnings on the landing page
Right now the landing uses legacy props (`item`, `xs`, `md`) which MUI Grid v2 warns about.
- Replace Grid usage with the v2 pattern:
  - remove `item`
  - replace `xs/md/sm` with `size={{ xs: 12, md: 6 }}` (or `size={12}`)
- This keeps the landing page console clean.

### 4) Add “Sell SaaS” messaging and conversion
Adjust copy to be more sales-ready:
- Tenant isolation, permissions, dashboards, reporting, AI website generator.
- Clear ICP: schools, coaching centers, academies.
- Make CTAs consistent: “Sign in” + “Explore features” + “Contact sales” (mailto).

## Files Affected
- Update: [LandingPage.tsx](file:///p:/KusKul/frontend/src/pages/LandingPage.tsx)
- Add (small): a reusable scroll-reveal hook under `frontend/src/app/` (name depends on existing conventions)

## Verification
- Open `http://localhost:3000/` and confirm:
  - animations run smoothly
  - no Grid warnings on landing page
  - responsive looks premium on mobile/tablet/desktop
- Run frontend typecheck/build after landing changes.

If you confirm, I’ll implement the redesign first (hero + feature sections + animations), then migrate the landing Grid API to eliminate the warnings.