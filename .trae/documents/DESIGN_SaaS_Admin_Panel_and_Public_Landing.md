# Page Design Spec — SaaS Admin Panel + Public Landing
Desktop-first; responsive down to 375px.

## Global Styles
- Layout system: MUI + Flexbox; admin shell uses permanent left drawer on desktop and temporary drawer on mobile.
- Colors: light theme, neutral background; primary accent for active nav and primary CTAs.
- Typography: clear hierarchy (H1 page title, H2 section titles, body for table/forms).
- States: consistent loading (centered spinner), empty state (short message + next action), error state (inline + toast).

## 1) Public Landing Page (/)
- Meta: title “KusKul”; description “Multi-tenant admin platform”; OG title/description aligned.
- Structure (stacked sections):
  1. Top nav: logo (left), “Sign in” button (right → /login).
  2. Hero: product headline + 1–2 sentence value summary + primary CTA “Sign in”.
  3. Feature highlights: cards summarizing existing modules (Academic, Students, Staff, Exams, Finance, Logistics, Events, Settings).
  4. Footer: basic links (Terms/Privacy placeholders) + copyright.
- UX expectations: no auth required; fast load; all CTAs route to /login.

## 2) Login Page (/login)
- Meta: title “Sign in”.
- Layout: centered card inside AuthLayout; single column.
- Components:
  - Email + password fields; primary submit button.
  - Inline validation; error banner “Login failed”.
  - Secondary link(s) optional: “Forgot password” only if/when exposed.
- UX expectations: on success, redirect by role (platform admin → /saas-admin; tenant user → tenant app home).

## 3) Tenant Admin Panel (Shell + Module Pages)
- Meta: dynamic title per section (e.g., “Dashboard — KusKul”).
- Shell layout:
  - Left drawer nav: Dashboard, Academic, Students, Staff, Users, Exams, Events & Notices, Finance, Logistics, Settings.
  - Top app bar: user email label + avatar menu; menu includes Logout (Profile is placeholder).
  - Main content: padded container; consistent page header (title + key actions).
- Standard module page pattern:
  - Primary content is data-first: table/list, filters/search row, and dialogs/drawers for create/edit actions (as implemented per module).
  - Keep actions discoverable (top-right primary action) and confirm destructive actions.

## 4) SaaS Admin Panel (/saas-admin)
- Meta: title “SaaS Admin Panel”.
- Structure:
  1. Header row: page title + “Create Tenant” button.
  2. KPI cards: total, active, inactive.
  3. Tenants table: name, subdomain link, status chip, actions (activate/deactivate, reset admin password).
  4. Dialogs: create tenant form; reset admin password form.
- UX expectations: actions update table immediately; errors show toast/banner; subdomain links open in new tab.