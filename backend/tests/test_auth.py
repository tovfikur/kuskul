def test_register_sets_refresh_cookie_and_returns_access_token(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@example.com",
            "password": "supersecurepassword",
            "school_name": "Test School",
            "school_code": "TEST001",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert "set-cookie" in resp.headers


def test_me_returns_user_and_memberships(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin2@example.com",
            "password": "supersecurepassword",
            "school_name": "Test School 2",
            "school_code": "TEST002",
        },
    )
    token = register.json()["access_token"]

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "admin2@example.com"
    assert isinstance(body["memberships"], list)
    assert len(body["memberships"]) == 1
