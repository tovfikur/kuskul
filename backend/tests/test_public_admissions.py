import json
import uuid
from datetime import datetime, timezone


def _bootstrap(client):
    from sqlalchemy import select

    from app.core.security import create_access_token, hash_password
    from app.core.seed import ensure_default_roles
    from app.db.session import SessionLocal
    from app.models.membership import Membership
    from app.models.role import Role
    from app.models.school import School
    from app.models.tenant import Tenant
    from app.models.user import User

    db = SessionLocal()
    try:
        suffix = uuid.uuid4().hex[:8]
        now = datetime.now(timezone.utc)
        tenant = Tenant(
            name=f"Admission Tenant {suffix}",
            subdomain=f"admission-{suffix}",
            status="active",
            created_at=now,
            updated_at=now,
        )
        db.add(tenant)
        db.flush()

        ensure_default_roles(db)
        school = School(
            tenant_id=tenant.id,
            name=f"Admission School {suffix}",
            code=f"ADM{suffix[:5].upper()}",
            is_active=True,
            created_at=now,
        )
        db.add(school)
        db.flush()

        user = User(
            tenant_id=tenant.id,
            email=f"admissions_{suffix}@example.com",
            full_name="Admissions Admin",
            password_hash=hash_password("supersecurepassword"),
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.flush()

        role = db.scalar(select(Role).where(Role.name == "admin"))
        db.add(
            Membership(
                user_id=user.id,
                school_id=school.id,
                role_id=role.id,
                is_active=True,
                created_at=now,
            )
        )
        db.commit()

        token = create_access_token(subject=str(user.id), claims={"email": user.email})
        headers = {
            "Authorization": f"Bearer {token}",
            "X-School-Id": str(school.id),
            "X-Tenant-ID": str(tenant.id),
        }
        return headers, school.id
    finally:
        db.close()


def _create_academic_context(client, headers):
    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={
            "name": "2026-2027",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "is_current": True,
        },
    )
    assert year.status_code == 200
    classroom = client.post(
        "/api/v1/classes",
        headers=headers,
        json={"name": "Grade 4", "numeric_value": 4},
    )
    assert classroom.status_code == 200
    section = client.post(
        "/api/v1/sections",
        headers=headers,
        json={"class_id": classroom.json()["id"], "name": "A", "capacity": 30},
    )
    assert section.status_code == 200
    return year.json()["id"], classroom.json()["id"], section.json()["id"]


def _application_payload(class_id, section_id):
    return {
        "first_name": "Amina",
        "last_name": "Rahman",
        "gender": "female",
        "date_of_birth": "2015-05-12",
        "nationality": "Bangladeshi",
        "religion": "Islam",
        "blood_group": "O+",
        "present_address": "12 School Road",
        "city": "Dhaka",
        "postal_code": "1207",
        "emergency_contact_name": "Uncle Karim",
        "emergency_contact_phone": "01700000001",
        "class_id": class_id,
        "section_id": section_id,
        "medium": "English",
        "shift": "Morning",
        "previous_school_name": "Little Stars",
        "previous_class": "Grade 3",
        "father": {
            "full_name": "Rafiq Rahman",
            "phone": "01700000002",
            "email": "rafiq@example.com",
            "occupation": "Engineer",
            "id_number": "NID-123",
        },
        "mother": {
            "full_name": "Salma Rahman",
            "phone": "01700000003",
            "occupation": "Teacher",
        },
        "declaration_accepted": True,
    }


def _files():
    return {
        "student_photo": ("student.png", b"fake-image-bytes", "image/png"),
        "birth_certificate": ("birth.pdf", b"%PDF-1.4 fake", "application/pdf"),
        "transfer_certificate": ("transfer.pdf", b"%PDF-1.4 fake", "application/pdf"),
    }


def test_public_admission_flow(client):
    headers, school_id = _bootstrap(client)
    _, class_id, section_id = _create_academic_context(client, headers)

    link = client.get("/api/v1/admissions/form-link", headers=headers)
    assert link.status_code == 200
    token = link.json()["token"]
    assert link.json()["enabled"] is True

    qr = client.get(
        "/api/v1/admissions/form-link/qr",
        headers=headers,
        params={"target": f"https://example.com/apply/{token}"},
    )
    assert qr.status_code == 200
    assert qr.headers["content-type"].startswith("image/svg+xml")
    assert "<svg" in qr.text
    assert (
        client.get(
            "/api/v1/admissions/form-link/qr",
            headers=headers,
            params={"target": "javascript:alert(1)"},
        ).status_code
        == 400
    )

    config = client.get(f"/api/v1/public/admissions/{token}")
    assert config.status_code == 200
    body = config.json()
    assert body["admission_open"] is True
    assert body["classes"][0]["sections"][0]["id"] == section_id

    submitted = client.post(
        f"/api/v1/public/admissions/{token}/apply",
        data={"payload": json.dumps(_application_payload(class_id, section_id))},
        files=_files(),
    )
    assert submitted.status_code == 201
    reference = submitted.json()["reference"]
    assert reference

    students = client.get("/api/v1/students?page=1&limit=50&search=Amina", headers=headers)
    assert students.status_code == 200
    items = students.json()["items"]
    assert len(items) == 1
    student = items[0]
    assert student["admission_status"] == "pending"
    assert student["status"] == "inactive"
    assert student["admission_no"] == reference
    assert student["photo_url"]

    guardians = client.get(f"/api/v1/students/{student['id']}/guardians", headers=headers)
    assert guardians.status_code == 200
    assert {row["relation"] for row in guardians.json()} == {"father", "mother"}

    documents = client.get(f"/api/v1/students/{student['id']}/documents", headers=headers)
    assert documents.status_code == 200
    assert {row["entity_type"] for row in documents.json()} == {
        "student:birth_certificate",
        "student:transfer_certificate",
    }
    assert all(row["uploaded_by_user_id"] is None for row in documents.json())

    enrollments = client.get(
        f"/api/v1/enrollments/by-students?student_ids={student['id']}", headers=headers
    )
    assert enrollments.status_code == 200
    assert enrollments.json()[0]["class_id"] == class_id
    assert enrollments.json()[0]["section_id"] == section_id

    disabled = client.patch(
        "/api/v1/admissions/form-link", headers=headers, json={"enabled": False}
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False
    assert client.get(f"/api/v1/public/admissions/{token}").status_code == 404

    enabled = client.patch(
        "/api/v1/admissions/form-link", headers=headers, json={"enabled": True}
    )
    assert enabled.status_code == 200
    assert client.get(f"/api/v1/public/admissions/{token}").status_code == 200

    rotated = client.post("/api/v1/admissions/form-link/rotate", headers=headers)
    assert rotated.status_code == 200
    new_token = rotated.json()["token"]
    assert new_token != token
    assert client.get(f"/api/v1/public/admissions/{token}").status_code == 404
    assert client.get(f"/api/v1/public/admissions/{new_token}").status_code == 200


def test_public_admission_validation(client):
    headers, _ = _bootstrap(client)
    _, class_id, section_id = _create_academic_context(client, headers)
    token = client.get("/api/v1/admissions/form-link", headers=headers).json()["token"]

    payload = _application_payload(class_id, section_id)
    payload["declaration_accepted"] = False
    rejected = client.post(
        f"/api/v1/public/admissions/{token}/apply",
        data={"payload": json.dumps(payload)},
    )
    assert rejected.status_code == 400

    payload = _application_payload(class_id, section_id)
    bad_file = client.post(
        f"/api/v1/public/admissions/{token}/apply",
        data={"payload": json.dumps(payload)},
        files={"student_photo": ("student.exe", b"nope", "application/octet-stream")},
    )
    assert bad_file.status_code == 400

    payload = _application_payload(class_id, section_id)
    payload["mother"]["phone"] = payload["father"]["phone"]
    shared_contact = client.post(
        f"/api/v1/public/admissions/{token}/apply",
        data={"payload": json.dumps(payload)},
    )
    assert shared_contact.status_code == 201

    assert client.get("/api/v1/public/admissions/not-a-token").status_code == 404
