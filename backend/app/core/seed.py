from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
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


def ensure_default_admin(db: Session) -> None:
    email = "admin@kuskul.com"
    password = "password123"
    school_code = "KUSKUL_DEMO"
    school_name = "KusKul Demo School"

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

    ensure_default_roles(db)
    role = db.scalar(select(Role).where(Role.name == "admin"))
    db.flush()
    if role:
        membership = Membership(user_id=user.id, school_id=school.id, role_id=role.id, is_active=True, created_at=now)
        db.add(membership)
