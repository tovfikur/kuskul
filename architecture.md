# KusKul — Project Architecture

> Ground-truth architecture document derived from the actual source code in this repository
> (`backend/`, `frontend/`, Docker/compose files, and migrations). It reflects what is
> implemented today, not the proposal in `architech.md`.

**Generated from code inspected:** `backend/app/main.py`, `backend/app/api/v1/api.py`,
`backend/app/api/deps.py`, `backend/app/core/*`, `backend/app/db/*`,
`backend/app/models/*`, `backend/app/schemas/*`, `backend/app/api/v1/endpoints/*`,
`backend/alembic/*`, `frontend/src/*`, and Docker files.

---

## 1. Executive Summary

KusKul is a **multi-tenant, SaaS-style School Management System**. It is a full-stack
web application with a **FastAPI** backend (Python 3.11), a **React 19** + **Vite 7**
backend-rendered TypeScript frontend, **PostgreSQL 16** as the primary data store, and
**Redis 7** for AI/cache/rate-limit workloads. It is containerized with Docker Compose
and supports a future React Native mobile client via an API-first contract.

Key architectural traits:

- **Multi-tenancy** resolved per-request by `TenantMiddleware` from subdomain, host,
  `X-Tenant-Subdomain`, `X-Tenant-ID`, `Origin`, or (dev only) `?tenant=`.
- **Multi-school** scoping per request via the `X-School-Id` header and membership-based RBAC.
- **UUID v4** primary keys throughout the database.
- **JWT access tokens** (HS256) + **httpOnly refresh-token cookies** with rotation.
- **Automatic tenant propagation** through a SQLAlchemy `before_flush` event.
- **Audit logging** of mutating school-scoped requests.
- **Alembic** migrations run on container startup.

---

## 2. Repository Layout

```text
KusKul/
├── backend/                       # FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py            # auth + tenant + permission dependencies
│   │   │   └── v1/
│   │   │       ├── api.py         # router registration & versioning
│   │   │       └── endpoints/     # ~50 feature endpoint modules
│   │   ├── core/                  # config, security, tenant, audit, rate limit, seed
│   │   ├── db/
│   │   │   ├── base.py            # declarative model imports (registry)
│   │   │   └── session.py         # Base, engine, SessionLocal, get_db, before_flush
│   │   ├── models/                # SQLAlchemy 2.0 declarative models (~70 files)
│   │   ├── schemas/               # Pydantic v2 request/response models
│   │   ├── scripts/               # one-off workers (e.g. Hikvision attendance cron)
│   │   ├── main.py                # app factory: middleware, exceptions, routers
│   │   └── alembic/               # migrations (env.py + versions/)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── tests/                     # pytest suites by feature
├── frontend/                      # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── api/                   # Axios clients (academic, auth, exams, finance, ...)
│   │   ├── app/                   # Redux store, authSlice, hooks, toast
│   │   ├── features/              # feature-owned pages & components (per domain)
│   │   ├── layouts/               # AuthLayout / MainLayout
│   │   ├── pages/                 # DashboardPage, LandingPage
│   │   ├── theme/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── playwright.config.ts
├── app/models/                    # local AI GGUF model mount point (see §9)
├── docs/                          # generated/reference docs
├── docker-compose.yml             # dev stack: db, redis, api, web
├── docker-compose.prod.yml        # production stack
├── docker-compose.local-safe.yml  # local port overrides
├── docker-compose.odoo-safe.yml
├── scripts/run-hikvision-attendance-cron.sh  # cron wrapper
├── run-kuskul.sh                  # local launcher with dynamic ports
└── *.md                            # analysis/summary documents
```

---

## 3. High-Level Architecture

```text
                  ┌─────────────────────────────────────┐
                  │ Browser   React 19 + Vite + MUI      │
                  │  - axios client (X-School-Id,        │
                  │    X-Tenant-Subdomain headers)      │
                  │  - localStorage: kuskul_auth        │
                  │  - httpOnly refresh cookie          │
                  └───────────────┬─────────────────────┘
                                  │ HTTPS (JWT access token)
                                  ▼
                  ┌─────────────────────────────────────┐
                  │ FastAPI API  /api/v1   (backend/)   │
                  │  - TenantMiddleware                 │
                  │  - rate-limit + audit + security    │
                  │  - routers -> endpoints/*           │
                  │  - SQLAlchemy ORM + Pydantic          │
                  └───────────────┬─────────────────────┘
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        ▼                         ▼                          ▼
┌──────────────┐          ┌────────────┐            ┌──────────────┐
│ PostgreSQL   │          │   Redis 7  │            │  /static     │
│ 16 (kuskul)  │          │ cache/AI   │            │  (nginx in   │
│ SQLAlchemy   │          │ rate-limit │            │   prod Dockerfile)│
└──────────────┘          └────────────┘            └──────────────┘
```

### Request lifecycle (tenant + school scoped)

1. `TenantMiddleware` (`backend/app/core/tenant_middleware.py`) resolves the tenant
   (subdomain/host/X-Tenant-Subdomain/X-Tenant-ID/Origin/`?tenant=`) and stores it on
   `request.state` plus a `ContextVar` (`tenant_context.set_tenant_id`).
2. For non-tenant routes (`/docs`, `/redoc`, `/openapi.json`, `/static`, `/health`),
   the middleware short-circuits.
3. `require_tenant()` or `require_permission()` dependencies resolve the school from the
   `X-School-Id` header, verify the school belongs to the tenant, is active, and the
   user has an active `Membership` whose `Role` grants the permission (`allow` list or
   `super:*`).
4. The SQLAlchemy `before_flush` listener (`db/session.py`) auto-fills `tenant_id` on
   every new object that declares a `tenant_id` column — no per-endpoint code needed.
5. The `_audit_log` middleware records every `POST/PUT/PATCH/DELETE` carrying an
   `X-School-Id` into `audit_logs` (`core/audit.py`).

---

## 4. Technology Stack

| Layer        | Technology (as actually used) |
|--------------|-------------------------------|
| Frontend     | React 19, React DOM, Vite 7, TypeScript (~5.9), Material UI 7, Emotion, Tailwind, date-fns, React Hook Form + Zod, React Router DOM 7, Redux Toolkit + React Redux, Recharts, Axios, Storybook 8, Vitest + Testing Library + jsdom, Playwright |
| Backend      | FastAPI 0.115, Uvicorn, Python 3.11 |
| ORM          | SQLAlchemy 2.0 (declarative) |
| API schemas  | Pydantic 2.10 |
| Settings     | pydantic-settings (reads `.env`) |
| Database     | PostgreSQL 16 (Docker); SQLite `dev.db` fallback when `DATABASE_URL` is unset |
| DB driver    | `psycopg[binary]` 3.2 |
| Migrations   | Alembic 1.14 |
| Authn/Authz  | `python-jose[cryptography]` (JWT HS256), `passlib[bcrypt]`, `bcrypt` 4.0 |
| Uploads      | `python-multipart` |
| QR codes     | `segno` |
| Cache/AI     | Redis 7 + `hiredis`; `llama-cpp-python` (local GGUF) + JSON schema validation |
| Tests        | `pytest` 8.3 + `httpx` (backend); `vitest`/Storybook/Playwright (frontend) |
| Containers   | Docker + Docker Compose |
| Prod web     | Frontend Dockerfile serves nginx; backend uvicorn behind nginx |

### Backend runtime dependencies (`backend/requirements.txt`)

Core (`fastapi`, `uvicorn[standard]`, `sqlalchemy`, `alembic`, `psycopg[binary]`,
`pydantic`, `pydantic-settings`, `email-validator`, `python-jose[cryptography]`,
`passlib[bcrypt]`, `bcrypt`, `python-multipart`, `segno`) plus AI/cache
(`redis`, `hiredis`, `jsonschema`) and test deps (`pytest`, `httpx`).
`llama-cpp-python` is installed in the `Dockerfile` from a pre-built wheel.

---

## 5. Backend Architecture

### 5.1 Application bootstrap (`backend/app/main.py`)

`create_app()` builds the `FastAPI` instance and layers middleware **inside-out**:

1. **Static mount**: `/static` -> `Static/static`.
2. **Rate limiter** (`core/rate_limit.py` — `InMemoryRateLimiter`):
   - auth window: 5 attempts / 15 min (`rate_limit_auth_per_15_minutes`).
   - API window: 100 req/min (`rate_limit_api_per_minute`).
   - Configurable via `RATE_LIMIT_ENABLED` (disabled in dev compose).
3. **Security headers** middleware: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
   `Referrer-Policy`, CSP `default-src 'self'` (except `/docs`/`/redoc`), and
   `Strict-Transport-Security` when `ENVIRONMENT=production`.
4. **Audit log** middleware: records mutating requests that carry `X-School-Id`.
5. **Exception handlers**: catch-all returns RFC 7807 `application/problem+json`;
   `HTTPException` is normalized into the same problem format.
6. **Docs redirects**: `/docs`, `/redoc`, `/openapi.json` under the API prefix redirect
   to the root versions.
7. **Router**: `api_router` registered at `settings.api_v1_prefix` (`/api/v1`).
8. **Startup side-effects**: calls `ensure_default_admin` / `ensure_platform_admin`
   (`core/seed.py`), and applies a **runtime schema patch** that adds a `user_id`
   column to `staff` if missing (`ALTER TABLE staff ADD COLUMN IF NOT EXISTS ...`).
   *Note: this runtime migration should ideally live in Alembic only (see §13).*
9. **`TenantMiddleware`** added as the outer middleware.
10. **CORS**: `CORSMiddleware` with `allow_origins=["*"]` + `allow_credentials=True` in
    `main.py`. *Observation: wildcard origins with credentials is a known anti-pattern;
    tighten to a configured allow-list in production (see §13).*

### 5.2 Routing & versioning (`backend/app/api/v1/api.py`)

- Base path: `/api/v1`.
- Public/special routers registered directly on `api_router`:
  - `/health` (health)
  - `/auth` (auth — login, refresh, logout, register, register-parent, me, etc.)
  - `/public` (public_notices — public notices, no auth)
  - `/platform/tenants` (platform_tenants — SaaS admin, requires SaaS-admin host)
- All tenant-bearing routers are grouped under a `tenant_router = APIRouter(dependencies=[Depends(require_tenant())])`
  and mounted at the base prefix. This means **every** tenant endpoint enforces a
  resolved tenant.

### 5.3 Endpoint modules (≈50)

Each module is `APIRouter(dependencies=[Depends(require_permission("…:read"))])`;
write operations add `dependencies=[Depends(require_permission("…:write"))]` per-route.

Representative feature endpoints (all under `/api/v1`):

| Module file | Router tag | Prefix |
|---|---|---|
| `auth.py` | auth | `/auth` |
| `users.py` | users | `/users` |
| `schools.py` | schools | `/schools` |
| `roles.py` | roles | `/roles` |
| `academic_years.py`, `terms.py`, `classes.py`, `sections.py`, `streams.py`, `subjects.py`, `subject_groups.py`, `curriculum.py`, `academic_calendar_settings.py`, `time_slots.py` | academics | various |
| `students.py`, `enrollments.py`, `guardians.py` | people | various |
| `staff_extended.py`, `staff_leave.py`, `payroll.py`, `staff.py` | staff | various |
| `attendance_students.py` | attendance-students | `/attendance/students` |
| `attendance_staff.py` | attendance-staff | `/attendance/staff` |
| `hikvision_attendance.py` | hikvision-attendance | `/attendance/hikvision` |
| `leaves.py`, `teacher_assignments.py` | teaching | various |
| `timetable.py`, `exam_schedules.py`, `exams.py`, `marks.py`, `results.py`, `grades.py` | exams | various |
| `fee_structures.py`, `fee_payments.py`, `fee_dues.py`, `discounts.py` | finance | various |
| `notices.py`, `notifications.py`, `messages.py`, `communication_logs.py` | comms | various |
| `events.py`, `holidays.py` | events | various |
| `library_books.py`, `library_issues.py` | library | various |
| `transport_vehicles.py`, `transport_routes.py`, `transport_route_stops.py`, `transport_assignments.py` | transport | various |
| `parent_portal.py` | parent-portal | `/parent` |
| `documents.py`, `certificates.py` | docs/certs | various |
| `settings.py`, `backup.py`, `audit_logs.py`, `import_export.py`, `batch.py`, `analytics.py`, `reports.py` | misc | various |
| `logistics.py` | logistics | `/logistics` |

### 5.4 Dependencies layer (`backend/app/api/deps.py`)

- `get_current_user`: decodes JWT (`sub`/`iss`/`aud`/`exp`), loads `User`, enforces
  tenant consistency (SaaS-admin context vs. tenant context).
- `get_active_school_id`: reads `X-School-Id` header -> `uuid.UUID`.
- `require_tenant()`: returns the resolved `tenant_id` or 403.
- `require_saas_admin_host()`: blocks unless `request.state.is_saas_admin`.
- `is_super_admin` / `require_platform_admin`: membership + Role name checks.
- `has_permission` / `require_permission`: membership lookup -> Role `permissions`
  JSON (`allow` list) -> exact permission or `super:*`.

### 5.5 Security (`backend/app/core/security.py`)

- Passwords: `passlib` bcrypt context (`pwd_context`).
- Access token: `create_access_token(subject, claims)` — HS256, issuer/audience from
  settings, 60-min expiry (`jwt_access_token_expires_minutes`).
- `decode_access_token`: validates signature, `iss`, `aud`, `exp`.
- Refresh tokens: `secrets.token_urlsafe(48)`, stored **hashed** (sha256) in
  `refresh_tokens`; httpOnly cookie (`refresh_token_cookie_*`), 7-day expiry, rotated on
  each `/auth/refresh`.
- Password reset: 30-min single-use tokens, hashed, stored in `password_reset_tokens`.

### 5.6 Multi-tenancy (`core/tenant_middleware.py` + `core/tenant_context.py`)

- `TenantMiddleware` is a `BaseHTTPMiddleware`. It derives the tenant in priority order:
  host subdomain -> `X-Tenant-Subdomain` -> `X-Tenant-ID` -> `Origin` host ->
  `?tenant=` (development only). `admin` subdomain or `platform_domain` match sets
  `is_saas_admin = True`.
- It sets `request.state.tenant_id` and writes the same value into a `ContextVar`
  (`set_tenant_id`) so deep SQLAlchemy calls can read it.
- Inactive tenants return `403`.
- `before_flush` auto-assigns `tenant_id` to any new ORM object exposing that attribute
  (`db/session.py`).

### 5.7 Database (`db/session.py`, `db/base.py`)

- `engine`: PostgreSQL URL in Docker (`postgresql+psycopg://kuskul:kuskul@db:5432/kuskul`);
  SQLite `StaticPool` fallback for local runs (`sqlite:///./dev.db`).
- `SessionLocal = sessionmaker(autocommit=False, autoflush=False)`.
- `get_db()` yields a session and closes it.
- `Base` (`DeclarativeBase`) lives in `db/session.py`; all models import it.
- `db/base.py` is the **model registry**: importing it registers every model against
  the shared `Base` so Alembic/`create_all` sees them.
- **Conventions**: every business table has `tenant_id` (FK `tenants.id`), and many are
  also `school_id`-scoped. Primary keys are `uuid.UUID`. Timestamps are timezone-aware
  UTC with `default=datetime.utcnow`.

#### Core schema groups (as modeled)

```text
SaaS & identity: tenants, users, roles, memberships, refresh_tokens, password_reset_tokens
School: schools, academic_years, terms, classes (SchoolClass), sections, streams, subjects,
        subject_groups, class_subjects, curriculum_units, academic_calendar_settings,
        time_slots, timetable_entries
People: students, guardians, student_guardians, enrollments, attendance_excuses,
        discipline_records, student_discounts
Staff: staff (+ extended: departments, designations, staff_contracts, staff_qualifications,
       staff_performance_records; leave: leave_types, leave_balances, staff_leave_requests;
       payroll: payroll_cycles, payslips)
Attendance: teacher_assignments, student_attendance, staff_attendance,
            hikvision_devices, hikvision_student_credentials, hikvision_attendance_events
Exams: exams, exam_type_master, exam_schedules, marks, results, grades, question_bank_*,
       online_exam_*, online_exam_proctor_events
Finance: fee_structures, fee_dues, fee_payments, discounts
Comms/events: notices, notifications, messages, communication_logs, events, holidays
Library/transport: library_books, library_issues, transport_vehicles, transport_routes,
                   transport_route_stops, student_transport_assignments
Logistics: vendors, inventory_items, inventory_locations, stock_movements, assets,
           maintenance_tickets, purchase_requests, purchase_request_lines, purchase_orders,
           goods_receipts, goods_receipt_lines
System: documents, certificate_templates, certificates, settings, user_preferences,
        audit_logs, backup_entries, appointment_requests
```

#### Attendance model details

`StudentAttendance` (`models/teacher_assignment.py`) on `student_attendance`:
`id` (uuid PK), `attendance_date` (datetime UTC, indexed), `student_id`,
`section_id`, `class_id`, `status` (default `present`), `is_late` (bool), `created_at`.

`StaffAttendance` on `staff_attendance`: `id`, `attendance_date`, `staff_id`, `status`,
`check_in_at`, `check_out_at`, `method`, `device_id`, `created_at`.

### 5.8 Migrations (Alembic)

- Config: `backend/alembic.ini`, env `backend/alembic/env.py`.
- Migration scripts live in `backend/alembic/versions/` (e.g. `0036_hikvision_student_attendance.py`).
- Docker `api` runs `python -m alembic upgrade head` before Uvicorn, so the DB is
  migrated on start (dev compose `command:` and `Dockerfile` `CMD`).

### 5.9 Frontend architecture (`frontend/src`)

- **Boot**: `main.tsx` -> React 19 DOM hydration of `<App />` (`<RouterProvider>`).
- **Routing**: `App.tsx` defines routes; `MainLayout` wraps authenticated routes,
  `AuthLayout` wraps login. Active school is part of the URL/state.
- **State**: Redux Toolkit store (`app/store.ts`); `features/auth/authSlice.ts` holds
  access token, memberships, platform-admin flag, and active school id.
- **HTTP**: `api/client.ts` Axios instance — base URL from `VITE_API_BASE_URL`,
  `withCredentials: true`; request interceptor injects `X-School-Id` (from
  `localStorage.kuskul_auth.activeSchoolId`) and `X-Tenant-Subdomain`; response
  interceptor handles 401 by rotating the refresh cookie (`/auth/refresh`) and replaying
  queued requests (deduplicated by an `isRefreshing` guard).
- **Feature slices** under `features/*` (academic, auth, events, exams, finance,
  logistics, portals, saas, schools, settings, staff, students, teacher, users) each own
  pages + components and call typed API clients in `api/*`.
- **UI**: MUI 7 + Emotion; `theme/` provides the token-based design system;
  `components/common` + `ScrollFrameHero` for shared elements.
- **Data entry**: React Hook Form + Zod resolvers everywhere forms appear.
- **Charts**: Recharts (e.g. staff attendance pie chart).
- **Dates**: `date-fns`.
- **Testing**: Vitest unit + Storybook stories (with Vitest browser runner);
  Playwright e2e (`playwright.config.ts`).

### Frontend routes (from `App.tsx` / feature pages)

```text
/                     LandingPage
/login                auth
/dashboard            DashboardPage
/schools              schools
/academic             academic (AcademicPage)
/students             students
/staff                staff
/users                users
/exams                exams
/events               events
/finance              finance
/logistics            logistics
/settings             settings
/settings/users       settings
/student-portal       portals
/guardian-portal      portals
/saas-admin           saas
```

---

## 6. Feature Modules

| Feature | Frontend | Backend API | Data |
|---|---|---|---|
| Auth & session | `features/auth`, `api/auth.ts` | `endpoints/auth.py` | `users`, `memberships`, `roles`, `refresh_tokens` |
| Tenants (SaaS) | `features/saas` | `platform_tenants.py`, `tenant.py` | `tenants` |
| Schools | `features/schools` | `schools.py`, `school.py` | `schools` |
| Users/RBAC | `features/users`, `features/settings` | `users.py`, `roles.py`, `membership.py` | `users`, `roles`, `memberhips` |
| Academics | `features/academic` | years/terms/classes/sections/subjects/streams/curriculum/timetable | `academic_years`, `terms`, `classes`, `sections`, `streams`, `subjects`, ... |
| Students | `features/students` | `students.py`, `enrollments.py`, `guardians.py`, `import_export.py` | `students`, `enrollments`, `guardians`, `student_guardians` |
| Staff | `features/staff` | `staff.py`, `staff_extended.py`, `staff_leave.py`, `payroll.py` | `staff`, `departments`, `designations`, `staff_contracts`, `leave_*`, `payslips` |
| Attendance | `students/{AttendanceTab,TodayAttendanceTab}`, `staff/.../attendance` | `attendance_students.py`, `attendance_staff.py`, `hikvision_attendance.py`, `leaves.py` | `student_attendance`, `staff_attendance`, `attendance_excuses`, Hikvision tables |
| Exams/Results | `features/exams` | `exams.py`, `exam_schedules.py`, `marks.py`, `results.py`, `grades.py`, `online_exams.py` | `exams`, `exam_schedules`, `marks`, `results`, `grades`, `online_exam_*` |
| Finance | `features/finance` | `fee_structures.py`, `fee_payments.py`, `fee_dues.py`, `discounts.py` | `fee_structures`, `fee_dues`, `fee_payments`, `discounts` |
| Events/Notices | `features/events` | `events.py`, `holidays.py`, `notices.py` | `events`, `holidays`, `notices` |
| Comms | portals + layout | `notifications.py`, `messages.py`, `communication_logs.py` | `notifications`, `messages`, `communication_logs` |
| Library | (API-first) | `library_books.py`, `library_issues.py` | `library_books`, `library_issues` |
| Transport | clients + endpoints | `transport_vehicles.py`, `transport_routes.py`, `transport_route_stops.py`, `transport_assignments.py` | `transport_vehicles`, `transport_routes`, ... |
| Portals | `features/portals` | `parent_portal.py` | (reuses core tables) |
| Documents/Certs | `staff/components/documents` | `documents.py`, `certificates.py` | `documents`, `certificate_templates`, `certificates` |
| Settings/Backup/Audit | `features/settings` | `settings.py`, `backup.py`, `audit_logs.py`, `import_export.py`, `batch.py` | `settings`, `backup_entries`, `audit_logs`, `user_preferences` |
| Analytics/Reports | dashboard + reports | `analytics.py`, `reports.py` | (reuses core tables) |
| Logistics | `features/logistics` | `logistics.py` | `vendors`, `inventory_*`, `assets`, `maintenance_*`, `purchase_*`, `stock_movements` |

---

## 7. API Design

- **Prefix**: `/api/v1` (`settings.api_v1_prefix`).
- **Protocol**: REST over HTTPS; JSON request/response bodies.
- **Auth**: `Authorization: Bearer <jwt>` access token; refresh via httpOnly cookie.
- **Multi-tenancy**: server-side; resolved by middleware — no client token needed.
- **Multi-school**: `X-School-Id` header on every school-scoped call.
- **Permissions**: per-route `require_permission("domain:action")`.
- **Errors**: RFC 7807 `application/problem+json` (`type`, `title`, `status`, `detail`,
  optional `entity_type`/`entity_id`). 501 stubs return a problem with
  `title="Not Implemented"`.
- **Pagination**: endpoints accept `offset/limit` (e.g. `/students?offset=0&limit=20`).
- **Docs**: `/docs` (Swagger) and `/redoc` are public.

### Public/special routes

```text
GET  /health                       liveness
POST /auth/login                   issue access + refresh cookie
POST /auth/refresh                  rotate refresh cookie
POST /auth/refresh-token            alias of /refresh
POST /auth/logout                  revoke refresh cookie
POST /auth/register                (501 — use SaaS admin)
POST /auth/register-parent         parent self-register via school code
GET  /auth/me                      user + memberships + platform-admin flag
GET  /public/...                   public notices (no auth)
GET  /platform/tenants/*           SaaS admin tenant management
```

### Tenant-scoped routes (all require tenant)

Representative examples (`/api/v1` prefix omitted):

```text
/users, /schools, /roles
/academic-years, /terms, /classes, /sections, /streams, /subjects, /subject-groups
/curriculum, /academic-calendar, /time-slots, /timetable
/students, /enrollments, /guardians
/staff, /teacher-assignments, /attendance/students, /attendance/staff, /attendance/hikvision, /leaves
/exams, /exam-schedules, /online-exams, /marks, /results, /grades
/fee-structures, /fee-payments, /fee-dues, /discounts
/notices, /notifications, /messages, /communication-logs, /events, /holidays
/library/books, /library/issues
/transport/vehicles, /transport/routes, /transport/route-stops, /transport/student-assignments
/parent, /documents, /certificates, /settings, /backup, /import-export, /batch
/reports, /analytics, /logistics
```

---

## 8. Deployment

### 8.1 Local dev — `docker-compose.yml`

Four services:

| Service | Image/build | Ports (dev) | Notes |
|---|---|---|---|
| `db` | `postgres:16` | 5432 -> 5432 | user/db `kuskul/kuskul`; healthcheck `pg_isready` |
| `redis` | `redis:7-alpine` | 6379 -> 6379 | `--maxmemory 512mb --maxmemory-policy allkeys-lru` |
| `api` | `build: ./backend` | 8000 -> 8000 | runs `alembic upgrade head && uvicorn ... --reload`; mounts `./backend/app`, `./backend/alembic`, `./backend/alembic.ini`, `./app/models` |
| `web` | `image: node:20` | 3000 -> 5173 (Vite) | `npm ci && npm run dev --host`; proxy `/api` -> `http://api:8000` |

Environment overrides: `docker-compose.local-safe.yml` remaps ports via
`KUSKUL_WEB_PORT`/`KUSKUL_API_PORT`/`KUSKUL_DB_PORT`/`KUSKUL_REDIS_PORT`.

### 8.2 One-click launcher — `run-kuskul.sh`

- Verifies Docker + Compose availability.
- Picks **free local ports** (web 13000+, api 18000+, db 15432+, redis 16379+) by
  incrementing until unoccupied.
- Exports the `*_PORT` env vars and runs
  `docker compose -f docker-compose.yml -f docker-compose.local-safe.yml up -d --build`.
- Prints live URLs (web + FastAPI docs) and opens the browser via `xdg-open`.

### 8.3 Production — `docker-compose.prod.yml`

| Service | Notes |
|---|---|
| `db` | Same image, **named volume** `postgres_data`, no host port. |
| `api` | `ENVIRONMENT=production`; `REFRESH_TOKEN_COOKIE_SECURE=true`,
  `RATE_LIMIT_ENABLED=true`; `command` runs `alembic upgrade head && uvicorn app.main:app`. |
| `web` | `build: ./frontend` (Vite production build served by nginx on port 80). |

Production web serving uses `frontend/Dockerfile` (nginx) — see §9 for the AI/local
mount details.

### 8.4 Backend `Dockerfile`

`python:3.11-slim-bookworm`. Installs `musl` runtime (so pre-built `llama-cpp-python`
wheels import), copies `requirements.txt`, installs deps, copies `alembic.ini`,
`alembic/`, `app/`, creates `/app/models`, and `CMD`s into
`alembic upgrade head && seed_demo_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8000`.

### 8.5 AI model mount

Docker Compose mounts `./app/models` -> `/app/models` (dev) and the backend
`Dockerfile`/env reference `AI_MODEL_PATH=/app/models/phi-3-mini-4k-instruct-q4_k_m.gguf`.
`REDIS_URL`, `AI_MAX_TOKENS`, `AI_TEMPERATURE`, `AI_BUILDER_*`, `AI_REPAIR_*`,
`REDIS_CACHE_TTL`, `RATE_LIMIT_AI_GENERATION` are all configurable. Default
`AI_MODEL_WARM_LOAD=false`.

### 8.6 Cron / scheduled job — Hikvision attendance

`scripts/run-hikvision-attendance-cron.sh` runs, inside the `api` compose service:
`python -m app.scripts.run_hikvision_attendance`. This is intended to be invoked by OS
cron (`* * * * *` recommended); the worker itself is idempotent and school-window aware
(see the attendance architecture doc §7).

---

## 9. Testing & Quality

### Backend (`pytest` + `httpx`)

`backend/tests/` — suites organized by domain, each using a shared `conftest.py`
factory/DB fixtures:

- `test_auth.py`, `test_users_schools.py`, `test_roles.py`, `test_guardians_staff.py`
- `test_academics.py`, `test_students_enrollments.py`, `test_subject_delete_conflict.py`,
  `test_year_delete_conflict.py`
- `test_attendance_...`? → `test_teacher_assignments_attendance.py`,
  `test_hikvision_student_attendance.py`
- `test_exams_results.py`, `test_online_exams.py`, `test_leaves_timetable.py`
- `test_fees_discounts.py`, `test_transport.py`, `test_library.py`
- `test_reports_analytics_documents.py`, `test_parent_portal.py`, `test_health.py`
- `test_security_contracts.py`, `test_architech_contract.py`, `test_comms.py`,
  `test_batch_ops.py`, `test_docs.py`
- `test_components.py`, `test_ai_system.py`, `test_ai_e2e.py`

### Frontend

- `vitest` unit (jsdom) — `src/**/*.test.{ts,tsx}`.
- Storybook 8 with the Vitest browser runner (chromium via Playwright).
- `playwright.config.ts` for end-to-end tests.
- Coverage tooling: `@vitest/coverage-v8`.

### CI hint

`backend/test_components.py` and root util scripts (`check_contracts.py`,
`check_version.py`, `convert_schedule.py`) suggest a contract/version-checking step;
add the lint/typecheck targets here once your CI provider is chosen.

---

## 10. Configuration

Backend (`pydantic-settings`, reads `.env`; field env names are upper-cased):

| Setting key | Default | Notes |
|---|---|---|
| `APP_NAME` | `KusKul SMS API` | |
| `ENVIRONMENT` | `development` | `production` enables HSTS + cookie `Secure` |
| `API_V1_PREFIX` | `/api/v1` | |
| `DATABASE_URL` | `sqlite:///./dev.db` | |
| `JWT_ISSUER` | `sms-api` | |
| `JWT_AUDIENCE` | `sms-web` | |
| `JWT_SECRET_KEY` | `change-me-please-32-bytes` | **must be overridden in prod** |
| `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` | `60` | |
| `REFRESH_TOKEN_EXPIRES_DAYS` | `7` | |
| `REFRESH_TOKEN_COOKIE_SECURE` | `false` | `true` in prod |
| `REFRESH_TOKEN_COOKIE_SAMESITE` | `lax` | |
| `PLATFORM_DOMAIN` | — | host that maps to SaaS admin |
| `CORS_ORIGINS` | `*` | parsed to a list |
| `RATE_LIMIT_ENABLED` | `true` | |
| `RATE_LIMIT_API_PER_MINUTE` | `100` | |
| `RATE_LIMIT_AUTH_PER_15_MINUTES` | `5` | login/register burst |

Frontend env (Vite, `import.meta.env`): `VITE_API_BASE_URL` (default `/api/v1`) and
`VITE_PROXY_TARGET` (dev Vite proxy target).

---

## 11. Authentication & Authorization Flow

```text
Browser                          API                      DB
   │  POST /auth/login (email,password, ?tenant=)      │
   │                          → TenantMiddleware resolves tenant
   │                          → verify password (bcrypt)
   │                          → issue access JWT + set refresh cookie (hash=sha256)
   │  ← access_token (JSON) + Set-Cookie: refresh_token (httpOnly)
   │
   │  GET /auth/me  (Authorization: Bearer access_token)
   │                          → decode JWT, load memberships + roles + platform flag
   │  ← profile + memberships
   │
   │  GET /students  (X-School-Id, X-Tenant-Subdomain)
   │                          → require_tenant + require_permission(students:read)
   │                          → auto-inject tenant_id via before_flush (writes)
   │  ← data
   │
   │  ... token expires ...
   │  POST /auth/refresh  (Cookie: refresh_token)
   │                          → rotate refresh, revoke old hash, issue new access
```

Authorization model:
- Tenant access required for most endpoints.
- Platform admin is separate from tenant users.
- School-scoped endpoints require `X-School-Id` whose school belongs to the tenant.
- Permissions come from `Role.permissions` JSON (`allow` list) on the active membership;
  `super:*` bypasses all checks.

---

## 12. Data Flow: Multi-Tenancy + Audit

```text
TenantMiddleware  --sets--> request.state.tenant_id + ContextVar
        │
        ▼
require_permission  --reads--> X-School-Id, Membership, Role.permissions
        │
        ▼
endpoint handler --uses--> get_db() SessionLocal (bound to engine)
        │
        ▼
SQLAlchemy before_flush  --fills--> obj.tenant_id = ContextVar value
        │
        ▼
_audit_log middleware (POST/PUT/PATCH/DELETE + X-School-Id) --> AuditLog row
```

---

## 13. Known Observations / Risks

1. **Runtime schema patch**: `main.py` runs `ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)` at startup. This should be moved into an Alembic migration and the table introspected there.
2. **CORS**: `allow_origins=["*"]` with `allow_credentials=True` is unsafe — replace with an explicit allow-list in production (`settings.cors_allow_origins` is already parsed and ready to use).
3. **Debug print**: `TenantMiddleware` contains a `print(...)` for diagnostics; switch to a structured logger in production.
4. **SQLite fallback default**: `DATABASE_URL` defaults to `sqlite:///./dev.db`, while Docker Compose uses PostgreSQL. Ensure prod deploys a real DB URL (this is an env/docs concern, not a code defect).
5. **Local model path**: `AI_MODEL_PATH=/app/models/phi-3-mini-4k-instruct-q4_k_m.gguf` is mounted from `./app/models`; the model is not bundled in the repo and must be supplied operationally.
6. **Audit logging** fires on every mutating call that carries `X-School-Id`; high write throughput could add load — consider sampling/batching for scale.
7. **`refresh_token` uniqueness**: schema does not enforce a unique constraint on active refresh tokens; rotation relies on `revoked_at`, accept to avoid stale concurrency on very fast re-logins.
8. **Frontend `localhost`** references inside `src` are dev-only; production relies on the nginx proxy `/api` rewrite.

---

## 14. Diagrams

### Module-to-table cross-reference (excerpt)

```text
academic_years      terms        classes        sections        streams
students            enrollments  guardians      student_guardians
staff               teacher_assignments
student_attendance  staff_attendance        attendance_excuses
exams               exam_schedules  marks  results  grades
fee_structures      fee_dues     fee_payments  discounts
notices             notifications  messages  communication_logs  events  holidays
library_books       library_issues
transport_vehicles transport_routes transport_route_stops student_transport_assignments
documents           certificates  settings  audit_logs  backup_entries
hikvision_devices   hikvision_student_credentials  hikvision_attendance_events
logistics:          vendors inventory_items inventory_locations stock_movements
                    assets maintenance_tickets purchase_requests purchase_orders goods_receipts
```

### Deployment (prod)

```text
Internet -> CloudFlare CDN (or direct) -> Nginx (front, port 80)
          -> FastAPI API (uvicorn workers) -> PostgreSQL 16 + Redis 7
          -> /app/models (mounted GGUF) for AI workloads
```
