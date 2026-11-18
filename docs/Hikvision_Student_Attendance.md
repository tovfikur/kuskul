# Hikvision biometric student attendance

## Purpose

KusKul does not collect or store a fingerprint. A Hikvision terminal performs
the fingerprint match and emits a device **person code** and event timestamp.
KusKul maps that code to a student, stores an immutable raw event, and creates
one daily student-attendance record.

## Setup

1. Enrol a student fingerprint on the Hikvision device and assign the student a
   stable `personCode` (preferably the KusKul admission number).
2. Create the device through `POST /api/v1/attendance/hikvision/devices`.
   For the cloud pull, supply HikCentral Connect app/secret keys and optionally
   the platform device ID. Set `timezone` to `Asia/Dhaka`; set `late_after` only
   when the school wants automated `late` status.
3. Map every device person code through
   `POST /api/v1/attendance/hikvision/devices/{device_id}/credentials`.
4. Run `POST /api/v1/attendance/hikvision/devices/{device_id}/sync` from a
   protected scheduler, or deliver normalized events to
   `POST /api/v1/attendance/hikvision/devices/{device_id}/events/ingest`.

Both paths require `attendance:write`, a Bearer token, and the school header.
The scheduler should use a dedicated integration account, not a browser token.

## Event processing

```text
fingerprint match on device
  -> Hikvision produces personCode + timestamp
  -> KusKul cloud sync / trusted gateway posts event
  -> deduplicate raw event
  -> device personCode -> student mapping
  -> confirm active student + active current-year enrolment
  -> first event on local school day creates present/late attendance
  -> later events are retained as raw audit events but do not change the day
```

Unmapped, inactive, or unenrolled events are retained with a processing status
for reconciliation and do not mark a student present. A manual record, leave,
or prior biometric attendance is never overwritten by another punch.

## Data and security

The integration writes `hikvision_devices`, `hikvision_student_credentials`,
and `hikvision_attendance_events`, plus the existing `student_attendance`
table. Raw event data can contain personal metadata and must have a documented
retention period. App secrets are currently database configuration values;
before production, encrypt them with the deployment secret manager and restrict
database access. Use HTTPS only, restrict the sync worker's network egress to
Hikvision, and never expose the ingest endpoint directly to an untrusted device.

Run `alembic upgrade head` after deploying the backend.


## Reliable cloud sync and scheduler

Cloud sync streams pages of 200 records with no total event-count limit. Each
page is committed separately. Replays are deduplicated by device/person/time
and external event ID; school-level database locks serialize biometric writers.
A failed search leaves completed pages saved and does not advance `last_sync_at`.
Retrying replays those pages safely. Invalid cloud records produce a visible error
while valid punches remain saved. Device mismatches remain excluded.

Each pass freezes `endTime` at the start time minus **12 minutes** and also filters
returned timestamps locally. A 10:00 pass imports punches through 09:48 inclusive;
a 09:49 punch waits for the 10:10 pass. With a ten-minute schedule, normal delivery
is approximately 12–22 minutes after a punch, plus processing/cloud delays.
Sync normally re-reads yesterday and today. After downtime it extends back to the
last successful pass minus one day and twelve minutes, capped at the last 30
calendar days. Initial sync does not
import the device's entire historical archive. Manual event ingestion does not
advance the cloud success timestamp.

The worker runs all day to catch delayed closing-time punches. Automated absence
processing waits until twelve minutes after school closing and until every active
school device has synced successfully in the current pass. A failed device causes
a nonzero worker exit and is retried at the next pulse.

Install cron on the host actually running the KusKul API, under a user with Docker
access. Keep other cron jobs and replace any older attendance runner entry with:

```cron
*/10 * * * * /absolute/path/to/KusKul/scripts/run-hikvision-attendance-cron.sh >> /absolute/path/to/KusKul/backend/attendance-worker.log 2>&1
```

Quote paths containing spaces. The runner uses `flock` to skip overlapping runs
and discovers the running API container by Compose working-directory and service
labels, so production and local Compose overrides are both supported. If the
container uses a different deployment path, prefix the cron command with
`KUSKUL_API_CONTAINER=your-api-container`. It never starts a new database or guesses
another project's API container.

Verify on the deployment host:

```bash
scripts/run-hikvision-attendance-cron.sh --check
crontab -l
systemctl is-active cron
tail -n 50 backend/attendance-worker.log
```

After deploying the updated API code, the next pulse performs the sync. Large
catch-up runs may exceed a browser/proxy request timeout; the cron worker calls
the sync function directly and is not constrained by that HTTP timeout. A running
pass skips overlapping cron pulses and continues processing until completion.

## Quick connection check

The **Test Connection** button calls
`POST /api/v1/attendance/hikvision/devices/{device_id}/test-connection`.
It authenticates with Hikvision and requests only the first five records from
the previous two days, ending twelve minutes before the test. It does not page
through history, save punches, or update the successful-sync timestamp.

Each cloud request has a five-second network timeout, and the browser stops
waiting after twelve seconds. Results distinguish usable device punches from
an empty sample or a sample without matching usable punches. A successful check
confirms cloud access and sample readability; the ten-minute worker performs
the actual attendance import.


## Import selected dates in small batches

**Process Attendance Data** defaults to today. Select **Import from** and
**Import through** to import any inclusive range within the last 30 calendar
days in the device timezone. Both API validation and the date inputs enforce
this window. Punches still need to be at least twelve minutes old.

The browser calls `POST /api/v1/attendance/hikvision/devices/{device_id}/sync-batch`
with `start_date`, `end_date`, and initially `page_index: 1`. Each request reads
at most 100 punches and commits them before responding with counts, `done`,
`next_page`, a fixed `cutoff`, and `previous_page`. Subsequent requests echo these
continuation values. One extra empty page confirms completion without trusting
potentially inaccurate provider totals. Manual ranges never advance the cron
success timestamp. Provider records outside the selected dates are excluded.

Progress updates after every saved batch, with a 150-millisecond pause between
requests. **Stop after this batch** lets the current request finish and prevents
another request. Retrying the same dates safely skips saved duplicates. Cloud
calls use eight-second network timeouts, and each browser request times out after
30 seconds. Total duration depends on record volume and Hikvision response time.
Invalid punches are counted visibly; valid punches continue to import.

This button imports punches and projects student attendance. Scheduled absence
processing remains in the worker, where it runs after the closing-time delay and
a successful sync of all school devices.

## SMS gateway integration

Settings > Email & SMS now includes the custom gateway URL, JSON/form payload
mapping, provider error checks, and a test-message action. Apply migration
`0038_communication_log_sms_fields` before loading the updated API models.
It adds optional student/category/provider-result fields and retains message
history when a student is deleted.

Late-arrival alerts are queued during punch imports so gateway response times do
not delay manual batches. After attendance processing, the scheduled worker
attempts up to 100 queued late alerts per school, recording sent/failed results.
Without a configured gateway they remain queued. Absence SMS uses the configured
gateway after the existing closing-time/import delay. Weekly SMS holidays are
configurable, defaulting to Friday, and school holidays also suppress alerts.
The emergency student contact remains the fallback when no guardian has a phone.
