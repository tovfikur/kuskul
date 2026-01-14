import uuid
from datetime import date


def _auth_headers(token: str, school_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_parent_portal_core_flow(client):
    suffix = uuid.uuid4().hex[:8]
    admin = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"School {suffix}",
            "school_code": f"SC{suffix[:6].upper()}",
        },
    )
    assert admin.status_code == 200
    admin_token = admin.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    school_id = me.json()["memberships"][0]["school_id"]

    guardian = client.post(
        "/api/v1/guardians",
        json={"full_name": "Parent One", "phone": "01700000000", "email": f"p_{suffix}@example.com"},
        headers=_auth_headers(admin_token, school_id),
    )
    assert guardian.status_code == 200
    guardian_id = guardian.json()["id"]

    student1 = client.post(
        "/api/v1/students",
        json={"first_name": "Child", "last_name": "One", "status": "active"},
        headers=_auth_headers(admin_token, school_id),
    )
    assert student1.status_code == 200
    student1_id = student1.json()["id"]

    link = client.post(
        f"/api/v1/students/{student1_id}/guardians",
        json={"guardian_id": guardian_id, "relation": "father", "is_primary": True},
        headers=_auth_headers(admin_token, school_id),
    )
    assert link.status_code == 200

    student2 = client.post(
        "/api/v1/students",
        json={"first_name": "Other", "last_name": "Kid", "status": "active"},
        headers=_auth_headers(admin_token, school_id),
    )
    assert student2.status_code == 200
    student2_id = student2.json()["id"]

    parent = client.post(
        "/api/v1/auth/register-parent",
        json={
            "email": f"parent_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_code": f"SC{suffix[:6].upper()}",
            "guardian_id": guardian_id,
            "guardian_phone": "01700000000",
        },
    )
    assert parent.status_code == 200
    parent_token = parent.json()["access_token"]

    profile = client.get("/api/v1/parent/profile", headers=_auth_headers(parent_token, school_id))
    assert profile.status_code == 200
    assert profile.json()["guardian_id"] == guardian_id

    kids = client.get("/api/v1/parent/children", headers=_auth_headers(parent_token, school_id))
    assert kids.status_code == 200
    ids = {k["id"] for k in kids.json()}
    assert student1_id in ids
    assert student2_id not in ids

    doc1 = client.post(
        "/api/v1/documents/upload?entity_type=student&entity_id=" + student1_id,
        files={"file": ("doc1.txt", b"hello", "text/plain")},
        headers=_auth_headers(admin_token, school_id),
    )
    assert doc1.status_code == 200

    doc2 = client.post(
        "/api/v1/documents/upload?entity_type=student&entity_id=" + student2_id,
        files={"file": ("doc2.txt", b"secret", "text/plain")},
        headers=_auth_headers(admin_token, school_id),
    )
    assert doc2.status_code == 200

    parent_docs = client.get("/api/v1/documents", headers=_auth_headers(parent_token, school_id))
    assert parent_docs.status_code == 200
    filenames = {d["filename"] for d in parent_docs.json()}
    assert "doc1.txt" in filenames
    assert "doc2.txt" not in filenames

    excuse = client.post(
        f"/api/v1/parent/attendance/{student1_id}/excuses",
        json={"attendance_date": date.today().isoformat(), "reason": "Fever"},
        headers=_auth_headers(parent_token, school_id),
    )
    assert excuse.status_code == 200
    excuse_id = excuse.json()["id"]

    pending = client.get("/api/v1/attendance/students/excuses/pending", headers=_auth_headers(admin_token, school_id))
    assert pending.status_code == 200
    assert any(row["id"] == excuse_id for row in pending.json())

    approve = client.post(
        f"/api/v1/attendance/students/excuses/{excuse_id}/approve",
        headers=_auth_headers(admin_token, school_id),
    )
    assert approve.status_code == 200

    excuses = client.get(f"/api/v1/parent/attendance/{student1_id}/excuses", headers=_auth_headers(parent_token, school_id))
    assert excuses.status_code == 200
    assert any(row["id"] == excuse_id and row["status"] == "approved" for row in excuses.json())

    forgot = client.post("/api/v1/auth/forgot-password", json={"email": f"parent_{suffix}@example.com"})
    assert forgot.status_code == 200
    reset_token = forgot.json().get("reset_token")
    assert reset_token

    reset = client.post("/api/v1/auth/reset-password", json={"reset_token": reset_token, "new_password": "newsecurepassword"})
    assert reset.status_code == 200

    login = client.post("/api/v1/auth/login", json={"email": f"parent_{suffix}@example.com", "password": "newsecurepassword"})
    assert login.status_code == 200

