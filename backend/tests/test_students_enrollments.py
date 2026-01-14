import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_stu_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Student School {suffix}",
            "school_code": f"STU{suffix[:5].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}
    return headers


def test_students_crud_and_enrollment_flow(client):
    headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    cls = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 2", "numeric_value": 2})
    assert cls.status_code == 200
    class_id = cls.json()["id"]

    sec = client.post("/api/v1/sections", headers=headers, json={"class_id": class_id, "name": "B", "capacity": 30})
    assert sec.status_code == 200
    section_id = sec.json()["id"]

    created = client.post(
        "/api/v1/students",
        headers=headers,
        json={"first_name": "John", "last_name": "Doe", "admission_no": "ADM-001", "gender": "male"},
    )
    assert created.status_code == 200
    student_id = created.json()["id"]

    listed = client.get("/api/v1/students?page=1&limit=20&search=ADM", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    updated = client.put(f"/api/v1/students/{student_id}", headers=headers, json={"status": "inactive"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "inactive"

    enr = client.post(
        "/api/v1/enrollments",
        headers=headers,
        json={
            "student_id": student_id,
            "academic_year_id": year_id,
            "class_id": class_id,
            "section_id": section_id,
            "roll_number": 5,
        },
    )
    assert enr.status_code == 200
    enrollment_id = enr.json()["id"]

    enr_list = client.get(f"/api/v1/enrollments?class_id={class_id}", headers=headers)
    assert enr_list.status_code == 200
    assert any(x["id"] == enrollment_id for x in enr_list.json())

    promote = client.patch(f"/api/v1/enrollments/{enrollment_id}/promote", headers=headers)
    assert promote.status_code == 200

    got = client.get(f"/api/v1/enrollments/{enrollment_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["status"] == "promoted"

