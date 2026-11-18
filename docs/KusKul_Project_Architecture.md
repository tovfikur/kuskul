# KusKul Project Architecture

Generated on: 2026-07-22

## 1. Project Summary

KusKul is a multi-tenant school management system. The project is organized as a full-stack web application with a React frontend, a FastAPI backend, PostgreSQL database storage, Redis support for AI/cache workloads, Alembic migrations, Docker-based local/prod deployment files, and automated test suites.

The system supports SaaS-style tenant routing, school-level access, role and permission checks, authentication, academic administration, student management, staff management, exams, finance, logistics, events, parent/student portals, reporting, and settings.

## 2. High-Level Architecture

```text
User Browser
    |
    | React 19 + Vite app
    | Material UI screens, Redux auth state, Axios API client
    v
Frontend Web App : frontend/
    |
    | /api proxy in Vite or direct API base URL
    | JWT access token + refresh cookie
    | X-School-Id and tenant headers
    v
FastAPI Backend : backend/app/
    |
    | API routers under /api/v1
    | Auth, tenant middleware, permissions, audit logging
    | SQLAlchemy ORM + Pydantic schemas
    v
PostgreSQL 16
    |
    | Alembic migrations
    v
Relational school management data

Redis 7
    |
    | AI generation/cache/rate-limit support
    v
AI/cache workloads
```

## 3. Runtime Services

```text
docker-compose.yml
├── db
│   ├── image: postgres:16
│   ├── database: kuskul
│   └── port: 5432
├── redis
│   ├── image: redis:7-alpine
│   └── port: 6379
├── api
│   ├── build: ./backend
│   ├── framework: FastAPI + Uvicorn
│   ├── port: 8000
│   ├── migration command: alembic upgrade head
│   └── mounted code: backend/app, backend/alembic
└── web
    ├── image: node:20
    ├── framework: React + Vite
    ├── container port: 5173
    └── host port: 3000
```

## 4. Folder Structure

```text
KusKul/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── api.py
│   │   │       └── endpoints/
│   │   │           ├── academic_years.py
│   │   │           ├── analytics.py
│   │   │           ├── attendance_staff.py
│   │   │           ├── attendance_students.py
│   │   │           ├── auth.py
│   │   │           ├── certificates.py
│   │   │           ├── classes.py
│   │   │           ├── curriculum.py
│   │   │           ├── documents.py
│   │   │           ├── events.py
│   │   │           ├── exams.py
│   │   │           ├── fee_dues.py
│   │   │           ├── fee_payments.py
│   │   │           ├── fee_structures.py
│   │   │           ├── guardians.py
│   │   │           ├── import_export.py
│   │   │           ├── library_books.py
│   │   │           ├── logistics.py
│   │   │           ├── marks.py
│   │   │           ├── online_exams.py
│   │   │           ├── parent_portal.py
│   │   │           ├── payroll.py
│   │   │           ├── platform_tenants.py
│   │   │           ├── reports.py
│   │   │           ├── results.py
│   │   │           ├── roles.py
│   │   │           ├── schools.py
│   │   │           ├── settings.py
│   │   │           ├── staff.py
│   │   │           ├── students.py
│   │   │           ├── subjects.py
│   │   │           ├── timetable.py
│   │   │           ├── transport_routes.py
│   │   │           ├── transport_vehicles.py
│   │   │           └── users.py
│   │   ├── core/
│   │   │   ├── audit.py
│   │   │   ├── config.py
│   │   │   ├── problems.py
│   │   │   ├── rate_limit.py
│   │   │   ├── security.py
│   │   │   ├── seed.py
│   │   │   ├── tenant_context.py
│   │   │   └── tenant_middleware.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── academic_year.py
│   │   │   ├── attendance_excuse.py
│   │   │   ├── audit_log.py
│   │   │   ├── certificate.py
│   │   │   ├── enrollment.py
│   │   │   ├── exam.py
│   │   │   ├── fee_due.py
│   │   │   ├── guardian.py
│   │   │   ├── inventory.py
│   │   │   ├── membership.py
│   │   │   ├── payroll.py
│   │   │   ├── school.py
│   │   │   ├── staff.py
│   │   │   ├── student.py
│   │   │   ├── tenant.py
│   │   │   ├── transport_route.py
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   └── Pydantic request/response schemas per module
│   │   ├── scripts/
│   │   │   ├── seed_demo_data.py
│   │   │   └── smoke_openapi.py
│   │   └── main.py
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── database migration scripts
│   ├── tests/
│   │   └── pytest test modules by feature area
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── public/
│   │   └── header_resource/
│   ├── src/
│   │   ├── api/
│   │   │   ├── academic.ts
│   │   │   ├── auth.ts
│   │   │   ├── client.ts
│   │   │   ├── exams.ts
│   │   │   ├── finance.ts
│   │   │   ├── logistics.ts
│   │   │   ├── people.ts
│   │   │   ├── platform.ts
│   │   │   ├── staffManagement.ts
│   │   │   └── transport.ts
│   │   ├── app/
│   │   │   ├── hooks.ts
│   │   │   ├── store.ts
│   │   │   ├── toast.ts
│   │   │   └── ToastProvider.tsx
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── academic/
│   │   │   ├── auth/
│   │   │   ├── events/
│   │   │   ├── exams/
│   │   │   ├── finance/
│   │   │   ├── logistics/
│   │   │   ├── portals/
│   │   │   ├── saas/
│   │   │   ├── schools/
│   │   │   ├── settings/
│   │   │   ├── staff/
│   │   │   ├── students/
│   │   │   └── users/
│   │   ├── layouts/
│   │   │   ├── AuthLayout.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── LandingPage.tsx
│   │   ├── theme/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── playwright.config.ts
├── app/
│   └── models/
│       └── local AI model mount point
├── docs/
│   └── generated architecture documentation
├── docker-compose.yml
├── docker-compose.prod.yml
├── docker-compose.local-safe.yml
├── docker-compose.odoo-safe.yml
└── project documentation and utility scripts
```

## 5. Backend Architecture

The backend is a FastAPI application under `backend/app`.

Main responsibilities:

- API startup, middleware, static files, OpenAPI docs, and router registration are handled in `backend/app/main.py`.
- Versioned API routing is centralized in `backend/app/api/v1/api.py`.
- Endpoint modules are split by feature under `backend/app/api/v1/endpoints/`.
- Database models use SQLAlchemy 2.0 declarative mapping under `backend/app/models/`.
- Request and response contracts use Pydantic schemas under `backend/app/schemas/`.
- Database sessions and automatic tenant assignment are configured in `backend/app/db/session.py`.
- Security, JWT handling, rate limiting, audit logging, tenant detection, and seed routines live under `backend/app/core/`.
- Alembic manages database migrations under `backend/alembic/`.

Important backend flows:

- `TenantMiddleware` detects the tenant from subdomain, `X-Tenant-Subdomain`, `X-Tenant-ID`, origin, or development query parameter.
- Tenant-aware endpoints are wrapped in a router dependency requiring a tenant.
- School-scoped operations require `X-School-Id`.
- Permission checks use user memberships and role permission payloads.
- Mutating requests are audit logged when a school header is present.
- Access tokens are decoded through the backend security layer; refresh tokens are cookie-backed.

## 6. Frontend Architecture

The frontend is a React application under `frontend/`.

Main responsibilities:

- `src/main.tsx` bootstraps React.
- `src/App.tsx` defines application routes.
- `src/layouts/MainLayout.tsx` defines the authenticated app shell with navigation and active school selection.
- `src/layouts/AuthLayout.tsx` wraps authentication screens.
- `src/features/*` contains feature-owned pages and components.
- `src/api/*` contains Axios API clients by backend domain.
- `src/app/store.ts` configures Redux Toolkit.
- `src/features/auth/authSlice.ts` manages session state, access token persistence, memberships, platform admin state, and active school selection.
- `src/api/client.ts` configures Axios with tenant and school headers plus refresh handling.

Primary routes:

```text
/
/login
/dashboard
/schools
/academic
/students
/staff
/users
/exams
/events
/finance
/logistics
/settings
/settings/users
/student-portal
/guardian-portal
/saas-admin
```

## 7. Feature Modules

| Feature area | Frontend location | Backend/API location | Purpose |
|---|---|---|---|
| Landing and dashboard | `frontend/src/pages/` | `analytics`, `reports`, public endpoints | Public landing and authenticated overview |
| Authentication | `features/auth`, `api/auth.ts` | `endpoints/auth.py`, security core | Login, refresh, logout, protected routes |
| SaaS tenants | `features/saas` | `platform_tenants.py`, `tenant.py` | Platform admin tenant management |
| Schools | `features/schools` | `schools.py`, `school.py` | School records under tenant context |
| Users and roles | `features/users`, `features/settings` | `users.py`, `roles.py`, `membership.py` | User accounts, memberships, permissions |
| Academic | `features/academic` | years, terms, classes, sections, subjects, streams, curriculum, timetable | Academic structure and scheduling |
| Students | `features/students` | students, enrollments, guardians, batch, import/export | Admissions, directory, reports, student settings |
| Staff | `features/staff` | staff, staff_extended, staff_leave, payroll, attendance_staff | Directory, attendance, leave, payroll, documents, performance |
| Exams | `features/exams` | exams, exam_schedules, online_exams, marks, results, grades | Offline/online exams, schedules, marks, results |
| Finance | `features/finance` | fee_structures, fee_dues, fee_payments, discounts | Fees, dues, payments, discounts, collection reports |
| Events and notices | `features/events` | events, holidays, notices, public_notices | Calendar events, notices, holidays |
| Logistics | `features/logistics` | logistics, inventory, vendors, assets, procurement models | Inventory, assets, maintenance, vendors, procurement |
| Library | API-only/implicit | library_books, library_issues | Book catalog and issue tracking |
| Transport | API clients and backend endpoints | transport vehicles, routes, stops, assignments | Transport fleet, routes, stops, student assignment |
| Parent/student portals | `features/portals` | `parent_portal.py` | Student and guardian self-service views |
| Documents/certificates | staff docs, documents API | documents, certificates | File records, certificates, templates |
| Settings/backup/audit | `features/settings` | settings, backup, audit_logs | System settings, backups, audit history |

## 8. Technology Stack

| Layer | Tools and technologies |
|---|---|
| Frontend framework | React 19, React DOM |
| Frontend build tool | Vite 7 |
| Frontend language | TypeScript |
| UI library | Material UI 7, Emotion |
| Icons | MUI Icons, Lucide React |
| State management | Redux Toolkit, React Redux |
| Routing | React Router DOM 7 |
| Forms and validation | React Hook Form, Zod, Hookform Resolvers |
| HTTP client | Axios |
| Charts | Recharts |
| Dates | date-fns |
| Styling | MUI theme, CSS, Tailwind/PostCSS configuration |
| Frontend testing | Vitest, Testing Library, jsdom, Playwright, Storybook |
| Backend framework | FastAPI |
| Backend server | Uvicorn |
| Backend language | Python 3.11 |
| ORM | SQLAlchemy 2 |
| API schemas | Pydantic 2 |
| Settings | pydantic-settings |
| Database migrations | Alembic |
| Database | PostgreSQL 16 in Docker; SQLite fallback default for local config |
| PostgreSQL driver | psycopg 3 |
| Authentication | JWT with python-jose, Passlib, bcrypt |
| File upload/form parsing | python-multipart |
| QR generation | segno |
| Cache/background support | Redis, hiredis |
| AI support | llama-cpp-python, local GGUF model mount, JSON schema validation |
| Backend testing | pytest, httpx |
| Containers | Docker, Docker Compose |
| Production web serving | frontend Dockerfile/nginx config present |

## 9. Database Overview

Primary database in Docker Compose:

```text
PostgreSQL 16
database: kuskul
user: kuskul
password: kuskul
port: 5432
```

Local backend default if `DATABASE_URL` is not supplied:

```text
sqlite:///./dev.db
```

Database access pattern:

- SQLAlchemy engine and session factory are defined in `backend/app/db/session.py`.
- Models inherit from a shared declarative `Base`.
- Alembic migrations live in `backend/alembic/versions/`.
- Tenant ID is automatically assigned to new SQLAlchemy objects that expose a `tenant_id` field when tenant context exists.
- Most business tables are tenant-aware and many are also school-scoped.

Major table groups:

```text
SaaS and identity
├── tenants
├── users
├── roles
├── memberships
├── refresh_tokens
└── password_reset_tokens

School and academic
├── schools
├── academic_years
├── terms
├── classes
├── sections
├── streams
├── subjects
├── subject_groups
├── class_subjects
├── curriculum_units
├── academic_calendar_settings
├── time_slots
└── timetable_entries

Students and guardians
├── students
├── guardians
├── student_guardians
├── enrollments
├── attendance_excuses
├── discipline_records
└── student_discounts

Staff
├── staff
├── departments
├── designations
├── staff_contracts
├── staff_qualifications
├── staff_performance_records
├── leave_types
├── leave_balances
├── staff_leave_requests
├── payroll_cycles
└── payslips

Attendance and teaching
├── teacher_assignments
├── student_attendance
└── staff_attendance

Exams and results
├── exams
├── exam_type_master
├── exam_schedules
├── marks
├── results
├── grades
├── question_bank_categories
├── question_bank_questions
├── online_exam_configs
├── online_exam_config_questions
├── online_exam_attempts
├── online_exam_answers
└── online_exam_proctor_events

Finance
├── fee_structures
├── fee_dues
├── fee_payments
└── discounts

Communication and events
├── notices
├── notifications
├── messages
├── communication_logs
├── events
└── holidays

Library and transport
├── library_books
├── library_issues
├── transport_vehicles
├── transport_routes
├── transport_route_stops
└── student_transport_assignments

Logistics
├── vendors
├── inventory_items
├── inventory_locations
├── stock_movements
├── assets
├── maintenance_tickets
├── purchase_requests
├── purchase_request_lines
├── purchase_orders
├── purchase_order_lines
├── goods_receipts
└── goods_receipt_lines

System
├── documents
├── certificate_templates
├── certificates
├── settings
├── user_preferences
├── audit_logs
├── backup_entries
└── appointment_requests
```

## 10. Authentication and Authorization

Authentication model:

- Users authenticate through `/api/v1/auth`.
- Access tokens are JWTs.
- Refresh behavior is supported with a refresh cookie.
- The frontend stores the current access token and active school ID in `localStorage` under `kuskul_auth`.
- Axios attaches `X-School-Id` and `X-Tenant-Subdomain` headers automatically.

Authorization model:

- Tenant access is required for most API endpoints.
- Platform admin access is separated from tenant users.
- School-level endpoints require `X-School-Id`.
- Membership records connect users to schools and roles.
- Roles store permission payloads.
- Permission checks accept exact permissions or `super:*`.

## 11. Multi-Tenancy Design

Tenant resolution sources:

```text
1. Host/subdomain
2. admin subdomain for SaaS admin
3. X-Tenant-Subdomain header
4. X-Tenant-ID header
5. Origin host subdomain
6. ?tenant= query parameter in development
```

Tenant context behavior:

- Middleware stores tenant data on `request.state`.
- A context variable stores the active tenant ID during the request.
- SQLAlchemy `before_flush` fills `tenant_id` automatically on new objects.
- Tenant routes are grouped under `tenant_router` with `require_tenant()`.
- Platform tenant management is exposed separately under `/api/v1/platform/tenants`.

## 12. API Structure

The API prefix is:

```text
/api/v1
```

Public or special routers:

```text
/api/v1/health
/api/v1/auth
/api/v1/public
/api/v1/platform/tenants
```

Tenant-protected routers include:

```text
/schools
/users
/roles
/academic-years
/terms
/classes
/sections
/streams
/subject-groups
/subjects
/curriculum
/academic-calendar
/students
/enrollments
/guardians
/staff
/teacher-assignments
/attendance/students
/attendance/staff
/leaves
/timetable
/time-slots
/exams
/exam-schedules
/online-exams
/marks
/results
/grades
/fee-structures
/fee-payments
/fee-dues
/discounts
/notices
/notifications
/messages
/communication-logs
/library/books
/library/issues
/transport/vehicles
/transport/routes
/transport/route-stops
/transport/student-assignments
/reports
/analytics
/parent
/documents
/certificates
/events
/holidays
/settings
/backup
/import-export
/batch
/logistics
```

## 13. Testing and Quality

Backend:

- `pytest` test suite under `backend/tests/`.
- Tests are organized by modules such as auth, academics, students, exams, finance, transport, library, reports, security contracts, and health.
- `httpx` is used for API testing.

Frontend:

- `vitest` is configured for unit tests.
- Testing Library and jsdom support React component tests.
- Storybook and Storybook Vitest integration are configured.
- Playwright is present for browser-based testing.

Project-level scripts and documents:

- Multiple implementation summaries and verification documents exist at the repository root.
- Utility scripts include student health checks, comprehensive tests, email fixes, import conversion, and contract checks.

## 14. Deployment Notes

Development:

- `docker-compose.yml` starts PostgreSQL, Redis, FastAPI, and Vite.
- Backend runs Alembic migrations automatically before Uvicorn.
- Frontend runs `npm ci` and starts Vite on container port `5173`, exposed as host port `3000`.

Production-related files:

- `docker-compose.prod.yml`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `backend/Dockerfile`

AI-related deployment:

- Backend Dockerfile installs `llama-cpp-python`.
- Docker Compose mounts `./app/models` into `/app/models`.
- AI settings reference local GGUF model paths and Redis.

## 15. Key Architecture Strengths

- Clear feature separation across frontend and backend.
- Versioned API structure.
- Tenant-aware backend with automatic tenant ID propagation.
- School-level access context with `X-School-Id`.
- Broad feature coverage for a complete school management platform.
- Alembic-based schema evolution.
- Docker Compose covers the full local stack.
- Tests exist for many backend feature contracts and frontend screens.

## 16. Important Observations

- The repository has many modified files in the current git working tree. This document does not change existing application code.
- `backend/app/main.py` includes a runtime schema patch for `staff.user_id`; ideally this should live only in Alembic migrations.
- CORS is currently configured as `allow_origins=["*"]` with credentials enabled in `main.py`; production should tighten this.
- `TenantMiddleware` contains a debug `print`; production logging should use a structured logger.
- The backend default database URL is SQLite, while Docker Compose uses PostgreSQL. This is useful for local fallback but should be explicit in environment setup documentation.

