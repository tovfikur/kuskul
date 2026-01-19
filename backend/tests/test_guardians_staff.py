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
        json={
            "full_name": "Teacher One",
            "employee_id": "EMP-001",
            "designation": "teacher",
            "department": "science",
            "status": "active",
            "emergency_contact_name": "Emergency Person",
            "emergency_contact_phone": "999",
            "emergency_contact_relation": "spouse",
        },
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


def test_staff_qualification_performance_document_and_qr(client):
    headers = _bootstrap(client)

    created = client.post(
        "/api/v1/staff",
        headers=headers,
        json={"full_name": "Staff Two", "designation": "admin", "department": "office", "status": "active"},
    )
    assert created.status_code == 200
    staff_id = created.json()["id"]

    q = client.post(
        f"/api/v1/staff/{staff_id}/qualifications",
        headers=headers,
        json={"title": "B.Ed", "institution": "Uni"},
    )
    assert q.status_code == 200
    q_id = q.json()["id"]

    q_list = client.get(f"/api/v1/staff/{staff_id}/qualifications", headers=headers)
    assert q_list.status_code == 200
    assert any(x["id"] == q_id for x in q_list.json())

    perf = client.post(
        f"/api/v1/staff/{staff_id}/performance",
        headers=headers,
        json={"rating": 4, "summary": "Good performance"},
    )
    assert perf.status_code == 200
    perf_id = perf.json()["id"]

    perf_list = client.get(f"/api/v1/staff/{staff_id}/performance", headers=headers)
    assert perf_list.status_code == 200
    assert any(x["id"] == perf_id for x in perf_list.json())

    upload = client.post(
        f"/api/v1/staff/{staff_id}/documents/upload",
        headers=headers,
        files={"file": ("contract.txt", b"hello", "text/plain")},
    )
    assert upload.status_code == 200
    doc_id = upload.json()["id"]

    docs = client.get(f"/api/v1/staff/{staff_id}/documents", headers=headers)
    assert docs.status_code == 200
    assert any(x["id"] == doc_id for x in docs.json())

    qr = client.get(f"/api/v1/staff/{staff_id}/qr", headers=headers)
    assert qr.status_code == 200
    assert "image/svg+xml" in (qr.headers.get("content-type") or "")

    del_q = client.delete(f"/api/v1/staff/{staff_id}/qualifications/{q_id}", headers=headers)
    assert del_q.status_code == 200

    del_perf = client.delete(f"/api/v1/staff/{staff_id}/performance/{perf_id}", headers=headers)
    assert del_perf.status_code == 200

    del_doc = client.delete(f"/api/v1/staff/{staff_id}/documents/{doc_id}", headers=headers)
    assert del_doc.status_code == 200
