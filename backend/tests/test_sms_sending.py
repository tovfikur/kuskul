import json
import threading
import uuid
from datetime import date, timedelta

import pytest


@pytest.fixture(autouse=True)
def _disable_rate_limit(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "rate_limit_enabled", False)

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_POLICY = {
    "school_start_time": "08:00",
    "attendance_end_time": "17:00",
    "sync_interval_minutes": 10,
    "attendance_cutoff_time": "10:00",
    "late_grace_minutes": 0,
    "send_late_sms": True,
    "send_absent_sms": True,
    "late_sms_template": "Dear Guardian, {{student_name}} arrived late at {{time}} on {{date}}.",
    "absent_sms_template": "Dear Guardian, {{student_name}} was absent on {{date}}.",
    "auto_mark_absent": True,
    "exclude_holidays_from_absence": True,
    "weekly_holiday": 4,
    "ai_sms_writer_enabled": False,
}


SAAS_HOST_HEADERS = {"X-Forwarded-Host": "admin.testserver", "X-Tenant-Subdomain": "admin"}


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    subdomain = f"sms{suffix[:10]}"

    login = client.post(
        "/api/v1/auth/login",
        headers=SAAS_HOST_HEADERS,
        json={"email": "platform@school.com", "password": "password123"},
    )
    assert login.status_code == 200, login.text
    saas_headers = {
        **SAAS_HOST_HEADERS,
        "Authorization": f"Bearer {login.json()['access_token']}",
    }

    prov = client.post(
        "/api/v1/platform/tenants",
        headers=saas_headers,
        json={
            "name": f"SMS School {suffix}",
            "subdomain": subdomain,
            "admin_email": f"admin_{suffix}@example.com",
            "admin_password": "supersecurepassword",
            "school_name": f"SMS School {suffix}",
            "school_code": f"SM{suffix[:6].upper()}",
        },
    )
    assert prov.status_code == 200, prov.text
    school_id = prov.json()["school_id"]

    login = client.post(
        "/api/v1/auth/login",
        headers={"X-Tenant-Subdomain": subdomain},
        json={"email": f"admin_{suffix}@example.com", "password": "supersecurepassword"},
    )
    assert login.status_code == 200, login.text
    return {
        "Authorization": f"Bearer {login.json()['access_token']}",
        "X-Tenant-Subdomain": subdomain,
        "X-School-Id": school_id,
    }


def _school(client, headers):
    year = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"name": "2026", "start_date": "2026-01-01", "end_date": "2026-12-31", "is_current": True},
    ).json()
    classroom = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 1", "numeric_value": 1}).json()
    section = client.post("/api/v1/sections", headers=headers, json={"class_id": classroom["id"], "name": "A"}).json()
    response = client.put("/api/v1/settings/attendance.settings", headers=headers, json={"value": __import__("json").dumps(BASE_POLICY)})
    assert response.status_code == 200
    return {"year": year, "classroom": classroom, "section": section}


def _student(client, headers, school, suffix, admission_no):
    student = client.post(
        "/api/v1/students",
        headers=headers,
        json={"first_name": f"Child {suffix}", "last_name": "SMS", "admission_no": admission_no, "gender": "male"},
    ).json()
    enrollment = client.post(
        "/api/v1/enrollments",
        headers=headers,
        json={
            "student_id": student["id"],
            "academic_year_id": school["year"]["id"],
            "class_id": school["classroom"]["id"],
            "section_id": school["section"]["id"],
        },
    )
    assert enrollment.status_code == 200
    return student


def _guardian(client, headers, student_id, full_name, phone, primary=False):
    guardian = client.post(
        "/api/v1/guardians",
        headers=headers,
        json={"full_name": full_name, "phone": phone},
    ).json()
    link = client.post(
        f"/api/v1/students/{student_id}/guardians",
        headers=headers,
        json={"guardian_id": guardian["id"], "is_primary": primary},
    )
    assert link.status_code == 200
    return guardian


def _sms_logs(client, headers):
    rows = client.get("/api/v1/communication-logs?communication_type=sms", headers=headers).json()
    return rows


class _MockGateway:
    def __init__(self, response_status=200, response_body=b'{"error": 0, "msg": "ok"}'):
        self.received = []
        self.content_type = ""
        self.path_seen = ""
        self._response_status = response_status
        self._response_body = response_body
        self._gateway = self
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), self._handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def _handler(self, *args, **kwargs):
        return _MockGateway._Handler(self._gateway, *args, **kwargs)

    class _Handler(BaseHTTPRequestHandler):
        def __init__(self, gateway, *args, **kwargs):
            self._gateway = gateway
            super().__init__(*args, **kwargs)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            self._gateway.received.append(raw.decode("utf-8"))
            self._gateway.content_type = self.headers.get("Content-Type", "")
            self._gateway.path_seen = self.path
            self.send_response(self._gateway._response_status)
            self.end_headers()
            self.wfile.write(self._gateway._response_body)

        def log_message(self, *args):
            pass

    @property
    def url(self):
        return f"http://127.0.0.1:{self.server.server_port}/send"

    def close(self):
        self.server.shutdown()
        self.server.server_close()


def _set_gateway(client, headers, gateway):
    import json as _json

    resp = client.put("/api/v1/settings/email_sms.settings", headers=headers, json={"value": _json.dumps(gateway)})
    assert resp.status_code == 200, resp.text


def test_late_punch_sends_one_late_sms(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "late", "ADM-LATE")
    _guardian(client, headers, student["id"], "Father", "01710000001", primary=True)

    device = client.post(
        "/api/v1/attendance/hikvision/devices",
        headers=headers,
        json={"name": "Main Gate", "timezone": "Asia/Dhaka", "late_after": "08:30"},
    ).json()
    client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/credentials",
        headers=headers,
        json={"student_id": student["id"], "person_code": "90001"},
    )

    payload = {"events": [{"person_code": "90001", "event_at": "2026-02-01T08:45:00+06:00", "external_event_id": "late-1"}]}
    first = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers, json=payload)
    assert first.status_code == 200
    assert first.json()["processed"] == 1

    second_payload = {"events": [{"person_code": "90001", "event_at": "2026-02-01T09:20:00+06:00", "external_event_id": "late-2"}]}
    second = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers, json=second_payload)
    assert second.status_code == 200

    logs = _sms_logs(client, headers)
    late_logs = [row for row in logs if row["category"] == "late"]
    assert len(late_logs) == 1, late_logs
    assert late_logs[0]["recipient"] == "01710000001"
    assert late_logs[0]["student_id"] == student["id"]
    assert "Child late SMS" in late_logs[0]["body"]
    assert "08:45" in late_logs[0]["body"]
    assert late_logs[0]["status"] in {"queued", "sent", "failed"}


def test_absent_student_gets_one_absent_sms_at_school_end(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    absent_student = _student(client, headers, school, "absent", "ADM-ABS")
    _guardian(client, headers, absent_student["id"], "Mother", "01710000002", primary=True)
    present_student = _student(client, headers, school, "present", "ADM-PRES")
    _guardian(client, headers, present_student["id"], "Uncle", "01710000003", primary=True)

    day = date(2026, 2, 2)
    device = client.post(
        "/api/v1/attendance/hikvision/devices",
        headers=headers,
        json={"name": "Main Gate", "timezone": "Asia/Dhaka", "late_after": "08:30"},
    ).json()
    client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/credentials",
        headers=headers,
        json={"student_id": present_student["id"], "person_code": "90002"},
    )
    present = client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest",
        headers=headers,
        json={"events": [{"person_code": "90002", "event_at": "2026-02-02T08:10:00+06:00", "external_event_id": "present-1"}]},
    )
    assert present.status_code == 200
    assert present.json()["processed"] == 1

    result = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
        headers=headers,
    )
    assert result.status_code == 200
    body = result.json()
    assert body["marked_absent"] == 1, body
    assert body["sms_queued"] == 1, body

    logs = _sms_logs(client, headers)
    absent_logs = [row for row in logs if row["category"] == "absent"]
    assert len(absent_logs) == 1, absent_logs
    assert absent_logs[0]["recipient"] == "01710000002"
    assert absent_logs[0]["student_id"] == absent_student["id"]
    assert "Child absent SMS" in absent_logs[0]["body"]

    # A second run does not resend (idempotent, once per day).
    again = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
        headers=headers,
    )
    assert again.status_code == 200
    assert again.json()["marked_absent"] == 0
    assert len([row for row in _sms_logs(client, headers) if row["category"] == "absent"]) == 1


def test_friday_skips_absent_marking_and_sms(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "friday", "ADM-FRI")
    _guardian(client, headers, student["id"], "Aunty", "01710000004", primary=True)

    friday = date(2026, 1, 1)
    while friday.weekday() != 4:
        friday += timedelta(days=1)

    result = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={friday.isoformat()}&force=true",
        headers=headers,
    )
    assert result.status_code == 200
    body = result.json()
    # A weekly holiday is not an absent school day: nothing is marked and no
    # SMS is sent.
    assert body["marked_absent"] == 0, body
    assert body["sms_queued"] == 0, body
    assert body["sms_sent"] == 0 and body["sms_failed"] == 0
    assert body["skipped"] == "holiday", body

    logs = _sms_logs(client, headers)
    assert len([row for row in logs if row["category"] == "absent"]) == 0
    assert len(logs) == 0, logs


def test_guardian_primary_is_chosen_over_first(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "pick", "ADM-PICK")
    _guardian(client, headers, student["id"], "First Parent", "01719999999", primary=False)
    _guardian(client, headers, student["id"], "Primary Parent", "01712222222", primary=True)

    day = date(2026, 2, 3)
    result = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
        headers=headers,
    )
    assert result.status_code == 200
    absent_logs = [row for row in _sms_logs(client, headers) if row["category"] == "absent"]
    assert len(absent_logs) == 1
    assert absent_logs[0]["recipient"] == "01712222222"


def test_gateway_success_marks_sent(client):
    gateway = _MockGateway()
    try:
        headers = _bootstrap(client)
        school = _school(client, headers)
        student = _student(client, headers, school, "gateway", "ADM-GW")
        _guardian(client, headers, student["id"], "Gateway Parent", "01713333333", primary=True)

        _set_gateway(client, headers, {
            "sms_gateway_provider": "custom",
            "sms_gateway_url": gateway.url,
            "sms_api_key": "secret",
            "sms_sender_id": "SCHOOL",
            "sms_to_field": "to",
            "sms_message_field": "message",
            "sms_api_key_field": "apiKey",
            "sms_sender_field": "senderId",
        })

        day = date(2026, 2, 4)
        result = client.post(
            f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
            headers=headers,
        )
        assert result.status_code == 200
        assert result.json()["sms_sent"] == 1, result.json()

        logs = _sms_logs(client, headers)
        absent_logs = [row for row in logs if row["category"] == "absent"]
        assert len(absent_logs) == 1
        assert absent_logs[0]["status"] == "sent"

        assert gateway.path_seen == "/send"
        assert len(gateway.received) == 1
        payload = json.loads(gateway.received[0])
        assert gateway.content_type == "application/json"
        assert payload["to"] == "01713333333"
        assert payload["message"] == absent_logs[0]["body"]
        assert payload["apiKey"] == "secret"
        assert payload["senderId"] == "SCHOOL"
    finally:
        gateway.close()


def test_smsnetbd_style_form_gateway(client):
    gateway = _MockGateway(response_body=b'{"error": 0, "msg": "Request successfully submitted", "data": {"request_id": 42}}')
    try:
        headers = _bootstrap(client)
        school = _school(client, headers)
        student = _student(client, headers, school, "form", "ADM-FORM")
        _guardian(client, headers, student["id"], "Form Parent", "01715555555", primary=True)

        _set_gateway(client, headers, {
            "sms_gateway_provider": "smsnetbd",
            "sms_gateway_url": gateway.url,
            "sms_gateway_format": "form",
            "sms_api_key": "test-sms-api-key",
            "sms_sender_id": "8809617612345",
            "sms_to_field": "to",
            "sms_message_field": "msg",
            "sms_api_key_field": "api_key",
            "sms_sender_field": "sender_id",
            "sms_require_error_zero": True,
            "sms_error_field": "error",
        })

        day = date(2026, 2, 8)
        result = client.post(
            f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
            headers=headers,
        )
        assert result.status_code == 200
        assert result.json()["sms_sent"] == 1, result.json()

        logs = _sms_logs(client, headers)
        absent_logs = [row for row in logs if row["category"] == "absent"]
        assert len(absent_logs) == 1
        assert absent_logs[0]["status"] == "sent"

        assert gateway.content_type == "application/x-www-form-urlencoded"
        assert len(gateway.received) == 1
        import urllib.parse

        payload = {k: v[0] for k, v in urllib.parse.parse_qs(gateway.received[0]).items()}
        assert payload["to"] == "01715555555"
        assert payload["msg"] == absent_logs[0]["body"]
        assert payload["api_key"] == "test-sms-api-key"
        assert payload["sender_id"] == "8809617612345"
    finally:
        gateway.close()


def test_error_zero_rule_marks_provider_rejection_as_failed(client):
    gateway = _MockGateway(response_body=b'{"error": 417, "msg": "Insufficient balance"}')
    try:
        headers = _bootstrap(client)
        school = _school(client, headers)
        student = _student(client, headers, school, "reject", "ADM-REJ")
        _guardian(client, headers, student["id"], "Reject Parent", "01716666666", primary=True)

        _set_gateway(client, headers, {
            "sms_gateway_url": gateway.url,
            "sms_gateway_format": "form",
            "sms_message_field": "msg",
            "sms_api_key_field": "api_key",
            "sms_require_error_zero": True,
        })

        day = date(2026, 2, 7)
        result = client.post(
            f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
            headers=headers,
        )
        assert result.status_code == 200
        assert result.json()["sms_failed"] == 1, result.json()

        logs = _sms_logs(client, headers)
        absent_logs = [row for row in logs if row["category"] == "absent"]
        assert len(absent_logs) == 1
        assert absent_logs[0]["status"] == "failed"
        assert "Insufficient balance" in absent_logs[0]["provider_result"]
    finally:
        gateway.close()


def test_no_sms_when_gateway_unconfigured_keeps_queued(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "queued", "ADM-QUEUED")
    _guardian(client, headers, student["id"], "Queue Parent", "01714444444", primary=True)

    day = date(2026, 2, 5)
    result = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
        headers=headers,
    )
    assert result.status_code == 200
    assert result.json()["sms_queued"] == 1, result.json()
    logs = [row for row in _sms_logs(client, headers) if row["category"] == "absent"]
    assert len(logs) == 1
    assert logs[0]["status"] == "queued"

def test_late_import_queues_without_waiting_for_gateway_and_worker_delivers_once(client):
    from app.db.session import SessionLocal
    from app.services.sms import deliver_queued_late_sms
    gateway = _MockGateway()
    try:
        headers = _bootstrap(client)
        school = _school(client, headers)
        student = _student(client, headers, school, "background", "ADM-BG")
        _guardian(client, headers, student["id"], "Parent", "01710000005", primary=True)
        _set_gateway(client, headers, {"sms_gateway_url": gateway.url})
        device = client.post("/api/v1/attendance/hikvision/devices", headers=headers,
                             json={"name": "Main Gate", "timezone": "Asia/Dhaka", "late_after": "08:30"}).json()
        client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/credentials", headers=headers,
                    json={"student_id": student["id"], "person_code": "background"})
        response = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers,
                               json={"events": [{"person_code": "background", "event_at": "2026-02-01T08:45:00+06:00"}]})
        assert response.status_code == 200
        assert response.json()["processed"] == 1
        assert gateway.received == []
        assert _sms_logs(client, headers)[0]["status"] == "queued"
        with SessionLocal() as db:
            assert deliver_queued_late_sms(db, uuid.UUID(headers["X-School-Id"])) == {"sent": 1, "failed": 0, "skipped_stale": 0}
            assert deliver_queued_late_sms(db, uuid.UUID(headers["X-School-Id"])) == {"sent": 0, "failed": 0, "skipped_stale": 0}
        assert len(gateway.received) == 1
        assert _sms_logs(client, headers)[0]["status"] == "sent"
    finally:
        gateway.close()


def test_emergency_contact_remains_the_fallback_when_no_guardian_phone(client):
    from app.db.session import SessionLocal
    from app.models.student import Student
    from app.services.sms import guardian_phone
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "fallback", "ADM-FALLBACK")
    with SessionLocal() as db:
        row = db.get(Student, uuid.UUID(student["id"]))
        row.emergency_contact_phone = "01710000006"
        db.commit()
        assert guardian_phone(db, row.id) == "01710000006"


def _next_weekday(start: date, weekday: int, how_many: int) -> date:
    """Return the ``how_many``-th ``date`` on or after ``start`` whose weekday is ``weekday`` (0=Mon..6=Sun)."""
    days = (weekday - start.weekday()) % 7
    return start + (days + 7 * how_many) * timedelta(days=1)


def _set_policy(client, headers, **overrides):
    policy = {**BASE_POLICY, **overrides}
    resp = client.put("/api/v1/settings/attendance.settings", headers=headers, json={"value": json.dumps(policy)})
    assert resp.status_code == 200, resp.text


def _device_and_credential(client, headers, student_id, person_code):
    device = client.post(
        "/api/v1/attendance/hikvision/devices",
        headers=headers,
        json={"name": "Main Gate", "timezone": "Asia/Dhaka", "late_after": "08:30"},
    ).json()
    cred = client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/credentials",
        headers=headers,
        json={"student_id": student_id, "person_code": person_code},
    )
    assert cred.status_code == 200
    return device


def test_late_grace_period_calculates_threshold(client):
    from app.services.attendance_policy import is_late_local, late_threshold
    from datetime import time

    policy = {"school_start_time": "08:00", "late_grace_minutes": 90}
    assert late_threshold(policy) == time(9, 30)
    assert is_late_local(time(9, 29), policy) is False
    assert is_late_local(time(9, 30), policy) is True

    # Grace minutes are clamped at zero (never makes the threshold earlier).
    assert late_threshold({"school_start_time": "08:00", "late_grace_minutes": -5}) == time(8, 0)
    # The threshold wraps past midnight.
    assert late_threshold({"school_start_time": "23:30", "late_grace_minutes": 45}) == time(0, 15)
    # Missing or malformed settings fall back to the legacy device threshold.
    assert late_threshold({"school_start_time": "08:00", "late_grace_minutes": "nope"}) is None
    assert is_late_local(time(8, 29), {}, "08:30") is False
    assert is_late_local(time(8, 30), {}, "08:30") is True


def test_late_sms_uses_grace_period_threshold(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "grace", "ADM-GRACE")
    _guardian(client, headers, student["id"], "Grace Parent", "01710000007", primary=True)
    _set_policy(client, headers, late_grace_minutes=90)
    device = _device_and_credential(client, headers, student["id"], "90010")

    early = {"person_code": "90010", "event_at": "2026-02-09T09:29:00+06:00", "external_event_id": "grace-early"}
    resp = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers, json={"events": [early]})
    assert resp.status_code == 200
    assert resp.json()["processed"] == 1

    late = {"person_code": "90010", "event_at": "2026-02-10T09:30:00+06:00", "external_event_id": "grace-late"}
    resp = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers, json={"events": [late]})
    assert resp.status_code == 200

    late_logs = [row for row in _sms_logs(client, headers) if row["category"] == "late"]
    assert len(late_logs) == 1, late_logs
    assert "09:30" in late_logs[0]["body"]
    assert late_logs[0]["recipient"] == "01710000007"


def test_multiple_weekly_holidays_suppress_late_sms(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "weekend", "ADM-WEEKEND")
    _guardian(client, headers, student["id"], "Weekend Parent", "01710000008", primary=True)
    _set_policy(client, headers, weekly_holidays=[4, 5])  # Friday + Saturday
    device = _device_and_credential(client, headers, student["id"], "90011")

    saturday = _next_weekday(date(2026, 1, 1), weekday=5, how_many=1)
    friday = _next_weekday(date(2026, 1, 1), weekday=4, how_many=1)

    for day, event_id in ((saturday, "sat-late"), (friday, "fri-late")):
        resp = client.post(
            f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest",
            headers=headers,
            json={"events": [{"person_code": "90011", "event_at": f"{day.isoformat()}T08:45:00+06:00", "external_event_id": event_id}]},
        )
        assert resp.status_code == 200
        assert resp.json()["processed"] == 1

    assert _sms_logs(client, headers) == []
    # Same student on a normal weekday is still late.
    tuesday = _next_weekday(date(2026, 1, 1), weekday=1, how_many=1)
    resp = client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest",
        headers=headers,
        json={"events": [{"person_code": "90011", "event_at": f"{tuesday.isoformat()}T08:45:00+06:00", "external_event_id": "tue-late"}]},
    )
    assert resp.status_code == 200
    late_logs = [row for row in _sms_logs(client, headers) if row["category"] == "late"]
    assert len(late_logs) == 1, late_logs
    assert late_logs[0]["student_id"] == student["id"]


def test_saturday_weekly_holiday_skips_absence_and_sms(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "sat", "ADM-SAT")
    _guardian(client, headers, student["id"], "Saturday Parent", "01710000009", primary=True)
    _set_policy(client, headers, weekly_holidays=[4, 5])

    saturday = _next_weekday(date(2026, 1, 1), weekday=5, how_many=1)
    result = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={saturday.isoformat()}&force=true",
        headers=headers,
    )
    assert result.status_code == 200
    body = result.json()
    assert body["marked_absent"] == 0, body
    assert body["sms_queued"] == 0, body
    assert body["skipped"] == "holiday", body
    assert _sms_logs(client, headers) == []


def test_daily_absence_sms_stops_after_first_three_school_days(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "streak", "ADM-STREAK")
    _guardian(client, headers, student["id"], "Streak Parent", "01715550001", primary=True)
    _set_policy(
        client,
        headers,
        ai_sms_writer_enabled=False,
        absent_sms_first_days=3,
        absent_sms_return_summary=True,
        absent_sms_mass_absence_min_students=10,
    )

    bodies = []
    for day in [date(2026, 2, 2), date(2026, 2, 3), date(2026, 2, 4), date(2026, 2, 5)]:
        response = client.post(
            f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
            headers=headers,
        )
        assert response.status_code == 200, response.text
        bodies.append(response.json())

    assert [body["sms_queued"] for body in bodies] == [1, 1, 1, 0], bodies
    assert bodies[3]["sms_suppressed_streak"] == 1, bodies[3]
    absent_logs = [row for row in _sms_logs(client, headers) if row["category"] == "absent"]
    assert len(absent_logs) == 3, absent_logs


def test_mass_absence_marks_students_but_suppresses_all_absence_sms(client):
    headers = _bootstrap(client)
    school = _school(client, headers)
    for index in range(10):
        _student(client, headers, school, f"mass{index}", f"ADM-MASS-{index}")
    _set_policy(
        client,
        headers,
        ai_sms_writer_enabled=False,
        absent_sms_mass_absence_threshold=60,
        absent_sms_mass_absence_min_students=10,
    )

    response = client.post(
        "/api/v1/attendance/students/process-absences?attendance_date=2026-02-09&force=true",
        headers=headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["marked_absent"] == 10, body
    assert body["mass_absence"] is True, body
    assert body["sms_suppressed_mass_absence"] == 10, body
    assert body["sms_queued"] == 0, body
    assert [row for row in _sms_logs(client, headers) if row["category"] == "absent"] == []


def test_approved_excuse_marks_leave_and_suppresses_absent_sms(client):
    from datetime import datetime, timezone

    from app.db.session import SessionLocal
    from app.models.attendance_excuse import AttendanceExcuse

    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "excused", "ADM-EXCUSED")
    guardian = _guardian(client, headers, student["id"], "Excuse Parent", "01715550002", primary=True)
    day = date(2026, 2, 10)
    with SessionLocal() as db:
        db.add(
            AttendanceExcuse(
                school_id=uuid.UUID(headers["X-School-Id"]),
                student_id=uuid.UUID(student["id"]),
                guardian_id=uuid.UUID(guardian["id"]),
                attendance_date=day,
                reason="Medical appointment",
                status="approved",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.post(
        f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
        headers=headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["marked_absent"] == 0, body
    assert body["marked_leave"] == 1, body
    assert body["sms_suppressed_excuse"] == 1, body
    assert body["sms_queued"] == 0, body
    assert [row for row in _sms_logs(client, headers) if row["category"] == "absent"] == []


def test_return_summary_after_long_absence(client):
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.user import User
    from app.services.absence_sms import process_returns

    headers = _bootstrap(client)
    school = _school(client, headers)
    student = _student(client, headers, school, "return", "ADM-RETURN")
    _guardian(client, headers, student["id"], "Return Parent", "01715550003", primary=True)
    _set_policy(
        client,
        headers,
        ai_sms_writer_enabled=False,
        absent_sms_first_days=2,
        absent_sms_return_summary=True,
        absent_sms_mass_absence_min_students=10,
    )
    for day in [date(2026, 2, 2), date(2026, 2, 3), date(2026, 2, 4)]:
        response = client.post(
            f"/api/v1/attendance/students/process-absences?attendance_date={day.isoformat()}&force=true",
            headers=headers,
        )
        assert response.status_code == 200, response.text

    marked = client.post(
        "/api/v1/attendance/students/mark",
        headers=headers,
        json={"attendance_date": "2026-02-05", "items": [{"student_id": student["id"], "status": "present"}]},
    )
    assert marked.status_code == 200, marked.text

    with SessionLocal() as db:
        user = db.scalar(select(User).order_by(User.created_at.asc()).limit(1))
        assert user is not None
        result = process_returns(
            db,
            school_id=uuid.UUID(headers["X-School-Id"]),
            user_id=user.id,
            return_date=date(2026, 2, 5),
        )
        db.commit()
    assert result["summaries_sent"] == 1, result
    summaries = [row for row in _sms_logs(client, headers) if row["category"] == "absence_summary"]
    assert len(summaries) == 1, summaries
    assert "Absent 3 school days" in summaries[0]["body"]
    assert "on time" in summaries[0]["body"]


def test_ai_writer_uses_valid_wording_and_rejects_invented_reasons(monkeypatch):
    from app.services import ai_message_writer

    context = {
        "message_type": "daily_absence",
        "student_name": "Child One",
        "medium": "English",
        "date": "2026-02-02",
        "absence_streak_days": 2,
        "total_absent_days_this_month": 2,
        "total_late_days_this_month": 0,
        "school_name": "Test School",
    }
    policy = {
        "ai_sms_writer_enabled": True,
        "ai_sms_language": "en",
        "ai_sms_tone": "friendly",
        "ai_sms_max_parts": 1,
        "absent_sms_template": "Dear Guardian, {{student_name}} was absent on {{date}}.",
    }

    monkeypatch.setattr(
        ai_message_writer,
        "_call_ai",
        lambda messages, max_tokens: "Dear guardian, Child One was absent today (2026-02-02). This is day 2 of absence.",
    )
    assert "day 2" in ai_message_writer.compose_daily_absence(context, policy)

    monkeypatch.setattr(
        ai_message_writer,
        "_call_ai",
        lambda messages, max_tokens: "Dear guardian, Child One is sick and was absent on 2026-02-02.",
    )
    fallback = ai_message_writer.compose_daily_absence(context, policy)
    assert fallback.startswith("Dear Guardian,")
    assert "sick" not in fallback.lower()


def test_bangla_absence_uses_reviewed_fallback_without_ai(monkeypatch):
    from app.services import ai_message_writer

    called = []
    monkeypatch.setattr(
        ai_message_writer,
        "_call_ai",
        lambda messages, max_tokens: called.append(True) or "Dear guardian, Child Two was absent.",
    )
    context = {
        "message_type": "daily_absence",
        "student_name": "Child Two",
        "medium": "Bangla",
        "date": "2026-11-13",
        "absence_streak_days": 2,
        "total_absent_days_this_month": 2,
        "total_late_days_this_month": 0,
        "school_name": "Test School",
    }
    policy = {
        "ai_sms_writer_enabled": True,
        "ai_sms_language": "auto",
        "ai_sms_tone": "friendly",
        "ai_sms_max_parts": 1,
        "absent_sms_template": "Dear Guardian, {{student_name}} was absent on {{date}}.",
    }

    body = ai_message_writer.compose_daily_absence(context, policy)
    assert called == []
    assert body.startswith("প্রিয় অভিভাবক")
    assert "২০২৬-১১-১৩" in body
    assert "২ দিন" in body
