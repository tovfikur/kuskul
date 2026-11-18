## Root Cause (Why You Get 403/401)
- Your production domain is `best-software-company.com` (no tenant subdomain).
- Current backend tenant resolution only derives a tenant from:
  - subdomain (e.g. `tenant.example.com`) or `tenant.localhost`, OR
  - `X-Tenant-Subdomain` / `X-Tenant-ID` headers, OR
  - Origin subdomain parsing.
- With a 2-part host like `best-software-company.com`, **no tenant is derived**, so `POST /api/v1/auth/login` returns **403 “Tenant is required”**, and then `/auth/refresh` and `/auth/me` stay **401** because no cookies/tokens are issued.

## Goal
- Make the system deploy-ready on **any domain** with **zero localhost dependency** by supporting **custom domains** for tenants (apex domains like `best-software-company.com`) and keeping subdomain-based tenants working.

## Implementation Plan
### 1) Backend: Resolve tenant by custom domain
- Update [tenant_middleware.py](file:///p:/KusKul/backend/app/core/tenant_middleware.py) to add a lookup:
  - If tenant is not found by subdomain/headers, try `Tenant.custom_domain == host`.
  - Also try with `www.` stripped (so `www.example.com` works if tenant is `example.com`).
  - Apply the same logic when parsing `Origin`.

### 2) Backend: Normalize and harden host parsing
- Normalize host/origin values:
  - lowercase
  - strip port
  - strip trailing dot
  - use `x-forwarded-host` first (already done)
- Keep existing behavior:
  - `admin.*` enables SaaS admin
  - `<tenant>.<domain>` continues to work
  - `*.localhost` continues to work

### 3) Backend: Production cookie defaults (deploy readiness)
- Adjust refresh-cookie defaults so production works cleanly on HTTPS:
  - `Secure=True` when `environment != development`
  - keep `SameSite=Lax` for same-site apps (works for `https://best-software-company.com` calling `https://best-software-company.com/api/v1/...`).

### 4) Ops/Config: Make tenant domain configurable
- Ensure the tenant row has `custom_domain = "best-software-company.com"` (or whatever domain you attach).
- If you run behind a reverse proxy, ensure it forwards the correct `Host` / `X-Forwarded-Host` header.

## Verification Plan
- Login on `https://best-software-company.com/login` should return 200 and set refresh cookie.
- `GET /api/v1/auth/me` should return 200 with user info after login.
- `POST /api/v1/auth/refresh` should return 200 when cookie exists.
- Confirm no code path relies on `demo.localhost` (frontend already uses `VITE_API_BASE_URL=/api/v1`).

If you confirm, I’ll implement the middleware+cookie fixes and validate with a local docker run (simulating custom-domain Host headers) so it works on any domain without requiring a tenant subdomain.