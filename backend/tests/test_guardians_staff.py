import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_gs_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"GS School {suffix}",
            "school_code": f"GS{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_guardian_crud_and_link_to_student(client):
    headers = _bootstrap(client)

    student = client.post(
        "/api/v1/students",
        headers=headers,
        json={"first_name": "Alice", "last_name": "Student", "admission_no": "ADM-G1"},
    )
    assert student.status_code == 200
    student_id = student.json()["id"]

    guardian = client.post(
        "/api/v1/guardians",
        headers=headers,
        json={"full_name": "Parent One", "phone": "123", "email": "parent1@example.com"},
    )
    assert guardian.status_code == 200
    guardian_id = guardian.json()["id"]

    link = client.post(f"/api/v1/students/{student_id}/guardians", headers=headers, json={"guardian_id": guardian_id})
    assert link.status_code == 200

    student_guardians = client.get(f"/api/v1/students/{student_id}/guardians", headers=headers)
    assert student_guardians.status_code == 200
    assert any(g["id"] == guardian_id for g in student_guardians.json())

    guardian_students = client.get(f"/api/v1/guardians/{guardian_id}/students", headers=headers)
    assert guardian_students.status_code == 200
    assert any(s["id"] == student_id for s in guardian_students.json())


def test_staff_crud_and_list_filters(client):
    headers = _bootstrap(client)

    created = client.post(
        "/api/v1/staff",
        headers=headers,
        json={"full_name": "Teacher One", "designation": "teacher", "department": "science", "status": "active"},
    )
    assert created.status_code == 200
    staff_id = created.json()["id"]

    listed = client.get("/api/v1/staff?page=1&limit=20&search=Teacher", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    got = client.get(f"/api/v1/staff/{staff_id}", headers=headers)
    assert got.status_code == 200

    updated = client.put(f"/api/v1/staff/{staff_id}", headers=headers, json={"status": "inactive"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "inactive"

