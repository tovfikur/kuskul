import uuid


def _bootstrap_admin_and_school(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_acad_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Academic School {suffix}",
            "school_code": f"ACAD{suffix[:4].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_academic_years_crud_and_set_current(client):
    token, school_id = _bootstrap_admin_and_school(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    created1 = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert created1.status_code == 200
    y1 = created1.json()

    created2 = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2025-2026", "start_date": "2025-01-01", "end_date": "2025-12-31", "is_current": False},
    )
    assert created2.status_code == 200
    y2 = created2.json()

    current = client.get("/api/v1/academic-years/current", headers=headers)
    assert current.status_code == 200
    assert current.json()["id"] == y1["id"]

    set_current = client.patch(f"/api/v1/academic-years/{y2['id']}/set-current", headers=headers)
    assert set_current.status_code == 200
    assert set_current.json()["id"] == y2["id"]

    current2 = client.get("/api/v1/academic-years/current", headers=headers)
    assert current2.status_code == 200
    assert current2.json()["id"] == y2["id"]


def test_classes_sections_subjects_and_assignment(client):
    token, school_id = _bootstrap_admin_and_school(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    c = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 1", "numeric_value": 1})
    assert c.status_code == 200
    class_id = c.json()["id"]

    s = client.post(
        "/api/v1/sections",
        headers=headers,
        json={"class_id": class_id, "name": "A", "capacity": 35, "room_number": "101"},
    )
    assert s.status_code == 200
    section_id = s.json()["id"]

    sections = client.get(f"/api/v1/classes/{class_id}/sections", headers=headers)
    assert sections.status_code == 200
    assert any(x["id"] == section_id for x in sections.json())

    subj = client.post("/api/v1/subjects", headers=headers, json={"name": "Mathematics", "code": "MATH"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    assign = client.post(
        f"/api/v1/subjects/{subject_id}/assign-to-class", headers=headers, json={"class_id": class_id}
    )
    assert assign.status_code == 200

    class_subjects = client.get(f"/api/v1/classes/{class_id}/subjects", headers=headers)
    assert class_subjects.status_code == 200
    assert any(x["id"] == subject_id for x in class_subjects.json())

    remove = client.delete(f"/api/v1/subjects/{subject_id}/remove-from-class/{class_id}", headers=headers)
    assert remove.status_code == 200
