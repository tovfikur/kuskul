from sqlalchemy import select


def test_roles_list_requires_super_admin(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin_roles@example.com",
            "password": "supersecurepassword",
            "school_name": "Role School",
            "school_code": "ROLE01",
        },
    )
    token = register.json()["access_token"]

    from app.db.session import SessionLocal
    from app.models.membership import Membership
    from app.models.role import Role
    from app.models.user import User

    with SessionLocal() as db:
        super_admin_role_id = db.scalar(select(Role.id).where(Role.name == "super_admin"))
        user_id = db.scalar(select(User.id).where(User.email == "admin_roles@example.com"))
        membership = db.scalar(select(Membership).where(Membership.user_id == user_id, Membership.is_active.is_(True)))
        membership.role_id = super_admin_role_id
        db.commit()

    resp = client.get("/api/v1/roles", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert any(r["name"] == "super_admin" for r in body)
