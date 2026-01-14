import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_batch_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Batch School {suffix}",
            "school_code": f"BH{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_batch_transfer_and_promote(client):
    headers = _bootstrap(client)

    year1 = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year1.status_code == 200
    year1_id = year1.json()["id"]

    year2 = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2025", "start_date": "2025-01-01", "end_date": "2025-12-31", "is_current": False},
    )
    assert year2.status_code == 200
    year2_id = year2.json()["id"]

    cls1 = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 1", "numeric_value": 1})
    assert cls1.status_code == 200
    cls1_id = cls1.json()["id"]

    cls2 = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 2", "numeric_value": 2})
    assert cls2.status_code == 200
    cls2_id = cls2.json()["id"]

    sec1 = client.post("/api/v1/sections", headers=headers, json={"class_id": cls1_id, "name": "A", "capacity": 30})
    assert sec1.status_code == 200
    sec1_id = sec1.json()["id"]

    sec2 = client.post("/api/v1/sections", headers=headers, json={"class_id": cls1_id, "name": "B", "capacity": 30})
    assert sec2.status_code == 200
    sec2_id = sec2.json()["id"]

    sec_next = client.post("/api/v1/sections", headers=headers, json={"class_id": cls2_id, "name": "A", "capacity": 30})
    assert sec_next.status_code == 200
    sec_next_id = sec_next.json()["id"]

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Batch", "last_name": "Student"})
    assert student.status_code == 200
    student_id = student.json()["id"]

    enr = client.post(
        "/api/v1/enrollments",
        headers=headers,
        json={"student_id": student_id, "academic_year_id": year1_id, "class_id": cls1_id, "section_id": sec1_id},
    )
    assert enr.status_code == 200
    enrollment_id = enr.json()["id"]

    transfer = client.post(
        "/api/v1/batch/students/transfer",
        headers=headers,
        json={"enrollment_ids": [enrollment_id], "new_section_id": sec2_id},
    )
    assert transfer.status_code == 200
    assert transfer.json()["updated"] == 1

    after = client.get(f"/api/v1/enrollments/{enrollment_id}", headers=headers)
    assert after.status_code == 200
    assert after.json()["section_id"] == sec2_id

    promote = client.post(
        "/api/v1/batch/students/promote",
        headers=headers,
        json={
            "enrollment_ids": [enrollment_id],
            "new_academic_year_id": year2_id,
            "new_class_id": cls2_id,
            "new_section_id": sec_next_id,
        },
    )
    assert promote.status_code == 200
    assert promote.json()["created"] == 1

    my_enrs = client.get(f"/api/v1/enrollments?student_id={student_id}", headers=headers)
    assert my_enrs.status_code == 200
    assert len(my_enrs.json()) >= 2

