import json
import os
import sys
import uuid
from datetime import date
from typing import Any

import httpx


def _random_suffix() -> str:
    return uuid.uuid4().hex[:8]


def _iso(d: date) -> str:
    return d.isoformat()


def _pick_path_value(name: str, known: dict[str, str]) -> str:
    if name in known:
        return known[name]
    if name.endswith("_id") or name.endswith("Id") or name in {"user_id", "student_id", "school_id"}:
        return str(uuid.uuid4())
    if "date" in name:
        return "2024-01-01"
    if name == "month":
        return "1"
    if name == "year":
        return "2024"
    return "test"


def _fill_path(path_template: str, known: dict[str, str]) -> str:
    out = path_template
    while "{" in out and "}" in out:
        start = out.index("{")
        end = out.index("}", start)
        name = out[start + 1 : end]
        value = _pick_path_value(name, known)
        out = out[:start] + value + out[end + 1 :]
    return out


def _build_required_query(params: list[dict[str, Any]], known: dict[str, str]) -> dict[str, str]:
    q: dict[str, str] = {}
    for p in params:
        if p.get("in") != "query":
            continue
        if not p.get("required"):
            continue
        name = p.get("name", "")
        if name in known:
            q[name] = known[name]
        elif name.endswith("_id"):
            q[name] = str(uuid.uuid4())
        elif "date" in name:
            q[name] = "2024-01-01"
        elif name == "month":
            q[name] = "1"
        elif name == "year":
            q[name] = "2024"
        elif name in {"page", "limit", "offset"}:
            q[name] = "1" if name != "limit" else "20"
        else:
            q[name] = "test"
    return q


def _minimal_json_body(path: str, method: str, known: dict[str, str]) -> dict[str, Any] | None:
    if method.lower() not in {"post", "put", "patch"}:
        return None

    if path.endswith("/auth/register"):
        suffix = _random_suffix()
        return {
            "email": f"smoke_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Smoke School {suffix}",
            "school_code": f"SM{suffix[:6].upper()}",
        }
    if path.endswith("/auth/login"):
        return None
    if path.endswith("/users"):
        suffix = _random_suffix()
        return {"email": f"user_{suffix}@example.com", "password": "supersecurepassword", "role_name": "student"}
    if path.endswith("/academic-years"):
        return {"name": "2024-2025", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True}
    if path.endswith("/classes"):
        return {"name": "Grade 1", "numeric_value": 1}
    if path.endswith("/sections"):
        cid = known.get("class_id") or known.get("classId") or str(uuid.uuid4())
        return {"class_id": cid, "name": "A", "capacity": 30}
    if path.endswith("/students"):
        return {"first_name": "Smoke", "last_name": "Student"}
    if path.endswith("/enrollments"):
        return {
            "student_id": known.get("student_id", str(uuid.uuid4())),
            "academic_year_id": known.get("academic_year_id", str(uuid.uuid4())),
            "class_id": known.get("class_id", str(uuid.uuid4())),
            "section_id": known.get("section_id", None),
        }
    if path.endswith("/fee-structures"):
        return {
            "academic_year_id": known.get("academic_year_id", str(uuid.uuid4())),
            "class_id": known.get("class_id", str(uuid.uuid4())),
            "name": "Tuition",
            "amount": 1000,
            "due_date": "2024-02-01",
        }
    if path.endswith("/discounts"):
        return {"name": "Scholarship", "discount_type": "percent", "value": 10}
    if path.endswith("/discounts/apply"):
        return {"student_id": known.get("student_id", str(uuid.uuid4())), "discount_id": known.get("discount_id", str(uuid.uuid4()))}
    if path.endswith("/fee-payments/collect"):
        return {
            "student_id": known.get("student_id", str(uuid.uuid4())),
            "academic_year_id": known.get("academic_year_id", str(uuid.uuid4())),
            "payment_date": "2024-01-15",
            "amount": 100,
            "payment_method": "cash",
        }
    if path.endswith("/notices"):
        return {"notice_type": "general", "target_audience": "all", "title": "Hello", "content": "World"}
    if path.endswith("/notifications/send"):
        return {"user_ids": [known.get("user_id", str(uuid.uuid4()))], "notification_type": "info", "title": "T", "message": "M"}
    if path.endswith("/messages/send"):
        return {"recipient_id": known.get("other_user_id", known.get("user_id", str(uuid.uuid4()))), "content": "Hi"}
    if path.endswith("/communication-logs/send-sms") or path.endswith("/communication-logs/bulk-sms"):
        return {"recipients": ["123"], "message": "Hello"}
    if path.endswith("/communication-logs/send-email") or path.endswith("/communication-logs/bulk-email"):
        return {"recipients": ["test@example.com"], "subject": "S", "body": "B"}
    if path.endswith("/library/books"):
        return {"title": "The Book", "author": "Author", "category": "Fiction", "isbn": "ISBN1", "total_copies": 1}
    if path.endswith("/library/issues/issue"):
        return {"book_id": known.get("book_id", str(uuid.uuid4())), "user_id": known.get("other_user_id", known.get("user_id", str(uuid.uuid4()))), "due_date": "2030-01-01"}
    if path.endswith("/library/issues/return"):
        return {"issue_id": known.get("issue_id", str(uuid.uuid4()))}
    if path.endswith("/transport/vehicles"):
        return {"name": "Bus 1", "registration_no": "REG-1", "capacity": 40, "driver_name": "Driver", "status": "active"}
    if path.endswith("/transport/routes"):
        return {"name": "Route A", "code": "A", "description": "Main", "is_active": True}
    if path.endswith("/transport/route-stops"):
        return {"route_id": known.get("route_id", str(uuid.uuid4())), "name": "Stop 1", "sequence": 1, "pickup_time": "07:30:00"}
    if path.endswith("/transport/student-assignments/assign"):
        return {
            "student_id": known.get("student_id", str(uuid.uuid4())),
            "route_id": known.get("route_id", str(uuid.uuid4())),
            "vehicle_id": known.get("vehicle_id", None),
            "stop_id": known.get("stop_id", None),
            "status": "active",
        }
    if path.endswith("/documents/upload"):
        return None
    if path.endswith("/certificates/templates"):
        return {"template_type": "transfer", "name": "Transfer v1", "content": "Hello {{student}}"}
    if path.endswith("/events"):
        return {"event_type": "general", "title": "Event", "start_date": "2024-02-01", "end_date": "2024-02-01", "is_all_day": True}
    if path.endswith("/holidays"):
        return {"holiday_date": "2024-12-25", "name": "Xmas", "holiday_type": "public"}
    if path.startswith("/api/v1/settings/") and method.lower() == "put":
        return {"value": "{\"ok\":true}"}
    if path.endswith("/backup/create"):
        return {"notes": "smoke"}
    if path.endswith("/batch/students/transfer"):
        return {"enrollment_ids": [known.get("enrollment_id", str(uuid.uuid4()))], "new_section_id": known.get("section_id", None)}
    if path.endswith("/batch/students/promote"):
        return {
            "enrollment_ids": [known.get("enrollment_id", str(uuid.uuid4()))],
            "new_academic_year_id": known.get("academic_year_id", str(uuid.uuid4())),
            "new_class_id": known.get("class_id", str(uuid.uuid4())),
            "new_section_id": known.get("section_id", None),
        }
    return {}


def _call_operation(
    client: httpx.Client,
    method: str,
    path_template: str,
    op: dict[str, Any],
    known: dict[str, str],
) -> tuple[int, str]:
    url_path = _fill_path(path_template, known)
    params = _build_required_query(op.get("parameters", []), known)

    files = None
    data = None
    json_body = _minimal_json_body(path_template, method, known)
    if path_template.endswith("/documents/upload") and method.lower() == "post":
        files = {"file": ("doc.txt", b"hello", "text/plain")}
        params.setdefault("entity_type", "student")
        params.setdefault("entity_id", "1")
        json_body = None
    if path_template.endswith("/documents/bulk-upload") and method.lower() == "post":
        files = [
            ("files", ("a.txt", b"a", "text/plain")),
            ("files", ("b.txt", b"b", "text/plain")),
        ]
        params.setdefault("entity_type", "student")
        params.setdefault("entity_id", "1")
        json_body = None
    if files is not None and isinstance(files, list):
        data = {}

    resp = client.request(method.upper(), url_path, params=params, json=json_body, files=files, data=data)
    return resp.status_code, f"{method.upper()} {url_path}"


def main() -> int:
    base_url = os.environ.get("SMOKE_BASE_URL", "http://localhost:8000")
    api_prefix = os.environ.get("SMOKE_API_PREFIX", "/api/v1")
    client = httpx.Client(base_url=base_url, follow_redirects=True, timeout=30.0)
    known: dict[str, str] = {}

    suffix = _random_suffix()
    reg = client.post(
        f"{api_prefix}/auth/register",
        json={
            "email": f"admin_smoke_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Smoke School {suffix}",
            "school_code": f"SK{suffix[:6].upper()}",
        },
    )
    reg.raise_for_status()
    token = reg.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    me = client.get(f"{api_prefix}/auth/me")
    me.raise_for_status()
    known["user_id"] = me.json()["user_id"]
    known["school_id"] = me.json()["memberships"][0]["school_id"]
    client.headers["X-School-Id"] = known["school_id"]

    other = client.post(
        f"{api_prefix}/users",
        json={"email": f"user_smoke_{_random_suffix()}@example.com", "password": "supersecurepassword", "role_name": "student"},
    )
    other.raise_for_status()
    known["other_user_id"] = other.json()["id"]

    year = client.post(f"{api_prefix}/academic-years", json={"name": "2024", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True})
    year.raise_for_status()
    known["academic_year_id"] = year.json()["id"]

    cls = client.post(f"{api_prefix}/classes", json={"name": "Grade 1", "numeric_value": 1})
    cls.raise_for_status()
    known["class_id"] = cls.json()["id"]

    sec = client.post(f"{api_prefix}/sections", json={"class_id": known["class_id"], "name": "A", "capacity": 30})
    sec.raise_for_status()
    known["section_id"] = sec.json()["id"]

    student = client.post(f"{api_prefix}/students", json={"first_name": "Smoke", "last_name": "Student"})
    student.raise_for_status()
    known["student_id"] = student.json()["id"]

    enr = client.post(
        f"{api_prefix}/enrollments",
        json={"student_id": known["student_id"], "academic_year_id": known["academic_year_id"], "class_id": known["class_id"], "section_id": known["section_id"]},
    )
    enr.raise_for_status()
    known["enrollment_id"] = enr.json()["id"]

    fs = client.post(
        f"{api_prefix}/fee-structures",
        json={"academic_year_id": known["academic_year_id"], "class_id": known["class_id"], "name": "Tuition", "amount": 1000, "due_date": "2024-02-01"},
    )
    fs.raise_for_status()
    known["fee_structure_id"] = fs.json()["id"]

    disc = client.post(f"{api_prefix}/discounts", json={"name": "Scholarship", "discount_type": "percent", "value": 10})
    disc.raise_for_status()
    known["discount_id"] = disc.json()["id"]

    apply_disc = client.post(f"{api_prefix}/discounts/apply", json={"student_id": known["student_id"], "discount_id": known["discount_id"]})
    apply_disc.raise_for_status()

    pay = client.post(
        f"{api_prefix}/fee-payments/collect",
        json={"student_id": known["student_id"], "academic_year_id": known["academic_year_id"], "payment_date": "2024-01-15", "amount": 100, "payment_method": "cash"},
    )
    pay.raise_for_status()
    known["payment_id"] = pay.json()["id"]

    notice = client.post(f"{api_prefix}/notices", json={"notice_type": "general", "target_audience": "all", "title": "Hello", "content": "World"})
    notice.raise_for_status()
    known["notice_id"] = notice.json()["id"]

    book = client.post(f"{api_prefix}/library/books", json={"title": "The Book", "author": "Author", "category": "Fiction", "isbn": f"ISBN{_random_suffix()}", "total_copies": 1})
    book.raise_for_status()
    known["book_id"] = book.json()["id"]

    issue = client.post(
        f"{api_prefix}/library/issues/issue",
        json={"book_id": known["book_id"], "user_id": known["other_user_id"], "due_date": "2030-01-01"},
    )
    issue.raise_for_status()
    known["issue_id"] = issue.json()["id"]

    vehicle = client.post(f"{api_prefix}/transport/vehicles", json={"name": "Bus 1", "registration_no": "REG-1", "capacity": 40, "driver_name": "Driver", "status": "active"})
    vehicle.raise_for_status()
    known["vehicle_id"] = vehicle.json()["id"]

    route = client.post(f"{api_prefix}/transport/routes", json={"name": "Route A", "code": "A", "description": "Main", "is_active": True})
    route.raise_for_status()
    known["route_id"] = route.json()["id"]

    stop = client.post(f"{api_prefix}/transport/route-stops", json={"route_id": known["route_id"], "name": "Stop 1", "sequence": 1, "pickup_time": "07:30:00"})
    stop.raise_for_status()
    known["stop_id"] = stop.json()["id"]

    assign = client.post(
        f"{api_prefix}/transport/student-assignments/assign",
        json={"student_id": known["student_id"], "route_id": known["route_id"], "vehicle_id": known["vehicle_id"], "stop_id": known["stop_id"], "status": "active"},
    )
    assign.raise_for_status()
    known["assignment_id"] = assign.json()["id"]

    openapi = client.get("/openapi.json")
    openapi.raise_for_status()
    spec = openapi.json()

    failures: list[dict[str, Any]] = []

    auth_last = {("/api/v1/auth/logout", "post"), ("/api/v1/auth/refresh", "post")}

    ops: list[tuple[str, str, dict[str, Any]]] = []
    for path, methods in spec.get("paths", {}).items():
        for method, op in methods.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            ops.append((path, method, op))

    ordered: list[tuple[str, str, dict[str, Any]]] = []
    for path, method, op in ops:
        if (path, method.lower()) in auth_last:
            continue
        ordered.append((path, method, op))
    for path, method, op in ops:
        if (path, method.lower()) in auth_last:
            ordered.append((path, method, op))

    for path, method, op in ordered:
        try:
            status, label = _call_operation(client, method, path, op, known)
            if status >= 500 and status != 501:
                failures.append({"endpoint": label, "status": status})
        except Exception as e:
            failures.append({"endpoint": f"{method.upper()} {path}", "error": str(e)})

    if failures:
        sys.stdout.write(json.dumps({"ok": False, "failures": failures[:50], "failure_count": len(failures)}, indent=2))
        sys.stdout.write("\n")
        return 1

    sys.stdout.write(json.dumps({"ok": True, "tested": len(ordered)}, indent=2))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

