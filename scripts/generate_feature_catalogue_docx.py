"""Build a Google Docs-compatible feature catalogue from the verified KusKul scope.

The output is a standards-based Office Open XML .docx file. Google Drive can
upload and open it directly with Google Docs, and it remains downloadable.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


OUT = Path("docs/KusKul_Feature_Catalogue_and_Solution_Analysis.docx")

FEATURES = [
    ("F-01", "SaaS tenancy, school structure & platform administration", "Implemented", "Platform administrators can create and manage tenants; tenant users operate within one or more schools."),
    ("F-02", "Identity, authentication & role-based access control", "Implemented", "Secure sign-in, JWT sessions, refresh-token handling, roles, memberships and permission checks."),
    ("F-03", "Academic configuration", "Implemented", "Academic years, terms, classes, sections, streams, subject groups, subjects, curricula, calendars and time slots."),
    ("F-04", "Student lifecycle & admissions", "Implemented", "Student directory, admission workflow, guardian links, enrollment history, settings and student reports."),
    ("F-05", "Student attendance & biometric integration", "Implemented", "Daily attendance, excused records, late flags, dashboards and Hikvision event ingestion/synchronization."),
    ("F-06", "Staff & HR management", "Implemented", "Staff directory, profiles, leave, attendance, performance workspace, payroll and staff documents/contracts."),
    ("F-07", "Teaching allocation & timetable", "Implemented", "Teacher-to-class/subject mapping and timetable entries managed against reusable time slots."),
    ("F-08", "Examinations, marks & results", "Implemented", "Offline examination master data, bulk schedules, marks entry, grades, results and online-exam APIs."),
    ("F-09", "Fees, dues & discounts", "Implemented", "Fee structures, invoices, collection, dues, discounts, payment records and financial reporting."),
    ("F-10", "Communication, events & notifications", "Implemented", "Notices, public notices, messages, notification inbox, communication logs, events and holidays."),
    ("F-11", "Parent, student & teacher experiences", "Implemented", "Dedicated student and guardian portals plus a role-limited teacher dashboard and routes."),
    ("F-12", "Library & transport operations", "Implemented", "Book catalogue and issue tracking; vehicles, routes, stops and student transport assignments."),
    ("F-13", "Logistics, procurement & asset management", "Implemented", "Inventory, vendors, procurements, assets, maintenance, operational reports and logistics settings."),
    ("F-14", "Documents, certificates, reports & analytics", "Implemented", "Document library, certificates, dashboard KPIs, attendance/academic/financial statistics and trend reporting."),
    ("F-15", "Data administration, audit & resilience", "Implemented", "CSV imports/exports, batch operations, school-scoped backup/restore, audit logs, settings and health endpoints."),
    ("F-16", "AI school-website generation foundation", "Partially implemented / not exposed", "Documented backend foundation for model-based school website generation, caching and validation; APIs and UI are marked unfinished."),
]

DETAILS = [
    ("F-01", "SaaS tenancy, school structure & platform administration",
     "Lets a platform operator run KusKul as a SaaS product, provision customer tenants, and let each customer manage one or more schools without seeing another customer’s data.",
     "FastAPI tenant middleware derives tenant context from subdomain, tenant headers, origin or a development query parameter. Tenant-scoped routers enforce a tenant dependency; school-scoped work uses the X-School-Id context. PostgreSQL entities carry tenant/school relationships; the React SaaS administration area provides tenant management."),
    ("F-02", "Identity, authentication & role-based access control",
     "Ensures that platform administrators, school administrators, teachers, students and guardians can access only the functions and records appropriate to their role.",
     "Authentication endpoints issue HS256 JWT access tokens and maintain hashed refresh tokens. Passwords use bcrypt through Passlib. Memberships connect users to schools and roles; endpoint dependencies enforce named permissions. The frontend protects tenant, platform-admin and teacher routes, while rate limiting and audit support provide operational safeguards."),
    ("F-03", "Academic configuration",
     "Gives a school a consistent academic foundation before operational work begins: the calendar, teaching structure, subjects and curriculum are defined once and reused across admissions, scheduling, attendance and assessments.",
     "The Academic workspace exposes years, terms, classes, sections, streams, subject groups, subjects, curriculum, calendar and time-slot tabs. Separate API routers and SQLAlchemy models maintain these master records. Current academic year selection is used by analytics and exam/result flows; relationships enforce school ownership."),
    ("F-04", "Student lifecycle & admissions",
     "Supports a student from application/admission through enrollment, class placement, guardian association, daily records and reporting, reducing fragmented spreadsheets and duplicate data entry.",
     "Student, guardian and enrollment APIs are separate, tenant-scoped resources. The React student area includes Admissions, directory, attendance, reports, individual report and settings views. The data model retains admission number, demographic/profile fields, enrollment and guardian links; CSV import/export supports controlled onboarding and migration."),
    ("F-05", "Student attendance & biometric integration",
     "Enables daily presence, absence and lateness visibility for administrators and guardians, while allowing biometric attendance to be adopted without storing fingerprints in KusKul.",
     "Student-attendance endpoints and UI support daily recording and reporting. Hikvision integration accepts device event data or cloud sync events, maps a device person code to a student, deduplicates raw events and creates a single daily present/late record for an active enrollment. Raw events remain available for reconciliation; manual, leave and prior biometric records are not overwritten. Device secrets require production secret-management hardening as noted in project documentation."),
    ("F-06", "Staff & HR management",
     "Centralizes teacher and non-teaching employee information, attendance, time off, payroll and personnel documents so school operations can manage people consistently.",
     "The Staff workspace has directory, attendance, leave, payroll, performance, documents/contracts and settings views. API modules cover extended staff profiles, staff leave, payroll and core staff records; staff attendance is a dedicated router. Staff, contract, allowance, payroll and document schemas/models implement the data layer, with permissions protecting HR actions."),
    ("F-07", "Teaching allocation & timetable",
     "Makes teaching responsibility and the school day transparent by assigning teachers to instructional work and publishing a structured timetable.",
     "Teacher-assignment, timetable and time-slot routers store the allocation and schedule records. Academic UI includes Teacher Mapping, Timetable and Time Slots tabs. These records reference the school’s academic structure, enabling class/subject/teacher scheduling rather than free-text schedules."),
    ("F-08", "Examinations, marks & results",
     "Runs the assessment lifecycle from creating an exam through subject schedules and marks to publishable results, giving management and families a consistent academic performance record.",
     "The exam UI provides offline exam master, schedules (including bulk scheduling), marks entry and results. Back-end services expose exams, exam schedules, marks, grades, results and online-exam resources. Results analytics calculate counts and performance trends; import/export supports marks ingestion. Exam type master fields and result remarks are represented in migrations/schemas."),
    ("F-09", "Fees, dues & discounts",
     "Turns fee policy into collectible, traceable student accounts: staff can configure charges, take payments, monitor arrears and apply approved concessions.",
     "Finance views include fee structures, invoices, payments, dues, discounts and reports, with collection and discount dialogs. APIs manage fee structures, payments, generated/recorded dues and discounts. The analytics financial endpoint aggregates paid and due amounts, while import/export supports fee-structure records. Database entities retain payment and due values rather than relying only on UI totals."),
    ("F-10", "Communication, events & notifications",
     "Keeps the school community informed with notices, scheduled events, holidays, direct messages and an in-app notification trail.",
     "Dedicated API routers manage notices, public notices, messages, notification records, communication logs, events and holidays. The Events workspace contains calendar, list, notice-board and event-form components. Public notices are intentionally routed outside tenant authentication where appropriate; internal notification counts feed the role dashboards."),
    ("F-11", "Parent, student & teacher experiences",
     "Provides each audience a focused experience: students and guardians access self-service information, while teachers see a constrained dashboard and academic/students/exam/event tools.",
     "React routes expose /student-portal, /guardian-portal and /teacher-portal, guarded by authentication and tenant/teacher checks. Parent portal APIs are tenant-scoped. Teacher routing uses a specialized authorization component and redirects to a role-specific dashboard. This is a presentation/access layer over the same secured tenant data rather than a separate database."),
    ("F-12", "Library & transport operations",
     "Extends the system beyond the classroom by tracking learning resources and safely organizing school transport capacity, stops and student assignments.",
     "Library book and issue routers/models provide catalogue and borrowing records. Transport endpoints separately manage vehicles, routes, route stops and student assignments, allowing route structures and fleet details to evolve independently. Permissions and school context ensure operational data is isolated per school."),
    ("F-13", "Logistics, procurement & asset management",
     "Helps the school control stock, suppliers, purchasing, equipment and maintenance—supporting accountability for non-academic operations.",
     "The Logistics workspace has inventory, vendors, procurement, assets, maintenance, reports and settings components. A logistics API and inventory, vendor, procurement and asset models support persistence; status chips and filter controls provide operational list workflows. This module sits alongside, rather than inside, finance, preserving distinct operational records."),
    ("F-14", "Documents, certificates, reports & analytics",
     "Converts operational data into usable evidence: staff can store documents, issue certificates, inspect KPIs and identify enrollment, attendance, academic and finance trends.",
     "Document and certificate endpoints/models support managed records. Analytics has role dashboard endpoints plus overview, seven-day attendance, academic, financial, enrollment and performance statistics. The frontend uses KPI/report components and Recharts. Statistics query school-scoped relational data and verify that the requesting user has active school membership."),
    ("F-15", "Data administration, audit & resilience",
     "Reduces operational risk by supporting migration, mass maintenance, recoverability and traceability of sensitive school operations.",
     "CSV import accepts students, staff, fee structures and marks; export endpoints produce CSV datasets. Batch APIs support bulk workflows. Backup creates a gzip-compressed, school-scoped JSON snapshot, records metadata and can download/restore it after a school-ID check. Audit-log, settings and health modules complete governance and support operations. Restore is inherently destructive for the target school’s scoped data and should be access-controlled and tested before use."),
    ("F-16", "AI school-website generation foundation",
     "A planned value-add intended to help a school produce a website configuration from a description, potentially reducing the time and specialist effort needed for a basic school web presence.",
     "Project documentation records a Phase 1 foundation: Phi-3-mini local inference, school-type detection, prompt building, JSON-schema validation, Redis caching and generation audit/queue models. The same documentation explicitly marks public API endpoints, frontend UI, template examples and end-to-end testing as unfinished. It should therefore be treated as technical groundwork, not an available product feature."),
]


def xml(text: str) -> str:
    return escape(text)


def run(text: str, bold: bool = False, color: str | None = None, size: int | None = None) -> str:
    props = ("<w:rPr>" + ("<w:b/>" if bold else "") + (f'<w:color w:val="{color}"/>' if color else "") + (f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>' if size else "") + "</w:rPr>") if (bold or color or size) else ""
    return f"<w:r>{props}<w:t xml:space=\"preserve\">{xml(text)}</w:t></w:r>"


def para(text: str = "", style: str | None = None, bold: bool = False, color: str | None = None, size: int | None = None) -> str:
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{ppr}{run(text, bold, color, size)}</w:p>"


def table(rows: list[list[str]], widths: list[int], header: bool = True) -> str:
    out = ['<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="B8C4CE"/><w:left w:val="single" w:sz="6" w:color="B8C4CE"/><w:bottom w:val="single" w:sz="6" w:color="B8C4CE"/><w:right w:val="single" w:sz="6" w:color="B8C4CE"/><w:insideH w:val="single" w:sz="4" w:color="D9E2F3"/><w:insideV w:val="single" w:sz="4" w:color="D9E2F3"/></w:tblBorders></w:tblPr>']
    for i, row in enumerate(rows):
        out.append('<w:tr>')
        for j, cell in enumerate(row):
            shade = '<w:shd w:fill="1F4E78"/>' if header and i == 0 else ''
            text_color = 'FFFFFF' if header and i == 0 else None
            out.append(f'<w:tc><w:tcPr><w:tcW w:w="{widths[j]}" w:type="dxa"/>{shade}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar></w:tcPr>{para(cell, bold=(header and i == 0), color=text_color)}</w:tc>')
        out.append('</w:tr>')
    return ''.join(out) + '</w:tbl>'


def build_document() -> str:
    today = date.today().strftime('%d %B %Y')
    body = []
    body += [para('KusKul', 'Title', color='1F4E78', size=44), para('Feature Catalogue & Solution Analysis', 'Subtitle', color='4472C4', size=28), para('Business and technical feature inventory', 'Subtitle'), para('Prepared from repository implementation evidence', 'Subtitle'), para('Document version 1.0 | ' + today, 'Subtitle')]
    body += [para('Purpose and scope', 'Heading1'), para('This document is a structured catalogue of the KusKul school management system. It is based on the checked frontend routes/components, FastAPI router registration, database models/migrations, automated tests and project documentation in this repository. “Implemented” means the capability is represented by code and/or an exposed API/UI; it does not by itself certify production readiness, acceptance testing or configured third-party services.'), para('Reading guidance', 'Heading2'), para('The catalogue begins with a concise feature list, followed by detailed feature profiles. Each profile describes the business value and the technical implementation perspective. The final sections summarize architecture, cross-cutting controls and delivery considerations.')]
    body += [para('1. Feature list', 'Heading1')]
    body.append(table([["ID", "Feature area", "Status", "Scope summary"]] + [list(f) for f in FEATURES], [700, 2600, 1200, 3900]))
    body += [para('2. Detailed feature analysis', 'Heading1')]
    for fid, title, business, technical in DETAILS:
        body += [para(f'{fid} — {title}', 'Heading2'), para('Business perspective', 'Heading3'), para(business), para('Technical perspective', 'Heading3'), para(technical)]
    body += [para('3. Solution architecture', 'Heading1'), para('KusKul is a full-stack, multi-tenant web application. The browser application is built with React 19, TypeScript, Vite and Material UI, using Redux Toolkit for application state, Axios for API communication and Recharts for charts. The FastAPI backend uses Pydantic request/response contracts, SQLAlchemy ORM and Alembic migrations. PostgreSQL 16 is the primary relational store; Redis 7 supports cache/AI workloads. Docker Compose files provide local and production-oriented service definitions.'), para('Request and data boundary', 'Heading2'), para('React screens call versioned /api/v1 endpoints. Tenant middleware establishes tenant context; tenant routers require it, and active-school operations use an X-School-Id context. Authenticated users are checked against school memberships and named permissions before protected operations. This design supports SaaS isolation while allowing a tenant to operate multiple schools.'), para('4. Cross-cutting capabilities', 'Heading1')]
    body.append(table([["Capability", "Evidence and operational value"], ["Security", "JWT access tokens, refresh-token hashing, bcrypt password hashing, route guards, permissions, CORS configuration and rate limiting."], ["Auditability", "Audit-log resources plus immutable Hikvision raw attendance events support review and reconciliation."], ["Data quality", "Pydantic schemas, relational models, tenant/school checks and import validation help maintain consistent records."], ["Testing", "Pytest modules cover health, auth, roles, schools, students, academics, attendance, exams, finance, portals, import/export, backups and more. Frontend uses Vitest/Testing Library and has Playwright configured."], ["Deployment", "Docker Compose orchestrates PostgreSQL, Redis, FastAPI/Uvicorn and the Vite web application; Alembic upgrades the schema." ]], [1900, 6500]))
    body += [para('5. Delivery considerations', 'Heading1'), para('Before production rollout, validate each enabled feature against the school’s policies and permissions, run the automated test suites, configure secure secrets and CORS origins, and define backup/restore ownership. For Hikvision, use HTTPS, a dedicated integration account, limited outbound access and a retention policy for raw events. For the documented AI website-generation foundation, complete the unfinished API/UI/test work and review model-hosting, privacy and resource requirements before presenting it as a product capability.'), para('6. Source basis', 'Heading1'), para('Primary implementation evidence reviewed: frontend/src/App.tsx; frontend feature/API modules; backend/app/api/v1/api.py; backend endpoint/model/schema directories; backend tests; docs/KusKul_Project_Architecture.md; docs/Hikvision_Student_Attendance.md; AI_IMPLEMENTATION_STATUS.md; frontend/package.json; and Docker configuration. This is an analysis document, not a substitute for a formal requirements baseline or production security assessment.')]
    body.append('<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/><w:pgNumType w:start="1"/></w:sectPr>')
    return ''.join(body)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">{build_document()}</w:document>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="666666"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="160"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="1F4E78"/><w:sz w:val="30"/></w:rPr><w:pPr><w:spacing w:before="360" w:after="180"/><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="2F5597"/><w:sz w:val="25"/></w:rPr><w:pPr><w:spacing w:before="300" w:after="120"/><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="5B9BD5"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:before="120" w:after="60"/><w:keepNext/></w:pPr></w:style></w:styles>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'''
    doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'''
    core = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>KusKul Feature Catalogue &amp; Solution Analysis</dc:title><dc:creator>KusKul Project Analysis</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">{date.today().isoformat()}T00:00:00Z</dcterms:created></cp:coreProperties>'''
    app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>KusKul Documentation Generator</Application></Properties>'''
    with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document)
        z.writestr("word/styles.xml", styles)
        z.writestr("word/_rels/document.xml.rels", doc_rels)
        z.writestr("docProps/core.xml", core)
        z.writestr("docProps/app.xml", app)
    print(f"Created {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
