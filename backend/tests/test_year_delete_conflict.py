import uuid
import pytest
from datetime import date

def _bootstrap_admin_and_school(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_ay_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Year School {suffix}",
            "school_code": f"YEAR{suffix[:4].upper()}",
        },
    )
    assert register.status_code == 200, register.text
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id

def test_delete_year_conflict_calendar_settings(client):
    token, school_id = _bootstrap_admin_and_school(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    # 1. Create Academic Year
    ay = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert ay.status_code == 200
    year_id = ay.json()["id"]

    # 2. Create Calendar Settings
    # The prefix is /academic-calendar and endpoint is /{year_id}
    settings = client.put(
        f"/api/v1/academic-calendar/{year_id}",
        headers=headers,
        json={
            "working_days_mask": 127, # Assuming it takes an int mask based on schema
            "shift": "morning"
        }
    )
    # Check if we need to adjust payload based on previous read of code
    # Code said: working_days_mask=payload.working_days_mask, shift=payload.shift
    
    assert settings.status_code == 200

    # 3. Try to delete -> 200 (Now allowed, settings are auto-deleted)
    delete_resp = client.delete(f"/api/v1/academic-years/{year_id}", headers=headers)
    
    assert delete_resp.status_code == 200
    # assert "associated calendar settings" in delete_resp.json()["detail"]

def test_delete_year_conflict_term(client):
    token, school_id = _bootstrap_admin_and_school(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    # 1. Create Academic Year
    ay = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2025-2026", "start_date": "2025-01-01", "end_date": "2025-12-31", "is_current": False},
    )
    assert ay.status_code == 200
    year_id = ay.json()["id"]

    # 2. Create Term
    term = client.post(
        "/api/v1/terms",
        headers=headers,
        json={
            "academic_year_id": year_id,
            "name": "Term 1",
            "start_date": "2025-01-01",
            "end_date": "2025-04-01"
        }
    )
    assert term.status_code == 200

    # 3. Try to delete -> 409
    delete_resp = client.delete(f"/api/v1/academic-years/{year_id}", headers=headers)
    assert delete_resp.status_code == 409
    assert "associated terms" in delete_resp.json()["detail"]
