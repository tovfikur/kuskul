# Hikvision Biometric Student Attendance in KusKul

## Summary

Implemented a Hikvision biometric attendance foundation in KusKul.

The supplied Odoo module is a cloud-log downloader, not a complete student-attendance integration. It:

- Gets a HikCentral Connect access token from `appKey` + `secretKey`.
- Retrieves attendance/certificate event logs, paginated.
- Filters them by device name.
- Stores raw fields: `personCode`, names, timestamp, and device.
- Avoids duplicate raw logs.
- Runs a cron job every hour to re-download the last two days.

Its key limitation: it never maps `personCode` to an Odoo student/employee or converts device punches into daily attendance. It also hardcodes a `+08:00` time offset, which is wrong for Bangladesh.

## Previous KusKul attendance workflow

```text
Teacher selects Class + Section + Date
  -> app loads active enrolled students
  -> teacher marks Present / Absent / Leave
  -> batch saves student_attendance rows
```

## New KusKul biometric flow

```text
Student gives fingerprint on Hikvision device
  -> Hikvision matches fingerprint internally
  -> device/cloud produces personCode + timestamp
  -> KusKul sync or trusted gateway receives the event
  -> deduplicates the raw event
  -> maps device personCode to a KusKul student
  -> validates active student and current active enrolment
  -> first valid entry that day creates Present or Late attendance
  -> later punches remain audit events and never overwrite attendance
```

KusKul never stores fingerprint templates. Hikvision remains the biometric authority; KusKul only stores the matched device person code and event metadata.

## Added implementation

- Hikvision device configuration, student credential mapping, and immutable raw event tables.
- Database migration: `backend/alembic/versions/0036_hikvision_student_attendance.py`
- Hikvision integration API: `backend/app/api/v1/endpoints/hikvision_attendance.py`
- Data models and request schemas.
- Event deduplication by device/person/timestamp and device/external-event ID.
- Current-year enrolment validation before marking a student present.
- Optional `late_after`, evaluated in the configured device timezone (`Asia/Dhaka` by default).
- Student attendance UI now displays device-generated `Late` records.
- Focused backend test for mapping, projection, late status, and duplicate events.
- Deployment/setup guide: `docs/Hikvision_Student_Attendance.md`

## API endpoints

- `POST /api/v1/attendance/hikvision/devices`
- `POST /api/v1/attendance/hikvision/devices/{device_id}/credentials`
- `POST /api/v1/attendance/hikvision/devices/{device_id}/events/ingest`
- `POST /api/v1/attendance/hikvision/devices/{device_id}/sync`
- `GET /api/v1/attendance/hikvision/devices`

The sync endpoint follows the cloud API pattern used by the supplied Odoo module: authenticate, pull records, filter to the configured device, normalize them, and ingest them. Hikvision device/API capabilities vary by model and deployment, so confirm your terminal supports HikCentral Connect event retrieval or configure a trusted local gateway for ISAPI events. Hikvision documents access-control event/person APIs separately for device integrations: <https://open.hikvision.com/osp>.

## Before production

1. Run `alembic upgrade head`.
2. Enrol each student on the Hikvision device with a stable `personCode`; using the KusKul admission number is recommended.
3. Map each code to its student through the credential endpoint.
4. Set up a protected server-side scheduler to call `/sync` every 2–5 minutes, or a trusted on-premise gateway that posts normalized events to `/events/ingest`.
5. Move Hikvision app secrets into the deployment secret manager/encryption layer. The current project has no secret-vault abstraction, so storing cloud credentials in ordinary database fields should not be the final production arrangement.

## Verification

Python syntax compilation and the frontend production build passed. Backend pytest could not run because `pytest` is not installed in this environment.
