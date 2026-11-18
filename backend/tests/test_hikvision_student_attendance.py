import uuid

import pytest


@pytest.fixture(autouse=True)
def _disable_rate_limit(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "rate_limit_enabled", False)


SAAS_HOST_HEADERS = {"X-Forwarded-Host": "admin.testserver", "X-Tenant-Subdomain": "admin"}


def _bootstrap(client) -> dict:
    suffix = uuid.uuid4().hex[:8]
    subdomain = f"hik{suffix[:12]}"

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
            "name": f"Hik School {suffix}",
            "subdomain": subdomain,
            "admin_email": f"admin_hik_{suffix}@example.com",
            "admin_password": "supersecurepassword",
            "school_name": f"Hik School {suffix}",
            "school_code": f"HIK{suffix[:6].upper()}",
        },
    )
    assert prov.status_code == 200, prov.text
    school_id = prov.json()["school_id"]

    login = client.post(
        "/api/v1/auth/login",
        headers={"X-Tenant-Subdomain": subdomain},
        json={
            "email": f"admin_hik_{suffix}@example.com",
            "password": "supersecurepassword",
        },
    )
    assert login.status_code == 200, login.text
    return {
        "Authorization": f"Bearer {login.json()['access_token']}",
        "X-Tenant-Subdomain": subdomain,
        "X-School-Id": school_id,
    }


def test_hikvision_event_marks_the_mapped_active_student_once(client):
    headers = _bootstrap(client)
    year = client.post(
        "/api/v1/academic-years", headers=headers,
        json={"name": "2026", "start_date": "2026-01-01", "end_date": "2026-12-31", "is_current": True},
    ).json()
    classroom = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 1", "numeric_value": 1}).json()
    section = client.post("/api/v1/sections", headers=headers, json={"class_id": classroom["id"], "name": "A"}).json()
    student = client.post(
        "/api/v1/students", headers=headers,
        json={"first_name": "Biometric", "admission_no": "HK-1", "gender": "male"},
    ).json()
    enrollment = client.post(
        "/api/v1/enrollments", headers=headers,
        json={"student_id": student["id"], "academic_year_id": year["id"], "class_id": classroom["id"], "section_id": section["id"]},
    )
    assert enrollment.status_code == 200

    device = client.post(
        "/api/v1/attendance/hikvision/devices", headers=headers,
        json={"name": "Main Gate", "timezone": "Asia/Dhaka", "late_after": "08:30"},
    ).json()
    mapped = client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/credentials", headers=headers,
        json={"student_id": student["id"], "person_code": "10001"},
    )
    assert mapped.status_code == 200

    payload = {"events": [{"person_code": "10001", "event_at": "2026-02-01T08:45:00+06:00", "external_event_id": "event-1"}]}
    first = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers, json=payload)
    assert first.status_code == 200
    assert first.json()["processed"] == 1
    second = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers, json=payload)
    assert second.status_code == 200
    assert second.json()["duplicate"] == 1

    rows = client.get("/api/v1/attendance/students/date/2026-02-01", headers=headers).json()
    assert len(rows) == 1
    assert rows[0]["student_id"] == student["id"]
    assert rows[0]["status"] == "present"
    assert rows[0]["is_late"] is True

    summary = client.get(
        "/api/v1/attendance/students/today-summary?attendance_date=2026-02-01",
        headers=headers,
    )
    assert summary.status_code == 200
    assert summary.json()["sections"] == [{
        "class_id": classroom["id"],
        "class_name": "Grade 1",
        "section_id": section["id"],
        "section_name": "A",
        "total_students": 1,
        "present": 0,
        "late": 1,
        "leave": 0,
        "absent": 0,
    }]


def test_today_summary_includes_available_classes_and_sections_without_enrolments(client):
    headers = _bootstrap(client)
    client.post(
        "/api/v1/academic-years", headers=headers,
        json={"name": "2026", "start_date": "2026-01-01", "end_date": "2026-12-31", "is_current": True},
    )
    class_without_sections = client.post(
        "/api/v1/classes", headers=headers, json={"name": "Grade 1", "numeric_value": 1},
    ).json()
    class_with_sections = client.post(
        "/api/v1/classes", headers=headers, json={"name": "Grade 2", "numeric_value": 2},
    ).json()
    section_a = client.post(
        "/api/v1/sections", headers=headers, json={"class_id": class_with_sections["id"], "name": "A"},
    ).json()
    section_b = client.post(
        "/api/v1/sections", headers=headers, json={"class_id": class_with_sections["id"], "name": "B"},
    ).json()

    summary = client.get("/api/v1/attendance/students/today-summary", headers=headers)

    assert summary.status_code == 200
    groups = {(row["class_id"], row["section_id"]): row for row in summary.json()["sections"]}
    assert groups[(class_without_sections["id"], None)] == {
        "class_id": class_without_sections["id"],
        "class_name": "Grade 1",
        "section_id": None,
        "section_name": "Class Summary",
        "total_students": 0,
        "present": 0,
        "late": 0,
        "leave": 0,
        "absent": 0,
    }
    assert (class_with_sections["id"], None) not in groups
    assert groups[(class_with_sections["id"], section_a["id"])]["total_students"] == 0
    assert groups[(class_with_sections["id"], section_b["id"])]["total_students"] == 0


def test_hikvision_card_number_automatically_matches_current_roll_number(client):
    headers = _bootstrap(client)
    year = client.post(
        "/api/v1/academic-years", headers=headers,
        json={"name": "2026", "start_date": "2026-01-01", "end_date": "2026-12-31", "is_current": True},
    ).json()
    classroom = client.post("/api/v1/classes", headers=headers, json={"name": "Grade 2", "numeric_value": 2}).json()
    student = client.post(
        "/api/v1/students", headers=headers,
        json={"first_name": "Card", "admission_no": "HK-2", "gender": "female"},
    ).json()
    enrolled = client.post(
        "/api/v1/enrollments", headers=headers,
        json={"student_id": student["id"], "academic_year_id": year["id"], "class_id": classroom["id"], "roll_number": "20260042"},
    )
    assert enrolled.status_code == 200
    device = client.post(
        "/api/v1/attendance/hikvision/devices", headers=headers,
        json={"name": "Main Gate", "timezone": "Asia/Dhaka"},
    ).json()

    response = client.post(
        f"/api/v1/attendance/hikvision/devices/{device['id']}/events/ingest", headers=headers,
        json={"events": [{"person_code": "device-user-99", "card_number": "20260042", "event_at": "2026-02-02T07:59:00+06:00"}]},
    )
    assert response.status_code == 200
    assert response.json()["processed"] == 1
    rows = client.get("/api/v1/attendance/students/date/2026-02-02", headers=headers).json()
    assert len(rows) == 1
    assert rows[0]["student_id"] == student["id"]
    assert rows[0]["status"] == "present"


def test_hikcentral_sync_batches_more_than_ingest_limit(client, monkeypatch):
    """A cloud search can return more records than the public ingest limit."""
    headers = _bootstrap(client)
    device = client.post(
        "/api/v1/attendance/hikvision/devices",
        headers=headers,
        json={
            "name": "Main Gate",
            "app_key": "test-app-key",
            "secret_key": "test-secret-key",
            "area_domain": "https://example.hikcentralconnect.com",
        },
    ).json()

    total_records = 5001

    def fake_post_json(url, payload, headers):
        if url.endswith("/token/get"):
            return {"errorCode": "0", "data": {"accessToken": "token", "areaDomain": "https://example.hikcentralconnect.com"}}
        start = (payload["pageIndex"] - 1) * payload["pageSize"]
        end = min(start + payload["pageSize"], total_records)
        return {
            "data": {
                "recordList": [
                    {
                        "personCode": f"unmapped-{index}",
                        "recordTime": _recent_cloud_punch(),
                        "eventId": f"event-{index}",
                    }
                    for index in range(start, end)
                ],
                "totalNum": total_records,
            }
        }

    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance._post_json", fake_post_json)

    response = client.post(f"/api/v1/attendance/hikvision/devices/{device['id']}/sync", headers=headers)

    assert response.status_code == 200
    assert response.json()["pulled"] == total_records
    assert response.json()["unmatched"] == total_records


def _recent_cloud_punch():
    from datetime import datetime, timedelta, timezone
    return (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()


def _cloud_device(client):
    headers = _bootstrap(client)
    device = client.post("/api/v1/attendance/hikvision/devices", headers=headers, json={
        "name": "Main Gate", "app_key": "test-key", "secret_key": "test-secret",
    }).json()
    return headers, device, f"/api/v1/attendance/hikvision/devices/{device['id']}/sync"


def _mock_cloud(monkeypatch, pages, seen=None):
    def post(url, payload, headers):
        if url.endswith("/token/get"):
            return {"errorCode": "0", "data": {"accessToken": "token", "areaDomain": "https://example.com"}}
        if seen is not None:
            seen.append(payload)
        return {"errorCode": "0", "data": {"recordList": pages.get(payload["pageIndex"], []), "totalNum": 1}}
    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance._post_json", post)


def test_duplicates_in_one_ingest_and_across_cloud_pages(client, monkeypatch):
    headers, device, url = _cloud_device(client)
    event = {"person_code": "unmapped", "event_at": "2026-02-01T08:00:00+06:00"}
    response = client.post(url.replace("/sync", "/events/ingest"), headers=headers, json={"events": [event, event]})
    assert response.status_code == 200
    assert response.json()["unmatched"] == 1
    assert response.json()["duplicate"] == 1
    record = {"personCode": "cloud", "recordTime": _recent_cloud_punch(), "eventId": "one"}
    other = {**record, "personCode": "second", "eventId": "two"}
    _mock_cloud(monkeypatch, {1: [record, record], 2: [record, other]})
    response = client.post(url, headers=headers)
    assert response.status_code == 200
    assert response.json()["unmatched"] == 2
    assert response.json()["duplicate"] == 2
    retry = client.post(url, headers=headers)
    assert retry.json()["duplicate"] == 4


def test_cloud_cutoff_is_fixed_and_recent_punches_are_deferred(client, monkeypatch):
    from datetime import datetime, timedelta, timezone
    from app.api.v1.endpoints import hikvision_attendance as module
    frozen = datetime(2026, 9, 13, 6, 0, tzinfo=timezone.utc)
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return frozen.astimezone(tz) if tz else frozen.replace(tzinfo=None)
    monkeypatch.setattr(module, "datetime", Clock)
    headers, device, url = _cloud_device(client)
    records = [{"personCode": str(minutes), "recordTime": (frozen - timedelta(minutes=minutes)).isoformat()}
               for minutes in [13, 12, 11, 0, -1]]
    seen = []
    _mock_cloud(monkeypatch, {1: records[:2], 2: records[2:]}, seen)
    response = client.post(url, headers=headers)
    assert response.status_code == 200
    assert response.json()["unmatched"] == 2
    assert response.json()["deferred"] == 3
    assert len({body["endTime"] for body in seen}) == 1
    assert seen[0]["endTime"] == (frozen - timedelta(minutes=12)).isoformat()
    assert len(seen) == 3  # Continue beyond short pages and inaccurate totals.


def test_saved_pages_survive_cloud_failure_without_advancing_success(client, monkeypatch):
    from app.core.problems import problem
    from app.db.session import SessionLocal
    from app.models.hikvision_attendance import HikvisionDevice, HikvisionAttendanceEvent
    from sqlalchemy import select, func
    headers, device, url = _cloud_device(client)
    record = {"personCode": "one", "recordTime": _recent_cloud_punch()}
    def post(url, payload, headers):
        if url.endswith("/token/get"):
            return {"errorCode": "0", "data": {"accessToken": "token", "areaDomain": "https://example.com"}}
        if payload["pageIndex"] == 2:
            raise problem(status_code=502, title="Bad Gateway", detail="Temporary cloud failure")
        return {"data": {"recordList": [record]}}
    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance._post_json", post)
    assert client.post(url, headers=headers).status_code == 502
    with SessionLocal() as db:
        assert db.get(HikvisionDevice, uuid.UUID(device["id"])).last_sync_at is None
        assert db.scalar(select(func.count()).select_from(HikvisionAttendanceEvent).where(
            HikvisionAttendanceEvent.device_id == uuid.UUID(device["id"]))) == 1
    _mock_cloud(monkeypatch, {1: [record]})
    retry = client.post(url, headers=headers)
    assert retry.status_code == 200
    assert retry.json()["duplicate"] == 1


def test_cloud_repeated_page_and_provider_error_do_not_report_success(client, monkeypatch):
    headers, device, url = _cloud_device(client)
    record = {"personCode": "one", "recordTime": _recent_cloud_punch()}
    _mock_cloud(monkeypatch, {1: [record], 2: [record]})
    response = client.post(url, headers=headers)
    assert response.status_code == 502
    assert "repeated a page" in response.json()["detail"]
    def error(url, payload, headers):
        if url.endswith("/token/get"):
            return {"errorCode": "0", "data": {"accessToken": "token", "areaDomain": "https://example.com"}}
        return {"errorCode": "123", "data": {"recordList": []}}
    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance._post_json", error)
    assert client.post(url, headers=headers).status_code == 502


def test_invalid_records_are_skipped_without_discarding_valid_punches_or_blocking_checkpoint(client, monkeypatch):
    from app.db.session import SessionLocal
    from app.models.hikvision_attendance import HikvisionDevice
    headers, device, url = _cloud_device(client)
    _mock_cloud(monkeypatch, {1: [
        {"personCode": "valid", "recordTime": _recent_cloud_punch()},
        {"personInfo": "malformed"},
    ]})
    response = client.post(url, headers=headers)
    assert response.status_code == 200
    assert response.json()["invalid"] == 1
    assert response.json()["unmatched"] == 1
    with SessionLocal() as db:
        assert db.get(HikvisionDevice, uuid.UUID(device["id"])).last_sync_at is not None


def test_sync_window_catches_up_after_long_downtime():
    from datetime import datetime, timedelta, timezone
    from app.api.v1.endpoints.hikvision_attendance import _sync_since
    from app.models.hikvision_attendance import HikvisionDevice
    last = datetime.now(timezone.utc) - timedelta(days=7)
    device = HikvisionDevice(timezone="Asia/Dhaka", last_sync_at=last)
    assert _sync_since(device) == last - timedelta(days=1, minutes=12)


def test_worker_waits_for_delayed_closing_punches(monkeypatch):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    from app.scripts import run_hikvision_attendance as worker
    current = datetime(2026, 9, 13, 17, 11, tzinfo=ZoneInfo("Asia/Dhaka"))
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return current
    monkeypatch.setattr(worker, "datetime", Clock)
    assert not worker._school_day_has_ended({"attendance_end_time": "17:00"})
    current = current.replace(minute=12)
    assert worker._school_day_has_ended({"attendance_end_time": "17:00"})


def test_worker_runs_absences_even_when_a_school_device_fails(monkeypatch):
    from types import SimpleNamespace
    from app.scripts import run_hikvision_attendance as worker
    devices = [SimpleNamespace(id="first", school_id="school"), SimpleNamespace(id="second", school_id="school")]
    class DB:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def scalars(self, statement): return SimpleNamespace(all=lambda: devices)
        def scalar(self, statement): return SimpleNamespace(id="user")
        def rollback(self): pass
    synced = []
    absences = []
    def sync(device_id, **kwargs):
        synced.append(device_id)
        if device_id == "first":
            raise RuntimeError("Cloud unavailable")
        return {}
    monkeypatch.setattr(worker, "SessionLocal", DB)
    monkeypatch.setattr(worker, "_attendance_policy", lambda *args: {})
    monkeypatch.setattr(worker, "_school_day_has_ended", lambda *args: True)
    monkeypatch.setattr(worker, "sync_hikcentral_connect", sync)
    monkeypatch.setattr(worker, "process_absences", lambda **kwargs: absences.append(kwargs))
    monkeypatch.setattr(worker, "process_returns", lambda **kwargs: {})
    monkeypatch.setattr(worker, "deliver_queued_attendance_sms", lambda *args, **kwargs: {"sent": 0, "failed": 0})
    with pytest.raises(SystemExit) as exc:
        worker.main()
    assert exc.value.code == 1
    assert synced == ["first", "second"]
    assert len(absences) == 1
    assert absences[0]["school_id"] == "school"


@pytest.mark.parametrize("records,usable", [
    ([], 0),
    ([{"personCode": "42", "recordTime": _recent_cloud_punch()}], 1),
    ([{"personCode": "42", "recordTime": _recent_cloud_punch(), "deviceName": "Another Gate"}], 0),
])
def test_connection_reads_only_one_sample_page_without_saving(client, monkeypatch, records, usable):
    from sqlalchemy import select, func
    from app.db.session import SessionLocal
    from app.models.hikvision_attendance import HikvisionDevice, HikvisionAttendanceEvent
    headers, device, url = _cloud_device(client)
    calls = []
    def post(url, payload, headers, *, timeout):
        calls.append((url, payload, timeout))
        if url.endswith("/token/get"):
            return {"errorCode": "0", "data": {"accessToken": "token", "areaDomain": "https://example.com"}}
        return {"data": {"recordList": records, "totalNum": 100000}}
    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance._post_json", post)
    response = client.post(url.replace("/sync", "/test-connection"), headers=headers)
    assert response.status_code == 200
    assert response.json() == {"connected": True, "sampled": len(records), "usable": usable}
    assert len(calls) == 2
    assert [call[2] for call in calls] == [5, 5]
    assert calls[1][1]["pageIndex"] == 1
    assert calls[1][1]["pageSize"] == 5
    with SessionLocal() as db:
        assert db.get(HikvisionDevice, uuid.UUID(device["id"])).last_sync_at is None
        assert db.scalar(select(func.count()).select_from(HikvisionAttendanceEvent).where(
            HikvisionAttendanceEvent.device_id == uuid.UUID(device["id"]))) == 0


def test_connection_network_timeout_is_reported(client, monkeypatch):
    headers, device, url = _cloud_device(client)
    def timeout(*args, **kwargs):
        assert kwargs["timeout"] == 5
        raise TimeoutError("Connection timed out")
    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance.urlopen", timeout)
    response = client.post(url.replace("/sync", "/test-connection"), headers=headers)
    assert response.status_code == 502
    assert "timed out" in response.json()["detail"]


def test_connection_search_failure_is_not_reported_as_connected(client, monkeypatch):
    headers, device, url = _cloud_device(client)
    def post(url, payload, headers, *, timeout):
        if url.endswith("/token/get"):
            return {"errorCode": "0", "data": {"accessToken": "token", "areaDomain": "https://example.com"}}
        return {"errorCode": "403", "data": {"recordList": []}}
    monkeypatch.setattr("app.api.v1.endpoints.hikvision_attendance._post_json", post)
    assert client.post(url.replace("/sync", "/test-connection"), headers=headers).status_code == 502


def test_manual_sync_uses_small_requests_and_keeps_a_fixed_date_window(client, monkeypatch):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    from app.db.session import SessionLocal
    from app.models.hikvision_attendance import HikvisionDevice
    headers, device, url = _cloud_device(client)
    url = url.replace('/sync', '/sync-batch')
    day = (datetime.now(ZoneInfo('Asia/Dhaka')) - timedelta(days=1)).date()
    calls = []
    def post(url, payload, headers, *, timeout):
        assert timeout == 8
        if url.endswith('/token/get'):
            return {'errorCode': '0', 'data': {'accessToken': 'token', 'areaDomain': 'https://example.com'}}
        calls.append(payload)
        start = (payload['pageIndex'] - 1) * 100
        return {'data': {'recordList': [
            {'personCode': str(index), 'recordTime': f'{day}T08:00:00+06:00'}
            for index in range(start, min(start + 100, 205))
        ]}}
    monkeypatch.setattr('app.api.v1.endpoints.hikvision_attendance._post_json', post)
    body = {'start_date': str(day), 'end_date': str(day)}
    results = []
    for page in range(1, 5):
        response = client.post(url, headers=headers, json=body)
        assert response.status_code == 200, response.text
        result = response.json()
        assert len(calls) == page  # Exactly one cloud data page per HTTP request.
        assert calls[-1]['pageSize'] == 100
        results.append(result)
        if not result['done']:
            body.update(page_index=result['next_page'], cutoff=result['cutoff'], previous_page=result['previous_page'])
    assert results[-1]['done'] is True
    assert sum(result['unmatched'] for result in results) == 205
    assert len({call['endTime'] for call in calls}) == 1
    assert calls[0]['beginTime'].startswith(str(day - timedelta(days=1)))  # Dhaka midnight in UTC.
    with SessionLocal() as db:
        assert db.get(HikvisionDevice, uuid.UUID(device['id'])).last_sync_at is None
    # Retrying after interruption replays a saved batch safely.
    retry = client.post(url, headers=headers, json={'start_date': str(day), 'end_date': str(day)})
    assert retry.json()['duplicate'] == 100


def test_manual_sync_rejects_dates_outside_thirty_days_and_missing_cursor(client, monkeypatch):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    headers, device, url = _cloud_device(client)
    today = datetime.now(ZoneInfo('Asia/Dhaka')).date()
    def unexpected(*args, **kwargs):
        raise AssertionError('Invalid dates must not contact the cloud')
    monkeypatch.setattr('app.api.v1.endpoints.hikvision_attendance._post_json', unexpected)
    for body in [
        {'start_date': str(today - timedelta(days=30)), 'end_date': str(today)},
        {'start_date': str(today), 'end_date': str(today + timedelta(days=1))},
        {'start_date': str(today), 'end_date': str(today - timedelta(days=1))},
        {'start_date': str(today), 'end_date': str(today), 'page_index': 2},
    ]:
        assert client.post(url.replace('/sync', '/sync-batch'), headers=headers, json=body).status_code == 400


def test_manual_sync_filters_punches_outside_selected_dates(client, monkeypatch):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    headers, device, url = _cloud_device(client)
    today = datetime.now(ZoneInfo('Asia/Dhaka')).date()
    day = today - timedelta(days=1)
    def post(url, payload, headers, *, timeout):
        if url.endswith('/token/get'):
            return {'errorCode': '0', 'data': {'accessToken': 'token', 'areaDomain': 'https://example.com'}}
        return {'data': {'recordList': [
            {'personCode': 'before', 'recordTime': f'{day - timedelta(days=1)}T08:00:00+06:00'},
            {'personCode': 'selected', 'recordTime': f'{day}T08:00:00+06:00'},
            {'personCode': 'after', 'recordTime': f'{today}T08:00:00+06:00'},
        ]}}
    monkeypatch.setattr('app.api.v1.endpoints.hikvision_attendance._post_json', post)
    response = client.post(url.replace('/sync', '/sync-batch'), headers=headers, json={'start_date': str(day), 'end_date': str(day)})
    assert response.status_code == 200
    assert response.json()['unmatched'] == 1
    assert response.json()['ignored'] == 1
    assert response.json()['deferred'] == 1
    result = response.json()
    repeated = client.post(url.replace('/sync', '/sync-batch'), headers=headers, json={
        'start_date': str(day), 'end_date': str(day), 'page_index': result['next_page'],
        'cutoff': result['cutoff'], 'previous_page': result['previous_page'],
    })
    assert repeated.status_code == 502


def test_cron_catchup_never_goes_back_more_than_thirty_calendar_days(client):
    from datetime import datetime, timedelta, time, timezone
    from zoneinfo import ZoneInfo
    from app.api.v1.endpoints.hikvision_attendance import _sync_since
    from app.models.hikvision_attendance import HikvisionDevice
    now = datetime.now(ZoneInfo('Asia/Dhaka'))
    device = HikvisionDevice(timezone='Asia/Dhaka', last_sync_at=now - timedelta(days=365))
    assert _sync_since(device) == datetime.combine(now.date() - timedelta(days=29), time.min, tzinfo=now.tzinfo).astimezone(timezone.utc)
