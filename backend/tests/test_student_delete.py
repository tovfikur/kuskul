import uuid

import pytest

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.enrollment import Enrollment
from app.models.fee_payment import FeePayment
from app.models.mark import Mark
from app.models.student import Student
from app.models.student_discount import StudentDiscount
from app.models.student_guardian import StudentGuardian
from app.models.teacher_assignment import StudentAttendance
from app.models.transport_assignment import StudentTransportAssignment


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    """Other tests mutate the shared settings singleton (e.g. enable rate
    limiting); make sure student deletion tests are not affected."""
    from app.core.config import settings

    settings.rate_limit_enabled = False
    yield

SAAS_HOST_HEADERS = {"X-Forwarded-Host": "admin.testserver", "X-Tenant-Subdomain": "admin"}


def _bootstrap(client) -> dict:
    suffix = uuid.uuid4().hex[:8]
    subdomain = f"del{suffix[:12]}"

    login = client.post(
        "/api/v1/auth/login",
        headers=SAAS_HOST_HEADERS,
        json={"email": "platform@school.com", "password": "password123"},
    )
    assert login.status_code == 200, login.text
    saas_headers = {
        **SAAS_HOST_HEADERS,
        "Authorization": f"Bearer {login.json()['access_token']}",
    }

    prov = client.post(
        "/api/v1/platform/tenants",
        headers=saas_headers,
        json={
            "name": f"Delete School {suffix}",
            "subdomain": subdomain,
            "admin_email": f"admin_del_{suffix}@example.com",
            "admin_password": "supersecurepassword",
            "school_name": f"Delete School {suffix}",
            "school_code": f"DEL{suffix[:6].upper()}",
        },
    )
    assert prov.status_code == 200, prov.text
    school_id = prov.json()["school_id"]

    login = client.post(
        "/api/v1/auth/login",
        headers={"X-Tenant-Subdomain": subdomain},
        json={
            "email": f"admin_del_{suffix}@example.com",
            "password": "supersecurepassword",
        },
    )
    assert login.status_code == 200, login.text
    return {
        "Authorization": f"Bearer {login.json()['access_token']}",
        "X-Tenant-Subdomain": subdomain,
        "X-School-Id": school_id,
    }


def _create_basics(client, headers):
    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={
            "name": "2024-2025",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "is_current": True,
        },
    )
    assert year.status_code == 200, year.text
    year_id = year.json()["id"]

    cls = client.post(
        "/api/v1/classes",
        headers=headers,
        json={"name": "Grade 2", "numeric_value": 2},
    )
    assert cls.status_code == 200, cls.text
    class_id = cls.json()["id"]

    sec = client.post(
        "/api/v1/sections",
        headers=headers,
        json={"class_id": class_id, "name": "B", "capacity": 30},
    )
    assert sec.status_code == 200, sec.text
    section_id = sec.json()["id"]

    subj = client.post(
        "/api/v1/subjects",
        headers=headers,
        json={"name": "Math", "code": "MATH"},
    )
    assert subj.status_code == 200, subj.text
    assign_subj = client.post(
        "/api/v1/subjects/{subject_id}/assign-to-class".format(subject_id=subj.json()["id"]),
        headers=headers,
        json={"class_id": class_id},
    )
    assert assign_subj.status_code == 200, assign_subj.text

    exam = client.post(
        "/api/v1/exams",
        headers=headers,
        json={
            "academic_year_id": year_id,
            "name": "Mid Term",
            "start_date": "2024-04-01",
            "end_date": "2024-04-05",
        },
    )
    assert exam.status_code == 200, exam.text
    sched = client.post(
        "/api/v1/exam-schedules",
        headers=headers,
        json={
            "exam_id": exam.json()["id"],
            "class_id": class_id,
            "subject_id": subj.json()["id"],
            "exam_date": "2024-04-02",
            "start_time": "09:00",
            "end_time": "10:00",
            "max_marks": 100,
        },
    )
    assert sched.status_code == 200, sched.text

    return {
        "year_id": year_id,
        "class_id": class_id,
        "section_id": section_id,
        "subject_id": subj.json()["id"],
        "exam_schedule_id": sched.json()["id"],
    }

def _create_student(client, headers, name, admission_no):
    created = client.post(
        "/api/v1/students",
        headers=headers,
        json={
            "first_name": name,
            "last_name": "Doe",
            "admission_no": admission_no,
            "gender": "male",
            "status": "active",
        },
    )
    assert created.status_code == 200, created.text
    return created.json()


def _seed_related_data(client, headers, student_id, basics, roll_number=None):
    """Populate every related table that references students.id."""
    roll_number = roll_number or (int(uuid.uuid4().hex[:6], 16) % 900000 + 100000)
    payloads = [
        (
            "enrollment",
            client.post(
                "/api/v1/enrollments",
                headers=headers,
                json={
                    "student_id": student_id,
                    "academic_year_id": basics["year_id"],
                    "class_id": basics["class_id"],
                    "section_id": basics["section_id"],
                    "roll_number": roll_number,
                },
            ),
        ),
        (
            "attendance",
            client.post(
                "/api/v1/attendance/students/mark",
                headers=headers,
                json={
                    "attendance_date": "2024-02-01",
                    "class_id": basics["class_id"],
                    "section_id": basics["section_id"],
                    "items": [{"student_id": student_id, "status": "present"}],
                },
            ),
        ),
        (
            "fee_payment",
            client.post(
                "/api/v1/fee-payments/collect",
                headers=headers,
                json={
                    "student_id": student_id,
                    "academic_year_id": basics["year_id"],
                    "payment_date": "2024-03-01",
                    "amount": 500,
                    "payment_method": "cash",
                },
            ),
        ),
        (
            "document_plain",
            client.post(
                "/api/v1/students/{student_id}/documents".format(student_id=student_id),
                headers=headers,
                files={"file": ("tc.pdf", b"%PDF-1.4 test", "application/pdf")},
            ),
        ),
        (
            "document_typed",
            client.post(
                "/api/v1/students/{student_id}/documents".format(student_id=student_id),
                headers=headers,
                files={"file": ("bc.pdf", b"%PDF-1.4 birth cert", "application/pdf")},
                data={"document_type": "birth_certificate"},
            ),
        ),
        (
            "guardian",
            client.post(
                "/api/v1/guardians",
                headers=headers,
                json={
                    "full_name": "Guardian Parent",
                    "relation": "father",
                    "phone": "01710000000",
                },
            ),
        ),
        (
            "discount",
            client.post(
                "/api/v1/discounts",
                headers=headers,
                json={
                    "name": "Test Discount",
                    "discount_type": "percent",
                    "value": 10,
                },
            ),
        ),
        (
            "transport_route",
            client.post(
                "/api/v1/transport/routes",
                headers=headers,
                json={"name": "Route A", "description": "test"},
            ),
        ),
        (
            "transport_vehicle",
            client.post(
                "/api/v1/transport/vehicles",
                headers=headers,
                json={"name": "Bus 1", "registration_no": "D-A-1"},
            ),
        ),
    ]

    results: dict = {}
    created_ids: dict = {}
    for key, resp in payloads:
        assert resp.status_code in (200, 201), f"{key}: {resp.status_code} {resp.text}"
        body = resp.json()
        results[key] = body
        if isinstance(body, dict) and "id" in body:
            created_ids[key] = body["id"]

    # guardian link
    link = client.post(
        "/api/v1/students/{student_id}/guardians".format(student_id=student_id),
        headers=headers,
        json={"guardian_id": created_ids["guardian"], "relation": "father", "is_primary": True},
    )
    assert link.status_code in (200, 201), link.text

    # discount apply
    apply = client.post(
        "/api/v1/discounts/apply",
        headers=headers,
        json={
            "student_id": student_id,
            "discount_id": created_ids["discount"],
        },
    )
    assert apply.status_code == 200, apply.text

    # transport assignment (route exists; stop optional)
    assign = client.post(
        "/api/v1/transport/student-assignments/assign",
        headers=headers,
        json={
            "student_id": student_id,
            "route_id": created_ids["transport_route"],
            "vehicle_id": created_ids["transport_vehicle"],
            "status": "active",
        },
    )
    assert assign.status_code == 200, assign.text

    # marks against the shared exam schedule
    marks = client.post(
        "/api/v1/marks/enter",
        headers=headers,
        json={
            "exam_schedule_id": basics["exam_schedule_id"],
            "items": [{"student_id": student_id, "marks_obtained": 85, "is_absent": False}],
        },
    )
    assert marks.status_code == 200, marks.text
    return results, created_ids


def _db_orphan_counts(student_id: str) -> dict:
    with SessionLocal() as db:
        return {
            "students": db.query(Student).filter(Student.id == student_id).count(),
            "enrollments": db.query(Enrollment).filter(Enrollment.student_id == student_id).count(),
            "attendance": db.query(StudentAttendance).filter(StudentAttendance.student_id == student_id).count(),
            "marks": db.query(Mark).filter(Mark.student_id == student_id).count(),
            "fee_payments": db.query(FeePayment).filter(FeePayment.student_id == student_id).count(),
            "student_guardians": db.query(StudentGuardian).filter(StudentGuardian.student_id == student_id).count(),
            "student_discounts": db.query(StudentDiscount).filter(StudentDiscount.student_id == student_id).count(),
            "transport_assignments": db.query(StudentTransportAssignment)
            .filter(StudentTransportAssignment.student_id == student_id)
            .count(),
            "documents": db.query(Document)
            .filter(Document.entity_id == student_id, Document.entity_type.like("student%"))
            .count(),
        }


def test_delete_student_removes_all_related_data(client):
    headers = _bootstrap(client)
    basics = _create_basics(client, headers)

    victim = _create_student(client, headers, "DeleteMe", "DEL-001")
    survivor = _create_student(client, headers, "KeepMe", "DEL-002")
    victim_id = victim["id"]
    survivor_id = survivor["id"]

    _seed_related_data(client, headers, victim_id, basics)
    _seed_related_data(client, headers, survivor_id, basics)

    # Every related table must have rows for the victim before deletion
    before = _db_orphan_counts(str(victim_id))
    assert before["enrollments"] >= 1
    assert before["attendance"] >= 1
    assert before["marks"] >= 1
    assert before["fee_payments"] >= 1
    assert before["student_guardians"] >= 1
    assert before["student_discounts"] >= 1
    assert before["transport_assignments"] >= 1
    assert before["documents"] >= 2

    deleted = client.delete(f"/api/v1/students/{victim_id}", headers=headers)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json() == {"status": "ok"}

    # Student no longer retrievable or listable
    got = client.get(f"/api/v1/students/{victim_id}", headers=headers)
    assert got.status_code == 404

    listed = client.get("/api/v1/students?page=1&limit=50", headers=headers)
    assert listed.status_code == 200
    assert all(item["id"] != str(victim_id) for item in listed.json()["items"])

    # Survivor is untouched
    got_survivor = client.get(f"/api/v1/students/{survivor_id}", headers=headers)
    assert got_survivor.status_code == 200

    # No orphan rows remain anywhere
    after = _db_orphan_counts(str(victim_id))
    assert after["students"] == 0, after
    assert after["enrollments"] == 0, after
    assert after["attendance"] == 0, after
    assert after["marks"] == 0, after
    assert after["fee_payments"] == 0, after
    assert after["student_guardians"] == 0, after
    assert after["student_discounts"] == 0, after
    assert after["transport_assignments"] == 0, after
    assert after["documents"] == 0, f"orphan documents remain: {after['documents']}"

    # Survivor related data still intact
    survivor_rows = _db_orphan_counts(str(survivor_id))
    assert survivor_rows["enrollments"] >= 1
    assert survivor_rows["documents"] >= 2


def test_delete_student_returns_404_for_unknown_or_cross_school(client):
    headers = _bootstrap(client)
    random_id = str(uuid.uuid4())

    missing = client.delete(f"/api/v1/students/{random_id}", headers=headers)
    assert missing.status_code == 404

    # A student of another school must not be deletable
    other_headers = _bootstrap(client)
    other_student = _create_student(client, other_headers, "Other", "OTHER-001")
    cross = client.delete(
        f"/api/v1/students/{other_student['id']}",
        headers=headers,
    )
    assert cross.status_code == 404

    # Without students:write permission the delete must be rejected
    no_perm = client.delete(
        f"/api/v1/students/{random_id}",
        headers={**headers, "Authorization": "Bearer invalid-token"},
    )
    assert no_perm.status_code in (401, 403)


def test_reactivate_and_delete_pending_student(client):
    """A pending student (never enrolled) can also be deleted cleanly."""
    headers = _bootstrap(client)
    _create_basics(client, headers)

    pending = _create_student(client, headers, "Pending", "PEND-001")
    deleted = client.delete(f"/api/v1/students/{pending['id']}", headers=headers)
    assert deleted.status_code == 200
    assert _db_orphan_counts(str(pending["id"]))["students"] == 0


def test_enrollment_without_section_is_allowed(client):
    """Section is optional: create and update an enrollment with section_id null."""
    headers = _bootstrap(client)
    basics = _create_basics(client, headers)

    student = _create_student(client, headers, "NoSection", "NOSEC-001")

    created = client.post(
        "/api/v1/enrollments",
        headers=headers,
        json={
            "student_id": student["id"],
            "academic_year_id": basics["year_id"],
            "class_id": basics["class_id"],
            "section_id": None,
            "roll_number": "SN-001",
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["section_id"] is None
    enrollment_id = created.json()["id"]

    # Student appears in the directory listing without a section
    listed = client.get(
        "/api/v1/enrollments?class_id={}".format(basics["class_id"]),
        headers=headers,
    )
    assert listed.status_code == 200
    assert any(x["id"] == enrollment_id for x in listed.json())
    assert listed.json()[0]["section_id"] is None

    # Edit flow: attach a section, then clear it back to null
    with_section = client.put(
        f"/api/v1/enrollments/{enrollment_id}",
        headers=headers,
        json={"section_id": basics["section_id"]},
    )
    assert with_section.status_code == 200
    assert with_section.json()["section_id"] == basics["section_id"]

    cleared = client.put(
        f"/api/v1/enrollments/{enrollment_id}",
        headers=headers,
        json={"section_id": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["section_id"] is None