from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.exam_type_master import ExamTypeMaster
from app.models.membership import Membership
from app.models.role import Role
from app.models.school import School
from app.models.user import User


def ensure_default_roles(db: Session) -> None:
    seed_roles = {
        "super_admin": {"allow": ["super:*"]},
        "admin": {
            "allow": [
                "users:read",
                "users:write",
                "schools:read",
                "schools:write",
                "academic:read",
                "academic:write",
                "students:read",
                "students:write",
                "enrollments:read",
                "enrollments:write",
                "guardians:read",
                "guardians:write",
                "staff:read",
                "staff:write",
                "teacher_assignments:read",
                "teacher_assignments:write",
                "attendance:read",
                "attendance:write",
                "leaves:read",
                "leaves:write",
                "timetable:read",
                "timetable:write",
                "time_slots:read",
                "time_slots:write",
                "exams:read",
                "exams:write",
                "exam_schedules:read",
                "exam_schedules:write",
                "online_exams:read",
                "online_exams:write",
                "marks:read",
                "marks:write",
                "results:read",
                "grades:read",
                "grades:write",
                "fee_structures:read",
                "fee_structures:write",
                "fee_payments:read",
                "fee_payments:write",
                "fee_dues:read",
                "fee_dues:write",
                "discounts:read",
                "discounts:write",
                "notices:read",
                "notices:write",
                "notifications:read",
                "notifications:write",
                "messages:read",
                "messages:write",
                "communication_logs:read",
                "communication_logs:write",
                "library_books:read",
                "library_books:write",
                "library_issues:read",
                "library_issues:write",
                "transport_vehicles:read",
                "transport_vehicles:write",
                "transport_routes:read",
                "transport_routes:write",
                "transport_stops:read",
                "transport_stops:write",
                "transport_assignments:read",
                "transport_assignments:write",
                "reports:read",
                "analytics:read",
                "parent_portal:read",
                "parent_portal:write",
                "documents:read",
                "documents:write",
                "certificates:read",
                "certificates:write",
                "events:read",
                "events:write",
                "holidays:read",
                "holidays:write",
                "settings:read",
                "settings:write",
                "audit_logs:read",
                "backup:read",
                "backup:write",
                "import_export:read",
                "import_export:write",
                "batch:write",
                "discipline:read",
                "discipline:write",
                "appointments:read",
                "appointments:write",
                "logistics:read",
                "logistics:write",
            ]
        },
        "teacher": {
            "allow": [
                "schools:read",
                "academic:read",
                "students:read",
                "enrollments:read",
                "staff:read",
                "teacher_assignments:read",
                "attendance:read",
                "leaves:read",
                "time_slots:read",
                "timetable:read",
                "exams:read",
                "exam_schedules:read",
                "online_exams:read",
                "online_exams:write",
                "marks:read",
                "results:read",
                "grades:read",
                "fee_structures:read",
                "fee_payments:read",
                "fee_dues:read",
                "discounts:read",
                "notices:read",
                "notifications:read",
                "messages:read",
                "communication_logs:read",
                "library_books:read",
                "library_issues:read",
                "transport_vehicles:read",
                "transport_routes:read",
                "transport_stops:read",
                "transport_assignments:read",
                "reports:read",
                "analytics:read",
                "parent_portal:read",
                "documents:read",
                "certificates:read",
                "events:read",
                "holidays:read",
                "settings:read",
                "audit_logs:read",
                "backup:read",
                "import_export:read",
                "batch:write",
                "discipline:read",
                "discipline:write",
                "appointments:read",
                "appointments:write",
            ]
        },
        "student": {
            "allow": [
                "schools:read",
                "notices:read",
                "notifications:read",
                "messages:read",
                "messages:write",
                "analytics:read",
                "parent_portal:read",
                "documents:read",
                "events:read",
                "holidays:read",
                "import_export:read",
                "online_exams:take",
            ]
        },
        "parent": {
            "allow": [
                "schools:read",
                "notices:read",
                "notifications:read",
                "messages:read",
                "messages:write",
                "analytics:read",
                "parent_portal:read",
                "parent_portal:write",
                "documents:read",
                "events:read",
                "holidays:read",
                "import_export:read",
                "appointments:read",
                "appointments:write",
                "discipline:read",
            ]
        },
    }
    existing = {
        r.name: r for r in db.execute(select(Role).where(Role.name.in_(list(seed_roles.keys())))).scalars().all()
    }
    for name, permissions in seed_roles.items():
        if name not in existing:
            db.add(Role(name=name, permissions=permissions))
            continue
        role = existing[name]
        current_allow = set(((role.permissions or {}).get("allow", [])) if isinstance(role.permissions, dict) else [])
        seed_allow = set(((permissions or {}).get("allow", [])) if isinstance(permissions, dict) else [])
        role.permissions = {"allow": sorted(current_allow | seed_allow)}
    db.flush()


def ensure_default_exam_types(db: Session) -> None:
    bind = db.get_bind()
    if not inspect(bind).has_table("exam_type_master"):
        return

    now = datetime.now(timezone.utc)
    seed = [
        {
            "code": "class_test",
            "label": "Class Test",
            "frequency_hint": "Weekly",
            "weight_min": 5,
            "weight_max": 15,
        },
        {
            "code": "quiz",
            "label": "Quiz",
            "frequency_hint": "Weekly (short assessment)",
            "weight_min": 5,
            "weight_max": 10,
        },
        {
            "code": "assignment",
            "label": "Assignment",
            "frequency_hint": "Monthly",
            "weight_min": 5,
            "weight_max": 15,
        },
        {
            "code": "monthly_test",
            "label": "Monthly Test",
            "frequency_hint": "Monthly",
            "weight_min": 10,
            "weight_max": 20,
        },
        {
            "code": "mid_term",
            "label": "Mid-Term",
            "frequency_hint": "Once per term",
            "weight_min": 30,
            "weight_max": 40,
        },
        {
            "code": "final",
            "label": "Final",
            "frequency_hint": "Once per academic year",
            "weight_min": 40,
            "weight_max": 60,
        },
        {
            "code": "model_mock",
            "label": "Model / Mock",
            "frequency_hint": "Before final/public",
            "weight_min": 0,
            "weight_max": 0,
        },
        {
            "code": "board_public",
            "label": "Board / Public",
            "frequency_hint": "SSC/HSC/O/A-Level",
            "weight_min": 0,
            "weight_max": 0,
        },
        {
            "code": "practical_viva",
            "label": "Practical/Viva",
            "frequency_hint": "With term exams",
            "weight_min": 20,
            "weight_max": 30,
        },
        {
            "code": "oral_viva",
            "label": "Oral / Viva",
            "frequency_hint": "As needed / with terms",
            "weight_min": 0,
            "weight_max": 0,
        },
    ]
    codes = [s["code"] for s in seed]
    existing = {r.code: r for r in db.execute(select(ExamTypeMaster).where(ExamTypeMaster.code.in_(codes))).scalars().all()}
    for row in seed:
        found = existing.get(row["code"])
        if not found:
            db.add(
                ExamTypeMaster(
                    code=row["code"],
                    label=row["label"],
                    frequency_hint=row["frequency_hint"],
                    weight_min=row["weight_min"],
                    weight_max=row["weight_max"],
                    is_active=True,
                    created_at=now,
                )
            )
            continue
        found.label = row["label"]
        found.frequency_hint = row["frequency_hint"]
        found.weight_min = row["weight_min"]
        found.weight_max = row["weight_max"]
        found.is_active = True
    db.flush()


def ensure_default_admin(db: Session) -> None:
    email = "admin@kuskul.com"
    password = "password123"
    school_code = "KUSKUL_DEMO"
    school_name = "KusKul Demo School"

    ensure_default_roles(db)
    ensure_default_exam_types(db)

    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user:
        return

    now = datetime.now(timezone.utc)
    user = User(
        email=email,
        password_hash=hash_password(password),
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(user)

    school = db.scalar(select(School).where(School.code == school_code))
    if not school:
        school = School(name=school_name, code=school_code, is_active=True, created_at=now)
        db.add(school)

    role = db.scalar(select(Role).where(Role.name == "admin"))
    db.flush()
    if role:
        membership = Membership(user_id=user.id, school_id=school.id, role_id=role.id, is_active=True, created_at=now)
        db.add(membership)
