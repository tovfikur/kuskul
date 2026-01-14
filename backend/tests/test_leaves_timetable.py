import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_lt_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"LT School {suffix}",
            "school_code": f"LT{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_leaves_apply_list_and_approve(client):
    headers = _bootstrap(client)

    applied = client.post(
        "/api/v1/leaves/apply",
        headers=headers,
        json={"user_type": "staff", "start_date": "2024-03-01", "end_date": "2024-03-02", "reason": "Sick"},
    )
    assert applied.status_code == 200
    leave_id = applied.json()["id"]

    mine = client.get("/api/v1/leaves/my-leaves", headers=headers)
    assert mine.status_code == 200
    assert any(l["id"] == leave_id for l in mine.json())

    pending = client.get("/api/v1/leaves/pending", headers=headers)
    assert pending.status_code == 200
    assert any(l["id"] == leave_id for l in pending.json())

    approve = client.patch(f"/api/v1/leaves/{leave_id}/approve", headers=headers)
    assert approve.status_code == 200

    all_leaves = client.get("/api/v1/leaves?status=approved", headers=headers)
    assert all_leaves.status_code == 200
    assert any(l["id"] == leave_id for l in all_leaves.json())


def test_time_slots_and_timetable_basic_flow(client):
    headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    cls = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 4", "numeric_value": 4})
    assert cls.status_code == 200
    class_id = cls.json()["id"]

    sec = client.post("/api/v1/sections", headers=headers, json={"class_id": class_id, "name": "D", "capacity": 20})
    assert sec.status_code == 200
    section_id = sec.json()["id"]

    staff = client.post("/api/v1/staff", headers=headers, json={"full_name": "Teacher TT", "designation": "teacher"})
    assert staff.status_code == 200
    staff_id = staff.json()["id"]

    subj = client.post("/api/v1/subjects", headers=headers, json={"name": "Math", "code": "M4"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    slot = client.post(
        "/api/v1/time-slots",
        headers=headers,
        json={"name": "P1", "start_time": "09:00:00", "end_time": "09:45:00", "is_active": True},
    )
    assert slot.status_code == 200
    slot_id = slot.json()["id"]

    entry = client.post(
        "/api/v1/timetable",
        headers=headers,
        json={
            "academic_year_id": year_id,
            "section_id": section_id,
            "staff_id": staff_id,
            "subject_id": subject_id,
            "time_slot_id": slot_id,
            "day_of_week": 1,
            "room": "201",
        },
    )
    assert entry.status_code == 200
    entry_id = entry.json()["id"]

    listed = client.get(f"/api/v1/timetable?section_id={section_id}", headers=headers)
    assert listed.status_code == 200
    assert any(t["id"] == entry_id for t in listed.json())

    section_tt = client.get(f"/api/v1/timetable/section/{section_id}", headers=headers)
    assert section_tt.status_code == 200
    assert any(t["id"] == entry_id for t in section_tt.json())

    teacher_tt = client.get(f"/api/v1/timetable/teacher/{staff_id}", headers=headers)
    assert teacher_tt.status_code == 200
    assert any(t["id"] == entry_id for t in teacher_tt.json())

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Tim", "last_name": "Student"})
    assert student.status_code == 200
    student_id = student.json()["id"]

    enr = client.post(
        "/api/v1/enrollments",
        headers=headers,
        json={"student_id": student_id, "academic_year_id": year_id, "class_id": class_id, "section_id": section_id},
    )
    assert enr.status_code == 200

    student_tt = client.get(f"/api/v1/timetable/student/{student_id}", headers=headers)
    assert student_tt.status_code == 200
    assert any(t["id"] == entry_id for t in student_tt.json())

