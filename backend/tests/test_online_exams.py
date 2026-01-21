import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_online_exam_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Online Exam School {suffix}",
            "school_code": f"OE{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_online_exam_submit_creates_marks_and_results(client):
    admin_headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=admin_headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    cls = client.post("/api/v1/classes", headers=admin_headers, json={"name": "Grade 5", "numeric_value": 5})
    assert cls.status_code == 200
    class_id = cls.json()["id"]

    subj = client.post("/api/v1/subjects", headers=admin_headers, json={"name": "Math", "code": "MTH"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    exam = client.post(
        "/api/v1/exams",
        headers=admin_headers,
        json={"academic_year_id": year_id, "name": "Unit Test Exam", "exam_type": "unit", "start_date": "2024-05-01", "end_date": "2024-05-10"},
    )
    assert exam.status_code == 200
    exam_id = exam.json()["id"]

    sched = client.post(
        "/api/v1/exam-schedules",
        headers=admin_headers,
        json={
            "exam_id": exam_id,
            "class_id": class_id,
            "subject_id": subject_id,
            "exam_date": "2024-05-02",
            "max_marks": 100,
        },
    )
    assert sched.status_code == 200
    schedule_id = sched.json()["id"]

    publish = client.post(f"/api/v1/exams/{exam_id}/publish", headers=admin_headers)
    assert publish.status_code == 200

    student_user = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={"email": f"student_{uuid.uuid4().hex[:8]}@example.com", "password": "supersecurepassword", "role_name": "student"},
    )
    assert student_user.status_code == 200
    student_email = student_user.json()["email"]
    student_user_id = student_user.json()["id"]

    student = client.post(
        "/api/v1/students",
        headers=admin_headers,
        json={"first_name": "Sam", "last_name": "Student", "user_id": student_user_id},
    )
    assert student.status_code == 200
    student_id = student.json()["id"]

    enroll = client.post(
        "/api/v1/enrollments",
        headers=admin_headers,
        json={"student_id": student_id, "academic_year_id": year_id, "class_id": class_id, "status": "active"},
    )
    assert enroll.status_code == 200

    cat = client.post("/api/v1/online-exams/question-bank/categories", headers=admin_headers, json={"name": "Basics"})
    assert cat.status_code == 200
    category_id = cat.json()["id"]

    q = client.post(
        "/api/v1/online-exams/question-bank/questions",
        headers=admin_headers,
        json={
            "category_id": category_id,
            "subject_id": subject_id,
            "question_type": "mcq",
            "prompt": "2+2=?",
            "options": {"choices": ["3", "4", "5"]},
            "correct_answer": {"choice": "4"},
            "points": 1,
            "is_active": True,
        },
    )
    assert q.status_code == 200
    question_id = q.json()["id"]

    cfg = client.post(
        "/api/v1/online-exams/configs",
        headers=admin_headers,
        json={"exam_schedule_id": schedule_id, "duration_minutes": 30, "attempt_limit": 1},
    )
    assert cfg.status_code == 200
    config_id = cfg.json()["id"]

    added = client.post(
        f"/api/v1/online-exams/configs/{config_id}/questions",
        headers=admin_headers,
        json={"items": [{"question_id": question_id}]},
    )
    assert added.status_code == 200
    assert added.json()["created"] == 1

    login = client.post("/api/v1/auth/login", json={"email": student_email, "password": "supersecurepassword"})
    assert login.status_code == 200
    student_headers = {"Authorization": f"Bearer {login.json()['access_token']}", "X-School-Id": admin_headers["X-School-Id"]}

    started = client.post(f"/api/v1/online-exams/configs/{config_id}/start", headers=student_headers)
    assert started.status_code == 200
    attempt_id = started.json()["attempt"]["id"]
    assert started.json()["questions"][0]["id"] == question_id

    saved = client.put(
        f"/api/v1/online-exams/attempts/{attempt_id}/answers",
        headers=student_headers,
        json=[{"question_id": question_id, "answer": {"choice": "4"}}],
    )
    assert saved.status_code == 200

    submitted = client.post(f"/api/v1/online-exams/attempts/{attempt_id}/submit", headers=student_headers)
    assert submitted.status_code == 200
    assert submitted.json()["attempt"]["status"] == "submitted"
    assert submitted.json()["attempt"]["percentage"] == 100.0

    marks = client.get(f"/api/v1/marks?student_id={student_id}", headers=admin_headers)
    assert marks.status_code == 200
    assert len(marks.json()) == 1
    assert marks.json()[0]["marks_obtained"] == 100

    results = client.get(f"/api/v1/results?exam_id={exam_id}", headers=admin_headers)
    assert results.status_code == 200
    assert len(results.json()) == 1
    assert results.json()[0]["obtained_marks"] == 100

