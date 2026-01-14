import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"sec_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Sec School {suffix}",
            "school_code": f"SE{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_audit_log_written_on_mutations(client):
    token, school_id = _bootstrap(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    before = client.get("/api/v1/audit-logs?page=1&limit=50", headers=headers)
    assert before.status_code == 200
    before_count = len(before.json()["items"])

    created = client.post("/api/v1/students", headers=headers, json={"first_name": "A", "last_name": "B"})
    assert created.status_code == 200

    after = client.get("/api/v1/audit-logs?page=1&limit=50", headers=headers)
    assert after.status_code == 200
    after_items = after.json()["items"]
    assert len(after_items) >= before_count + 1
    assert any(i["action"].endswith(" /api/v1/students") for i in after_items)


def test_rate_limit_triggers_for_auth(client, monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-please-change")
    monkeypatch.setenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")

    from app.db.session import Base, engine
    from app.core.config import settings
    from app.main import create_app
    import app.db.base
    from fastapi.testclient import TestClient

    settings.rate_limit_enabled = True
    settings.rate_limit_auth_per_15_minutes = 2

    Base.metadata.create_all(bind=engine)
    app = create_app()
    with TestClient(app) as c:
        for _ in range(2):
            suffix = uuid.uuid4().hex[:8]
            r = c.post(
                "/api/v1/auth/register",
                json={"email": f"x{suffix}@e.com", "password": "12345678", "school_name": f"S{suffix}", "school_code": f"SC{suffix}"},
            )
            assert r.status_code in (200, 409, 422)
        suffix = uuid.uuid4().hex[:8]
        third = c.post(
            "/api/v1/auth/register",
            json={"email": f"x{suffix}@e.com", "password": "12345678", "school_name": f"S{suffix}", "school_code": f"SC{suffix}"},
        )
        assert third.status_code == 429
