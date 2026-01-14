import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_fee_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Fee School {suffix}",
            "school_code": f"FE{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_fee_structure_payment_discount_due_flow(client):
    headers = _bootstrap(client)

    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
    )
    assert year.status_code == 200
    year_id = year.json()["id"]

    cls = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 6", "numeric_value": 6})
    assert cls.status_code == 200
    class_id = cls.json()["id"]

    sec = client.post("/api/v1/sections", headers=headers, json={"class_id": class_id, "name": "A", "capacity": 30})
    assert sec.status_code == 200
    section_id = sec.json()["id"]

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Fee", "last_name": "Student"})
    assert student.status_code == 200
    student_id = student.json()["id"]

    enr = client.post(
        "/api/v1/enrollments",
        headers=headers,
        json={"student_id": student_id, "academic_year_id": year_id, "class_id": class_id, "section_id": section_id},
    )
    assert enr.status_code == 200

    fs = client.post(
        "/api/v1/fee-structures",
        headers=headers,
        json={"academic_year_id": year_id, "class_id": class_id, "name": "Tuition", "amount": 1000, "due_date": "2024-02-01"},
    )
    assert fs.status_code == 200

    disc = client.post("/api/v1/discounts", headers=headers, json={"name": "Scholarship", "discount_type": "percent", "value": 10})
    assert disc.status_code == 200
    discount_id = disc.json()["id"]

    apply = client.post("/api/v1/discounts/apply", headers=headers, json={"student_id": student_id, "discount_id": discount_id})
    assert apply.status_code == 200

    pay = client.post(
        "/api/v1/fee-payments/collect",
        headers=headers,
        json={"student_id": student_id, "academic_year_id": year_id, "payment_date": "2024-01-15", "amount": 500, "payment_method": "cash"},
    )
    assert pay.status_code == 200
    payment_id = pay.json()["id"]

    calc = client.post(f"/api/v1/fee-dues/calculate?academic_year_id={year_id}", headers=headers)
    assert calc.status_code == 200

    dues = client.get(f"/api/v1/fee-dues/student/{student_id}", headers=headers)
    assert dues.status_code == 200
    assert len(dues.json()) == 1
    d = dues.json()[0]
    assert d["total_fee"] == 1000
    assert d["discount_amount"] == 100
    assert d["paid_amount"] == 500
    assert d["due_amount"] == 400
    assert d["status"] in {"partial", "overdue"}

    stats = client.get("/api/v1/fee-dues/statistics", headers=headers)
    assert stats.status_code == 200
    assert stats.json()["due"] >= 0

    daily = client.get("/api/v1/fee-payments/daily-collection?collection_date=2024-01-15", headers=headers)
    assert daily.status_code == 200
    assert daily.json()["collected"] == 500

    refund = client.post(f"/api/v1/fee-payments/refund/{payment_id}", headers=headers)
    assert refund.status_code == 200

    calc2 = client.post(f"/api/v1/fee-dues/calculate?academic_year_id={year_id}", headers=headers)
    assert calc2.status_code == 200
    dues2 = client.get(f"/api/v1/fee-dues/student/{student_id}", headers=headers)
    assert dues2.status_code == 200
    assert dues2.json()[0]["paid_amount"] == 0
    assert dues2.json()[0]["due_amount"] == 900

