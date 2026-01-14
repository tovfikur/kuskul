import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_rad_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"RAD School {suffix}",
            "school_code": f"RD{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_reports_analytics_and_documents_smoke(client):
    token, school_id = _bootstrap(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Rep", "last_name": "Student"})
    assert student.status_code == 200

    daily = client.get("/api/v1/reports/attendance/daily?report_date=2024-01-01", headers=headers)
    assert daily.status_code == 200
    assert "students" in daily.json()

    dash = client.get("/api/v1/analytics/dashboard/admin", headers=headers)
    assert dash.status_code == 200
    assert "students" in dash.json()

    upload = client.post(
        "/api/v1/documents/upload?entity_type=student&entity_id=1",
        headers=headers,
        files={"file": ("doc.txt", b"hello", "text/plain")},
    )
    assert upload.status_code == 200
    doc_id = upload.json()["id"]

    listed = client.get("/api/v1/documents?entity_type=student", headers=headers)
    assert listed.status_code == 200
    assert any(d["id"] == doc_id for d in listed.json())

    got = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert got.status_code == 200

    deleted = client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert deleted.status_code == 200

