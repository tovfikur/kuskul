import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_exam_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Exam School {suffix}",
            "school_code": f"EX{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_exam_schedule_marks_results_flow(client):
    headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    cls = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 5", "numeric_value": 5})
    assert cls.status_code == 200
    class_id = cls.json()["id"]

    subj = client.post("/api/v1/subjects", headers=headers, json={"name": "English", "code": "ENG"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    grade_a = client.post("/api/v1/grades", headers=headers, json={"name": "A", "min_percentage": 90, "max_percentage": 100})
    assert grade_a.status_code == 200

    exam = client.post(
        "/api/v1/exams",
        headers=headers,
        json={"academic_year_id": year_id, "name": "Midterm", "exam_type": "midterm", "start_date": "2024-05-01", "end_date": "2024-05-10"},
    )
    assert exam.status_code == 200
    exam_id = exam.json()["id"]

    sched = client.post(
        "/api/v1/exam-schedules",
        headers=headers,
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

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Eva", "last_name": "Learner"})
    assert student.status_code == 200
    student_id = student.json()["id"]

    enter = client.post(
        "/api/v1/marks/enter",
        headers=headers,
        json={"exam_schedule_id": schedule_id, "items": [{"student_id": student_id, "marks_obtained": 95, "is_absent": False}]},
    )
    assert enter.status_code == 200
    assert enter.json()[0]["student_id"] == student_id

    results = client.get(f"/api/v1/results?exam_id={exam_id}", headers=headers)
    assert results.status_code == 200
    assert len(results.json()) == 1
    assert results.json()[0]["student_id"] == student_id
    assert results.json()[0]["obtained_marks"] == 95
    assert results.json()[0]["total_marks"] == 100
    assert results.json()[0]["grade_id"] is not None

    publish = client.post(f"/api/v1/exams/{exam_id}/publish", headers=headers)
    assert publish.status_code == 200


def test_exam_types_and_exam_type_code_flow(client):
    headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    types = client.get("/api/v1/exams/types", headers=headers)
    assert types.status_code == 200
    rows = types.json()
    assert isinstance(rows, list)
    assert any(t["code"] == "final" for t in rows)

    created = client.post(
        "/api/v1/exams",
        headers=headers,
        json={
            "academic_year_id": year_id,
            "name": "Final Exam",
            "exam_type_code": "final",
            "start_date": "2024-11-01",
            "end_date": "2024-11-15",
        },
    )
    assert created.status_code == 200
    body = created.json()
    assert body["exam_type_code"] == "final"
    assert body["exam_type"] == "Final"
    assert body["status"] == "draft"
    assert body["included_in_final_result"] is True
    assert body["counts_for_gpa"] is True
    assert body["is_result_editable"] is True

    exam_id = body["id"]
    upd = client.put(
        f"/api/v1/exams/{exam_id}",
        headers=headers,
        json={"status": "scheduled", "weight_percentage": 50, "aggregation_method": "sum"},
    )
    assert upd.status_code == 200
    upd_body = upd.json()
    assert upd_body["status"] == "scheduled"
    assert upd_body["weight_percentage"] == 50
    assert upd_body["aggregation_method"] == "sum"

    publish = client.post(f"/api/v1/exams/{exam_id}/publish", headers=headers)
    assert publish.status_code == 200
    after = client.get(f"/api/v1/exams/{exam_id}", headers=headers)
    assert after.status_code == 200
    after_body = after.json()
    assert after_body["is_published"] is True
    assert after_body["status"] == "published"
    assert after_body["result_publish_date"] is not None

