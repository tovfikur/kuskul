import uuid


def test_architech_baseline_auth_flow(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"arch_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Arch School {suffix}",
            "school_code": f"AR{suffix[:6].upper()}",
        },
    )
    assert register.status_code == 200
    assert register.json()["token_type"] == "bearer"
    assert "refresh_token" in register.headers.get("set-cookie", "")

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {register.json()['access_token']}"})
    assert me.status_code == 200
    school_id = me.json()["memberships"][0]["school_id"]

    refresh1 = client.post("/api/v1/auth/refresh")
    assert refresh1.status_code == 200
    cookie1 = refresh1.headers.get("set-cookie", "")
    assert "refresh_token" in cookie1

    refresh2 = client.post("/api/v1/auth/refresh-token")
    assert refresh2.status_code == 200
    cookie2 = refresh2.headers.get("set-cookie", "")
    assert "refresh_token" in cookie2

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200

    refresh_after_logout = client.post("/api/v1/auth/refresh")
    assert refresh_after_logout.status_code == 401

    login = client.post("/api/v1/auth/login", json={"email": f"arch_{suffix}@example.com", "password": "supersecurepassword"})
    assert login.status_code == 200
    assert "refresh_token" in login.headers.get("set-cookie", "")

    users_without_school = client.get("/api/v1/users", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert users_without_school.status_code in (400, 401, 403)

    users = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {login.json()['access_token']}", "X-School-Id": school_id},
    )
    assert users.status_code == 200


def test_password_over_72_bytes_rejected(client):
    suffix = uuid.uuid4().hex[:8]
    too_long = "a" * 73
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": f"long_{suffix}@example.com", "password": too_long, "school_name": "School", "school_code": f"L{suffix}"},
    )
    assert resp.status_code == 422

