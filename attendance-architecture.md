# KusKul — Attendance System & Hikvision Device Integration Architecture

> Code-ground-truth document for the attendance subsystem in this repository.
> Covers every attendance feature, the Hikvision biometric device integration,
> the configuration surface, the event-processing rules, scheduling, security,
> and the verification approach.
>
> Primary sources: `backend/app/api/v1/endpoints/attendance_students.py`,
> `attendance_staff.py`, `hikvision_attendance.py`,
> `backend/app/models/teacher_assignment.py`,
> `backend/app/models/hikvision_attendance.py`,
> `backend/app/models/setting.py`, `backend/app/models/attendance_excuse.py`,
> `backend/app/schemas/attendance.py`, `backend/app/schemas/hikvision_attendance.py`,
> `backend/alembic/versions/0036_hikvision_student_attendance.py`,
> `backend/app/scripts/run_hikvision_attendance.py`,
> `scripts/run-hikvision-attendance-cron.sh`,
> `frontend/src/features/students/components/{AttendanceTab,TodayAttendanceTab,AttendanceSettingsTab}.tsx`,
> `frontend/src/features/staff/components/attendance/AttendanceTab.tsx`, and
> `backend/tests/test_hikvision_student_attendance.py`.

---

## 1. Overview

KusKul supports **two complementary attendance capture paths**:

1. **Manual** — a teacher picks a Class + Section + Date and marks every student
   `present` / `absent` / `leave` (or `late`), then saves. Staff attendance is taken
   the same way, plus QR check-in/check-out.
2. **Biometric (Hikvision)** — a Hikvision terminal performs the fingerprint match
   and emits a **person code + timestamp**. KusKul stores the raw event immutably,
   maps the code to a student, and projects the **first valid daily punch** into the
   student's attendance for that local school day.

A central **Attendance Settings** record (`settings` table, key
`attendance.settings`) drives late-cutoff, absence automation, and guardian SMS rules.
A scheduled worker (`scripts/run_hikvision_attendance.py`) re-syncs the device during
the school day and runs absence processing once the day ends.

---

## 2. Data Model

### 2.1 Core attendance tables

#### `student_attendance` (`StudentAttendance`, `models/teacher_assignment.py:23`)

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | uuid PK | default uuid4 | |
| `attendance_date` | datetime (UTC) | indexed, not null | the **school day** (midnight UTC of the local day in `Asia/Dhaka`) |
| `student_id` | uuid FK | indexed, not null | |
| `section_id` | uuid FK | nullable | class/section at time of record |
| `class_id` | uuid FK | nullable | |
| `status` | str | default `present` | `present` / `absent` / `leave` (biometric `late` is stored as `present` + `is_late=true`) |
| `is_late` | bool | default `false` | separates a late arrival from a plain present |
| `created_at` | datetime (UTC) | not null | |

> One row per (student, day) is enforced by an upsert pattern in the API — later
> writes overwrite status for `absent->present` and manual updates, but the biometric
> path refuses to overwrite `leave`/`present`/`late` (see §5).

#### `staff_attendance` (`StaffAttendance`, `models/teacher_assignment.py:36`)

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `attendance_date` | datetime (UTC) | school day |
| `staff_id` | uuid FK | |
| `status` | str | `present` / `absent` / `late` / `on-leave` |
| `check_in_at` / `check_out_at` | datetime (UTC) | nullable timing |
| `method` | str | `qr` / manual / etc. |
| `device_id` | str | nullable |
| `created_at` | datetime (UTC) | |

#### `attendance_excuses` (`AttendanceExcuse`, `models/attendance_excuse.py`)

Pending/approved/rejected leave/excuse requests tied to a student and a date.
Endpoints: `GET /attendance/students/excuses/pending`,
`POST /attendance/students/excuses/{id}/approve|reject`.

### 2.2 Hikvision tables (migration `0036`, idempotent `CREATE TABLE IF NOT EXISTS`)

#### `hikvision_devices` (`HikvisionDevice`, `models/hikvision_attendance.py:11`)

| Column | Type | Default / notes |
|---|---|---|
| `id` | uuid PK | |
| `school_id` | uuid FK `schools.id` | indexed |
| `name` | str(120) | must match Hik-Connect device name |
| `external_device_id` | str(128) | Hik-Connect serial / cloud device id; indexed |
| `provider` | str(32) | default `hikcentral_connect` |
| `api_url` | str(255) | default `/api/hccgw/acs/v1/event/certificaterecords/search` |
| `app_key` | str(255) | HikCentral Connect app key |
| `secret_key` | str(255) | HikCentral Connect secret |
| `area_domain` | str(255) | e.g. `https://isgp-team.hikcentralconnect.com` |
| `timezone` | str(64) | default `Asia/Dhaka` |
| `late_after` | str(5) | `HH:MM` threshold; auto-derived from school start + grace |
| `active` | bool | default true |
| `last_sync_at` | datetime (UTC) | nullable |
| `created_at` | datetime (UTC) | |

Indexes: `school_id`, `external_device_id`.

#### `hikvision_student_credentials` (`HikvisionStudentCredential`, `...:38`)

Maps a device person code to a student (explicit mapping path).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid PK | |
| `device_id` | uuid FK `hikvision_devices.id` | indexed |
| `student_id` | uuid FK `students.id` | indexed |
| `person_code` | str(64) | |
| `active` | bool | default true |
| `created_at` | datetime (UTC) | |
| unique | `(device_id, person_code)` | `uq_hikvision_device_person_code` |

#### `hikvision_attendance_events` (`HikvisionAttendanceEvent`, `...:52`) — immutable raw log

| Column | Type | Constraints / notes |
|---|---|---|
| `id` | uuid PK | |
| `device_id` | uuid FK | indexed |
| `student_id` | uuid FK `students.id` | nullable, indexed |
| `attendance_id` | uuid FK `student_attendance.id` | nullable, indexed |
| `external_event_id` | str(128) | unique w/ device (cloud event id) |
| `person_code` | str(64) | |
| `event_at` | datetime (UTC) | indexed |
| `verification_method` | str(32) | `fingerprint`, card, etc. |
| `processing_status` | str(24) | `unmatched` / `processed` / `corrected_absent` / `already_marked` / `ignored` / `duplicate` |
| `raw_payload` | JSON | full source record |
| `received_at` | datetime (UTC) | |
| unique | `(device_id, external_event_id)` | `uq_hikvision_device_external_event` |
| unique | `(device_id, person_code, event_at)` | `uq_hikvision_device_person_time` |

### 2.3 Attendance settings (`settings` table, key `attendance.settings`)

Stored as a JSON string in `Setting.value`. Managed in the UI by
`features/students/components/AttendanceSettingsTab.tsx`.

| Key | Type | Default | Effect |
|---|---|---|---|
| `school_start_time` | `HH:MM` | `08:00` | reference start for late cutoff |
| `attendance_end_time` | `HH:MM` | `17:00` | after this (in `Asia/Dhaka`) absences are auto-marked |
| `sync_interval_minutes` | int | `10` | max 60; drives worker poll cadence |
| `attendance_cutoff_time` | `HH:MM` | `10:00` | per-day hard cut-off (legacy/secondary) |
| `late_grace_minutes` | int | `0` | added to start time → `late_after` |
| `send_late_sms` | bool | `false` | queue SMS on late arrival |
| `send_absent_sms` | bool | `false` | queue SMS for absences |
| `late_sms_template` | str | `Dear Guardian, {{student_name}} arrived late at {{time}} on {{date}}.` | |
| `absent_sms_template` | str | `Dear Guardian, {{student_name}} was absent on {{date}}.` | |
| `auto_mark_absent` | bool | `false` | allow absence automation after cutoff |
| `exclude_holidays_from_absence` | bool | `true` | skip holidays in absence pass |

Placeholders `{{student_name}}`, `{{date}}`, `{{time}}` are interpolated by the backend
(`attendance_students.py:_queue_late_sms` / `process_absences`).

---

## 3. Attendance Features

### 3.1 Manual student attendance

**Endpoints** (`attendance_students.py`, router on `/attendance/students`, requires
`attendance:read` at router level; writes require `attendance:write`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/mark` (and `/bulk-mark`) | Upsert `student_attendance` rows for a class/section/date |
| GET | `/date/{attendance_date}` | List attendance for a day (filterable by class/section) |
| GET | `/today-summary` | Per-class/section aggregates for today (or a date) |
| GET | `/sync-window` | Returns `Asia/Dhaka` + `school_start_time` + `attendance_end_time` for the Hikvision cron |
| POST | `/process-absences` | Idempotently mark missing active enrollments absent after the cutoff |
| GET | `/{attendance_id}` | Single record |
| PUT | `/{attendance_id}` | Edit status of one record |
| DELETE | `/{attendance_id}` | Remove a record |
| GET | `/report`, `/summary`, `/defaulters`, `/statistics`, `POST /send-alerts` | **501 stubs** (not implemented) |
| GET | `/excuses/pending` | List pending excuse requests |
| POST | `/excuses/{id}/approve` | Approve an excuse |
| POST | `/excuses/{id}/reject` | Reject an excuse |

**Upsert semantics** (`mark_student_attendance`): for each item it looks up an existing
row for `(student, day)`; if present it updates `status`/`is_late`/`class/section`,
otherwise it inserts. `late` is persisted as `status='present'` + `is_late=True`
(`attendance_students.py:78-96`).

**Today summary** (`today-summary`): seeds every active class/section so dashboards show
empty cards before any enrolment; then joins active enrollments in the current academic
year and tallies `present`/`late`/`leave`; `absent = total - present - late - leave`.

**Absence processing** (`process_absences`):
- Runs only when `attendance.settings.auto_mark_absent` is true **and** the current time
  is past `attendance_end_time` (or `attendance_cutoff_time`) in `Asia/Dhaka`, unless
  `force=true`.
- Skips holidays when `exclude_holidays_from_absence` is true (checks `holidays` table).
- Marks every active enrollment with **no** attendance row that day as `absent`, and
  queues one `CommunicationLog` SMS (status `queued`) per absent student if
  `send_absent_sms` is true. **Idempotent** — re-running is safe.

### 3.2 Staff attendance

**Endpoints** (`attendance_staff.py`, `/attendance/staff`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/mark` | Set status for staff records |
| GET | `/date/{attendance_date}` | List staff attendance for a day |
| GET | `/{attendance_id}` | Single record |
| POST | `/check-in` | Open a daily `present` record with `check_in_at` (QR or staff id) |
| POST | `/check-out` | Set `check_out_at` on an open record (cannot check out before check-in) |
| PUT | `/{id}` (hidden) | 501 |
| GET | `/report`, `/summary` (hidden) | 501 |

QR check-in payload format: `KUSKUL|STAFF|{school_code}|{staff_id}` (validated against
the `X-School-Id` school code).

### 3.3 Frontend UX

- `features/students/components/AttendanceTab.tsx` — the manual register: class/section
  picker, date, student list sorted by roll number, **P/L/A** status buttons, stats
  cards, **bulk import** (CSV/XLSX, parsed in-browser — includes a from-scratch XLSX
  zipper/`CRC32`/deflate reader, no external lib), **export to XLSX**, and "already
  taken" guard so a day is only opened once. Existing biometric `late`/`present` rows
  are loaded and shown (read-only) so teachers don't overwrite device data.
- `features/students/components/TodayAttendanceTab.tsx` — dashboard KPIs pulling
  `/attendance/students/today-summary`.
- `features/students/components/AttendanceSettingsTab.tsx` — the **configuration hub**
  for the whole subsystem (settings JSON, devices, credentials, sync, absence run).
- `features/staff/components/attendance/AttendanceTab.tsx` — staff register with a
  recharts pie chart and optimistic status updates.

---

## 4. Hikvision Device Connection Architecture

### 4.1 Integration contract

- The device (or HikCentral Connect cloud) is the **sole biometric authority**. KusKul
  never stores fingerprint templates — only the matched `person_code` (card number) and
  event metadata.
- Two ingestion entry points:
  1. **Cloud pull** — `/devices/{id}/sync` (server-to-cloud HTTPS, OAuth-style token).
  2. **Trusted gateway push** — `/devices/{id}/events/ingest` (normalized events POSTed
     by an on-premise trusted relay).
- Both write the immutable `hikvision_attendance_events` row, then **project** a daily
  `student_attendance` row on the first valid punch of the day.

### 4.2 Hikvision endpoints (`hikvision_attendance.py`)

Router: `/api/v1/attendance/hikvision`, router-level dependency
`require_permission("attendance:read")`; mutating routes add `attendance:write`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/devices` | List this school's devices |
| POST | `/devices` | Register a device (cloud credentials stored in `app_key`/`secret_key`) |
| PUT | `/devices/{id}` | Update name/serial/timezone/credentials/active/`late_after` |
| POST | `/devices/{id}/credentials` | Map a `person_code` to a `student_id` |
| GET | `/devices/{id}/credentials` | List mappings for a device |
| POST | `/devices/{id}/events/ingest` | Ingest normalized events (trusted gateway path) |
| POST | `/devices/{id}/sync` | Pull from HikCentral Connect + ingest (cloud path) |

### 4.3 Cloud pull flow (`sync_hikcentral_connect`)

1. **Token**: `POST https://isgp-team.hikcentralconnect.com/api/hccgw/platform/v1/token/get`
   with `{"appKey": ..., "secretKey": ...}`. Expects `errorCode == "0"` and a
   `data.accessToken` + `areaDomain`. The token is passed as the `Token` header on
   subsequent calls.
2. **Window**: `_sync_since` always re-pulls from **yesterday 00:00 in the device
   timezone** to "now" — this repairs the historical bug where the first empty sync
   advanced `last_sync_at` and hid morning punches.
3. **Paginated search**: `POST {area_domain}{api_url}` with
   `{"pageIndex", "pageSize": 200, "beginTime", "endTime"}`. The pagination loop reads
   `totalNum`/`total` from `data` and stops when a page is short or the total is
   reached. The response `data` list is found by checking several possible keys
   (`data`, `recordList`, `list`, `rows`, `items`, `records`) for robustness across API
   variants.
4. **Device filtering** (`_record_matches_device`): matches a record to the configured
   device by `external_device_id` (case-insensitive, against `deviceId`/`deviceID`/
   `serialNo`/`deviceSerial*`/`sn`), or by exact `deviceName`. If the configured
   external id is empty and the name is still the default, **all** records are kept
   (never drop a day's punches) — operators are warned to set the serial.
5. **Normalization** → `HikvisionEventIn`:
   - `cardNo`/`employeeNo` → `card_number` (card path, maps to enrollment roll number).
   - `personCode`/`employeeNo`/`personId`/`jobNo`/`id` → `person_code`.
   - `recordTime`/`eventTime`/`punchTime`, or `date`+`clockTime`, → `event_at` ISO.
   - `eventId`/`uuid`/`attendanceId`/`serialNo` → `external_event_id`.
   - `verifyMode`/`verificationMethod` → `verification_method` (default `fingerprint`).
   - Full record kept as `raw_payload`.
6. **Ingest** (see §5). Returns counts + `pulled` + `skipped_device`.

### 4.4 Event ingestion & projection (`_ingest_one`)

For each normalized event:

1. **Deduplicate** — by `(device_id, person_code, event_at)` OR `(device_id,
   external_event_id)`; if a match exists → `duplicate`.
2. **Resolve student** (two paths):
   - **Explicit mapping**: look up `hikvision_student_credentials` for the device +
     card/person code that is `active`.
   - **Card == roll number** (default): treat `card_number` as the current academic
     year's `enrollment.roll_number` and find the single active student. Ambiguous
     matches (roll reused in multiple classes) are **not guessed** — the operator must
     use the explicit credential mapping. This is the `_active_enrollment_for_card`
     helper.
3. **Validation**: student must exist, belong to the school, and be `active`; the
   enrollment must be for the current academic year and `active`. Otherwise the raw
   event is retained with status `ignored`/`unmatched`.
4. **Attendance date**: the local school day derived from `event_at` in the device
   timezone (`_attendance_date`), normalized to midnight UTC.
5. **Projection rules** (the "first valid punch wins" policy):
   - No attendance row for the day → create one with `status='present'` and
     `is_late` set by `late_after`/policy (see §5). Raw event `processing_status='processed'`.
     If late, queue a late SMS per policy.
   - Existing row is `absent` → **overwrite to present/late** (a valid punch is stronger
     evidence than a pre-device absence). `processing_status='corrected_absent'`.
   - Existing row is `leave`/`present`/`late` (manual or prior biometric) → **leave it**;
     `processing_status='already_marked'`. The raw event is still stored for audit.
6. The projected `student_attendance.id` is linked back onto the raw event
   (`attendance_id`) for traceability.

### 4.5 Late / present status logic (`_status_for_event`)

Order of precedence:

1. **Attendance Settings policy** (preferred): if `attendance.settings.school_start_time`
   is `HH:MM` and `late_grace_minutes` is a number, the threshold is
   `school_start_time + grace`. The event's **local** time (>= threshold) ⇒ `late`,
   else `present`.
2. **Device `late_after`** fallback (`HH:MM`): local time >= `late_after` ⇒ `late`.
3. Default ⇒ `present`.

Local time is computed with `ZoneInfo(device.timezone)` (`Asia/Dhaska` by default).

---

## 5. Status & Processing-State Matrix

### `hikvision_attendance_events.processing_status`

| Status | When |
|---|---|
| `duplicate` | identical device+person+time or same `external_event_id` |
| `unmatched` | card/code could not be mapped to any active enrolled student |
| `ignored` | student inactive / wrong school / no current-year enrollment |
| `processed` | first valid daily punch created the attendance record |
| `corrected_absent` | overwrote a prior absence with a valid present/late |
| `already_marked` | a non-overridable record (leave/present/late/manual) already exists |

### `student_attendance.status` / `is_late`

| Source | status | is_late |
|---|---|---|
| Manual → Present | `present` | false |
| Manual → Late | `present` | **true** |
| Manual → Absent | `absent` | false |
| Manual → Leave | `leave` | false |
| Biometric (first punch on time) | `present` | false |
| Biometric (punch after threshold) | `present` | **true** |
| Biometric correcting an absence | `present` (or late) | per above |
| Auto absence pass | `absent` | false |

---

## 6. Scheduling & Worker

`backend/app/scripts/run_hikvision_attendance.py` (invoked via
`scripts/run-hikvision-attendance-cron.sh`, intended for OS cron `* * * * *`):

- Iterates all **active** `hikvision_devices`.
- Reads each school's `attendance.settings` policy.
- Picks the first active user+membership for the school (the integration account).
- **Within the school window** (`school_start_time`..`attendance_end_time` in
  `Asia/Dhaka`) **and** the poll is due (per `sync_interval_minutes`, clamped 1–60,
  default 10) → call `sync_hikcentral_connect`.
- **Once the school day has ended** → call `process_absences` for the school (guarded
  by a per-school `processed_schools` set so it runs once per pass).
- **Failure isolation**: a failed device is rolled back (`db.rollback()`) and printed,
  never blocking other schools/devices. Runs inside the `api` compose service.

Recommended cadence: **every 1–5 minutes** during the school day for sync, and the same
worker handles the once-per-day absence pass automatically after `attendance_end_time`.

### Cron wrapper

```bash
# scripts/run-hikvision-attendance-cron.sh
docker compose -f docker-compose.yml -f docker-compose.local-safe.yml exec -T api \
  python -m app.scripts.run_hikvision_attendance
```

---

## 7. Security

- **Secrets**: `app_key`/`secret_key` live in `hikvision_devices` DB columns today.
  The design notes explicitly call this out as **not production-ready** — move them to
  the deployment secret manager / an encryption layer and restrict DB access.
- **Transport**: HTTPS only. The cloud token endpoint and the ingest endpoint are
  never exposed to untrusted devices; only a trusted on-premise gateway posts to
  `/events/ingest`.
- **Auth**: both `/sync` and `/events/ingest` require a Bearer access token with
  `attendance:write`, plus a valid `X-School-Id` and resolved tenant.
- **No biometric storage**: KusKul stores only `person_code`, `card_number`,
  `event_at`, `verification_method`, and the raw cloud record. Fingerprint templates
  stay on the device.
- **Raw event retention**: `raw_payload` may contain personal metadata; operators must
  define and enforce a retention period and purge policy (e.g. drop raw records older
  than the configured window once attendance is finalized).
- **Audit**: every device/credential write is covered by the global audit-log
  middleware (`audit_logs`); biometric **punches** are not currently audited by path but
  are fully attributable via `hikvision_attendance_events` + `student_attendance`.
- **Device scoping**: `_device(...)` verifies the resolved device belongs to the same
  school as the `X-School-Id`; cross-school device access is a 404.

---

## 8. Verification & Testing

### Backend pytest

`backend/tests/test_hikvision_student_attendance.py` exercises the contract end-to-end:

- `test_hikvision_event_marks_the_mapped_active_student_once` — first punch marks the
  student; a duplicate punch returns `duplicate: 1`; the day's attendance shows `late`;
  `today-summary` aggregates to `late: 1`.
- `test_today_summary_includes_available_classes_and_sections_without_enrolments` —
  empty classes/sections still render as zeroed dashboard cards.
- `test_hikvision_card_number_automatically_matches_current_roll_number` — a `card_number`
  equal to the current enrollment roll number auto-resolves the student (no explicit
  credential) and marks `present`.

Run with (when `pytest` is installed):

```bash
cd backend && python -m pytest tests/test_hikvision_student_attendance.py -v
```

### Frontend

- `TodayAttendanceTab.tsx` renders the `today-summary` aggregates (present/late/leave/absent).
- `AttendanceTab.tsx` renders existing biometric rows read-only and refuses to overwrite
  `already_saved` students.
- `AttendanceSettingsTab.tsx` drives device creation, credential mapping, sync, and the
  absence pass — all guarded by `attendance:write`.

### Smoke checks performed

- Python syntax compilation of the backend passes.
- Frontend production build (`tsc -b && vite build`) passes.
- (In this environment `pytest` is not installed, so backend pytest could not be
  executed here — install `backend/requirements.txt` to run.)

---

## 9. Sequence Diagrams

### Manual attendance

```text
Teacher         AttendanceTab        /attendance/students/mark       DB
   │  select class/section/date + click P/L/A
   │ ────────────────────────────────────────► │
   │                                            │ upsert student_attendance rows
   │                                            │ ─────────────────────────► │
   │  ◄── 200 { marked: n }                    │
   │                                            │ (auto audit_logs row)
```

### Hikvision biometric

```text
Fingerprint      Hikvision    sync worker   /attendance/hikvision/.../ingest   DB
   on            device        (cron)
   │  match          │              │                 │
   │  personCode + ts │              │                 │
   │ ───────────────► │   pull       │                 │
   │                  │ ───────────► │  events         │
   │                  │  recordList  │ ───────────────► │
   │                  │              │ dedup           │
   │                  │              │ resolve student │
   │                  │              │ project present │
   │                  │              │ ◄── counts ───  │
   │                  │              │ raw event row   │
```

### Absence pass (after school day ends)

```text
cron        run_hikvision_attendance.py      /attendance/students/process-absences   DB
  │ ── school day ended? ──►│
  │                          │  active enrollments w/o attendance for the day
  │                          │ ─────────────────────────────────────────────────► │
  │                          │ ◄── marked_absent + sms_queued ── │
  │                          │  (skips holidays if configured)
```

---

## 10. Configuration Reference Summary

**School-level policy** (`GET/PUT /settings/attendance.settings` → JSON string in
`Setting.value`), mirrored verbatim by `AttendanceSettingsTab.tsx`.

**Device-level** (`POST/PUT /attendance/hikvision/devices`):
`name`, `external_device_id`, `app_key`, `secret_key`, `area_domain`, `timezone`
(`Asia/Dhaka`), `late_after` (`HH:MM`, auto-derived + overridable), `active`.

**Credential mapping** (`POST /attendance/hikvision/devices/{id}/credentials`):
`student_id` + `person_code` (the Hik-Connect card number / person code).

**Worker cadence** (`sync_interval_minutes` in the settings JSON; clamped 1–60,
default 10).

**Timezone convention**: all device/cloud times are interpreted in the device
`timezone` (default `Asia/Dhaka`); `student_attendance.attendance_date` is stored as
midnight UTC of the local day.
