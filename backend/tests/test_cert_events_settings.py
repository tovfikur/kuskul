import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_ces_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"CES School {suffix}",
            "school_code": f"CS{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_certificates_events_holidays_settings_and_audit_smoke(client):
    token, school_id = _bootstrap(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Cert", "last_name": "Student"})
    assert student.status_code == 200
    student_id = student.json()["id"]

    tpl = client.post(
        "/api/v1/certificates/templates",
        headers=headers,
        json={"template_type": "transfer", "name": "Transfer v1", "content": "Hello {{student}}"},
    )
    assert tpl.status_code == 200

    templates = client.get("/api/v1/certificates/templates", headers=headers)
    assert templates.status_code == 200
    assert any(t["template_type"] == "transfer" for t in templates.json())

    cert = client.post(f"/api/v1/certificates/generate/transfer?student_id={student_id}", headers=headers)
    assert cert.status_code == 200
    assert cert.json()["template_type"] == "transfer"

    ev = client.post(
        "/api/v1/events",
        headers=headers,
        json={"event_type": "holiday", "title": "Sports Day", "start_date": "2024-02-01", "end_date": "2024-02-01", "is_all_day": True},
    )
    assert ev.status_code == 200
    event_id = ev.json()["id"]

    cal = client.get("/api/v1/events/calendar?month=2&year=2024", headers=headers)
    assert cal.status_code == 200
    assert "days" in cal.json()

    got = client.get(f"/api/v1/events/{event_id}", headers=headers)
    assert got.status_code == 200

    hol = client.post(
        "/api/v1/holidays",
        headers=headers,
        json={"holiday_date": "2024-12-25", "name": "Xmas", "holiday_type": "public"},
    )
    assert hol.status_code == 200
    holiday_id = hol.json()["id"]

    hol_list = client.get("/api/v1/holidays?year=2024", headers=headers)
    assert hol_list.status_code == 200
    assert any(h["id"] == holiday_id for h in hol_list.json())

    set1 = client.put("/api/v1/settings/email/configuration", headers=headers, json={"value": "{\"host\":\"smtp\"}"})
    assert set1.status_code == 200

    set2 = client.get("/api/v1/settings/email/configuration", headers=headers)
    assert set2.status_code == 200
    assert set2.json()["key"] == "email.configuration"

    logs = client.get("/api/v1/audit-logs?page=1&limit=10", headers=headers)
    assert logs.status_code == 200
    assert "items" in logs.json()

