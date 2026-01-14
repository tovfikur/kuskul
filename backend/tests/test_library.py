import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_lib_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Lib School {suffix}",
            "school_code": f"LB{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_library_books_and_issues_flow(client):
    token, school_id = _bootstrap(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    other_email = f"student_lib_{uuid.uuid4().hex[:8]}@example.com"
    other = client.post(
        "/api/v1/users",
        headers=headers,
        json={"email": other_email, "password": "supersecurepassword", "role_name": "student"},
    )
    assert other.status_code == 200
    other_user_id = other.json()["id"]

    created = client.post(
        "/api/v1/library/books",
        headers=headers,
        json={"title": "The Book", "author": "Author", "category": "Fiction", "isbn": "ISBN1", "total_copies": 2},
    )
    assert created.status_code == 200
    book_id = created.json()["id"]

    listed = client.get("/api/v1/library/books?page=1&limit=20&category=Fiction", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    search = client.get("/api/v1/library/books/search?query=Book", headers=headers)
    assert search.status_code == 200
    assert any(b["id"] == book_id for b in search.json())

    avail = client.get("/api/v1/library/books/available", headers=headers)
    assert avail.status_code == 200
    assert any(b["id"] == book_id for b in avail.json())

    issue = client.post(
        "/api/v1/library/issues/issue",
        headers=headers,
        json={"book_id": book_id, "user_id": other_user_id, "due_date": "2000-01-02"},
    )
    assert issue.status_code == 200
    issue_id = issue.json()["id"]

    b = client.get(f"/api/v1/library/books/{book_id}", headers=headers)
    assert b.status_code == 200
    assert b.json()["available_copies"] == 1

    active = client.get("/api/v1/library/issues/active", headers=headers)
    assert active.status_code == 200
    assert any(i["id"] == issue_id for i in active.json())

    overdue = client.get("/api/v1/library/issues/overdue", headers=headers)
    assert overdue.status_code == 200
    assert any(i["id"] == issue_id for i in overdue.json())

    fine = client.post(f"/api/v1/library/issues/calculate-fine/{issue_id}", headers=headers)
    assert fine.status_code == 200
    assert fine.json()["fine"] >= 0

    renewed = client.post(f"/api/v1/library/issues/renew/{issue_id}", headers=headers)
    assert renewed.status_code == 200

    history = client.get(f"/api/v1/library/issues/user/{other_user_id}/history", headers=headers)
    assert history.status_code == 200
    assert any(i["id"] == issue_id for i in history.json())

    returned = client.post("/api/v1/library/issues/return", headers=headers, json={"issue_id": issue_id})
    assert returned.status_code == 200

    b2 = client.get(f"/api/v1/library/books/{book_id}", headers=headers)
    assert b2.status_code == 200
    assert b2.json()["available_copies"] == 2

