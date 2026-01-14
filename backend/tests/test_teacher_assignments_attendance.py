import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_ta_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"TA School {suffix}",
            "school_code": f"TA{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_teacher_assignments_and_attendance(client):
    headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    cls = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 3", "numeric_value": 3})
    assert cls.status_code == 200
    class_id = cls.json()["id"]

    sec = client.post("/api/v1/sections", headers=headers, json={"class_id": class_id, "name": "C", "capacity": 25})
    assert sec.status_code == 200
    section_id = sec.json()["id"]

    subj = client.post("/api/v1/subjects", headers=headers, json={"name": "Science", "code": "SCI"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    stf = client.post(
        "/api/v1/staff",
        headers=headers,
        json={"full_name": "Teacher Two", "designation": "teacher", "department": "science", "status": "active"},
    )
    assert stf.status_code == 200
    staff_id = stf.json()["id"]

    assignment = client.post(
        "/api/v1/teacher-assignments",
        headers=headers,
        json={
            "academic_year_id": year_id,
            "staff_id": staff_id,
            "section_id": section_id,
            "subject_id": subject_id,
            "is_active": True,
        },
    )
    assert assignment.status_code == 200
    assignment_id = assignment.json()["id"]

    listed = client.get(f"/api/v1/teacher-assignments?staff_id={staff_id}", headers=headers)
    assert listed.status_code == 200
    assert any(a["id"] == assignment_id for a in listed.json())

    by_staff = client.get(f"/api/v1/staff/{staff_id}/assignments", headers=headers)
    assert by_staff.status_code == 200
    assert any(a["id"] == assignment_id for a in by_staff.json())

    student = client.post(
        "/api/v1/students",
        headers=headers,
        json={"first_name": "Bob", "last_name": "Pupil", "admission_no": "ADM-TA-1", "gender": "male"},
    )
    assert student.status_code == 200
    student_id = student.json()["id"]

    mark = client.post(
        "/api/v1/attendance/students/mark",
        headers=headers,
        json={
            "attendance_date": "2024-02-01",
            "class_id": class_id,
            "section_id": section_id,
            "items": [{"student_id": student_id, "status": "present"}],
        },
    )
    assert mark.status_code == 200

    day = client.get(f"/api/v1/attendance/students/date/2024-02-01?class_id={class_id}", headers=headers)
    assert day.status_code == 200
    assert len(day.json()) == 1
    att_id = day.json()[0]["id"]

    upd = client.put(f"/api/v1/attendance/students/{att_id}?status=absent", headers=headers)
    assert upd.status_code == 200
    assert upd.json()["status"] == "absent"

    student_att = client.get(f"/api/v1/students/{student_id}/attendance", headers=headers)
    assert student_att.status_code == 200
    assert any(x["id"] == att_id for x in student_att.json())

    staff_mark = client.post(
        "/api/v1/attendance/staff/mark",
        headers=headers,
        json={"attendance_date": "2024-02-01", "items": [{"staff_id": staff_id, "status": "present"}]},
    )
    assert staff_mark.status_code == 200

    staff_day = client.get("/api/v1/attendance/staff/date/2024-02-01", headers=headers)
    assert staff_day.status_code == 200
    assert len(staff_day.json()) == 1

    staff_att = client.get(f"/api/v1/staff/{staff_id}/attendance", headers=headers)
    assert staff_att.status_code == 200
    assert len(staff_att.json()) == 1

