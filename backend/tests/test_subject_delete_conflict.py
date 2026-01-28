import uuid
import pytest

def _bootstrap_admin_and_school(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_subj_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Subject School {suffix}",
            "school_code": f"SUBJ{suffix[:4].upper()}",
        },
    )
    assert register.status_code == 200, register.text
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id

def test_delete_subject_conflict_curriculum(client):
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

    # 2. Create Subject
    subj = client.post("/api/v1/subjects", headers=headers, json={"name": "Biology", "code": "BIO"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    # 3. Create Curriculum Unit
    cu = client.post(
        "/api/v1/curriculum",
        headers=headers,
        json={
            "academic_year_id": year_id,
            "subject_id": subject_id,
            "title": "Cells",
            "order_index": 1
        }
    )
    assert cu.status_code == 200

    # 4. Try to delete subject -> 409
    delete_resp = client.delete(f"/api/v1/subjects/{subject_id}", headers=headers)
    assert delete_resp.status_code == 409
    assert delete_resp.json()["detail"] == "Cannot delete subject: It has associated curriculum units."

def test_delete_subject_conflict_class_assignment(client):
    token, school_id = _bootstrap_admin_and_school(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    # 1. Create Subject
    subj = client.post("/api/v1/subjects", headers=headers, json={"name": "Chemistry", "code": "CHEM"})
    assert subj.status_code == 200
    subject_id = subj.json()["id"]

    # 2. Create Class
    c = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 10", "numeric_value": 10})
    assert c.status_code == 200
    class_id = c.json()["id"]

    # 3. Assign Subject to Class
    assign = client.post(
        f"/api/v1/subjects/{subject_id}/assign-to-class", headers=headers, json={"class_id": class_id}
    )
    assert assign.status_code == 200

    # 4. Try to delete subject -> 409
    delete_resp = client.delete(f"/api/v1/subjects/{subject_id}", headers=headers)
    assert delete_resp.status_code == 409
    assert delete_resp.json()["detail"] == "Cannot delete subject: It is assigned to one or more classes."

    # 5. Remove assignment
    remove = client.delete(f"/api/v1/subjects/{subject_id}/remove-from-class/{class_id}", headers=headers)
    assert remove.status_code == 200

    # 6. Delete subject -> 200
    delete_resp_2 = client.delete(f"/api/v1/subjects/{subject_id}", headers=headers)
    assert delete_resp_2.status_code == 200
