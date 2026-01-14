import uuid


def _register_and_get_context(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Test School {suffix}",
            "school_code": f"TEST{suffix[:5].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_users_crud_with_school_context(client):
    token, school_id = _register_and_get_context(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    resp = client.get("/api/v1/users", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert body["total"] >= 1

    created = client.post(
        "/api/v1/users",
        headers=headers,
        json={"email": "teacher1@example.com", "password": "supersecurepassword", "role_name": "teacher"},
    )
    assert created.status_code == 200
    user_id = created.json()["id"]

    detail = client.get(f"/api/v1/users/{user_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["role_name"] == "teacher"

    updated = client.patch(f"/api/v1/users/{user_id}", headers=headers, json={"role_name": "student"})
    assert updated.status_code == 200
    assert updated.json()["role_name"] == "student"

    deleted = client.delete(f"/api/v1/users/{user_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "ok"


def test_schools_get_and_patch(client):
    token, school_id = _register_and_get_context(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    created = client.post("/api/v1/schools", headers=headers, json={"name": "New School", "code": "NEWSCH1"})
    assert created.status_code == 200
    new_id = created.json()["id"]

    fetched = client.get(f"/api/v1/schools/{new_id}", headers={"Authorization": f"Bearer {token}"})
    assert fetched.status_code == 200
    assert fetched.json()["code"] == "NEWSCH1"

    patched = client.patch(
        f"/api/v1/schools/{new_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "New School Renamed"},
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "New School Renamed"
