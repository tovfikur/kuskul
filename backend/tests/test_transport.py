import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_tr_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Transport School {suffix}",
            "school_code": f"TR{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return {"Authorization": f"Bearer {token}", "X-School-Id": school_id}


def test_transport_vehicles_routes_stops_assignments_flow(client):
    headers = _bootstrap(client)

    vehicle = client.post(
        "/api/v1/transport/vehicles",
        headers=headers,
        json={"name": "Bus 1", "registration_no": "REG-1", "capacity": 40, "driver_name": "Driver", "status": "active"},
    )
    assert vehicle.status_code == 200
    vehicle_id = vehicle.json()["id"]

    route = client.post(
        "/api/v1/transport/routes",
        headers=headers,
        json={"name": "Route A", "code": "A", "description": "Main", "is_active": True},
    )
    assert route.status_code == 200
    route_id = route.json()["id"]

    stop = client.post(
        "/api/v1/transport/route-stops",
        headers=headers,
        json={"route_id": route_id, "name": "Stop 1", "sequence": 1, "pickup_time": "07:30:00"},
    )
    assert stop.status_code == 200
    stop_id = stop.json()["id"]

    student = client.post("/api/v1/students", headers=headers, json={"first_name": "Tran", "last_name": "Student"})
    assert student.status_code == 200
    student_id = student.json()["id"]

    assign = client.post(
        "/api/v1/transport/student-assignments/assign",
        headers=headers,
        json={"student_id": student_id, "route_id": route_id, "vehicle_id": vehicle_id, "stop_id": stop_id, "status": "active"},
    )
    assert assign.status_code == 200
    assignment_id = assign.json()["id"]

    vehicle_students = client.get(f"/api/v1/transport/vehicles/{vehicle_id}/students", headers=headers)
    assert vehicle_students.status_code == 200
    assert any(s["id"] == student_id for s in vehicle_students.json())

    route_stops = client.get(f"/api/v1/transport/routes/{route_id}/stops", headers=headers)
    assert route_stops.status_code == 200
    assert any(s["id"] == stop_id for s in route_stops.json())

    route_students = client.get(f"/api/v1/transport/routes/{route_id}/students", headers=headers)
    assert route_students.status_code == 200
    assert any(s["id"] == student_id for s in route_students.json())

    listed = client.get(f"/api/v1/transport/student-assignments?route_id={route_id}", headers=headers)
    assert listed.status_code == 200
    assert any(a["id"] == assignment_id for a in listed.json())

    maint = client.patch(f"/api/v1/transport/vehicles/{vehicle_id}/maintenance", headers=headers)
    assert maint.status_code == 200

    upd = client.put(
        f"/api/v1/transport/student-assignments/{assignment_id}",
        headers=headers,
        json={"status": "inactive"},
    )
    assert upd.status_code == 200
    assert upd.json()["status"] == "inactive"

