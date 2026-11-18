"""Guardian SMS helpers and a per-school custom HTTP gateway.

Sending uses each school's ``email_sms.settings`` setting (configured from
Settings > Email & SMS).  The default provider contract posts a JSON body to
``sms_gateway_url`` with configurable field names:

    {
      "to": "<recipient>",
      "message": "<body>",
      "apiKey": "<sms_api_key>",
      "senderId": "<sms_sender_id>"
    }

The body format is configurable: ``json`` (default) or ``form``
(application/x-www-form-urlencoded) via ``sms_gateway_format``.  Providers that
return HTTP 200 even when a send fails (e.g. SMS.net.bd) can surface that with
``sms_require_error_zero``, which marks a message as sent only when the response
body's ``sms_error_field`` (default ``error``) equals zero.

Any HTTP 2xx response is treated as success.  Without a gateway URL messages
are persisted as ``queued`` for later handling.
"""
import json
import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.communication_log import CommunicationLog
from app.models.guardian import Guardian
from app.models.holiday import Holiday
from app.models.student import Student
from app.models.student_guardian import StudentGuardian

logger = logging.getLogger(__name__)

# Queued messages older than this are no longer delivered automatically.  They
# stay visible in communication logs (as ``queued``) so an operator can review
# or clean them, but a gateway re-configuration can never blast a backlog of
# stale alerts to guardians.
MAX_QUEUE_AGE = timedelta(hours=24)


def _setting(db: Session, school_id: uuid.UUID, key: str) -> str | None:
    from app.models.setting import Setting

    row = db.scalar(select(Setting).where(Setting.school_id == school_id, Setting.key == key))
    return row.value if row and row.value else None


def sms_gateway_config(db: Session, school_id: uuid.UUID) -> dict:
    """Parsed per-school SMS gateway configuration from ``email_sms.settings``."""
    config: dict = {}
    raw = _setting(db, school_id, "email_sms.settings")
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                config = parsed
        except (TypeError, ValueError):
            config = {}
    url = str(config.get("sms_gateway_url") or "").strip()
    all_extra = config.get("sms_gateway_extra")
    extra: dict = {}
    if isinstance(all_extra, str):
        try:
            parsed_extra = json.loads(all_extra)
            extra = parsed_extra if isinstance(parsed_extra, dict) else {}
        except (TypeError, ValueError):
            extra = {}
    elif isinstance(all_extra, dict):
        extra = all_extra
    gateway_format = str(config.get("sms_gateway_format") or "json").strip().lower()
    if gateway_format not in {"json", "form"}:
        gateway_format = "json"
    return {
        "gateway_configured": bool(url),
        "sms_gateway_url": url,
        "sms_gateway_format": gateway_format,
        "sms_api_key": str(config.get("sms_api_key") or ""),
        "sms_sender_id": str(config.get("sms_sender_id") or ""),
        "sms_to_field": str(config.get("sms_to_field") or "to"),
        "sms_message_field": str(config.get("sms_message_field") or "message"),
        "sms_api_key_field": str(config.get("sms_api_key_field") or "apiKey"),
        "sms_sender_field": str(config.get("sms_sender_field") or "senderId"),
        "sms_require_error_zero": bool(config.get("sms_require_error_zero", False)),
        "sms_error_field": str(config.get("sms_error_field") or "error"),
        "sms_gateway_extra": extra,
    }


def _post_http(config: dict, phone: str, message: str) -> tuple[int | None, str]:
    """POST ``message`` to the configured gateway. Returns (status, note)."""
    url = str(config.get("sms_gateway_url") or "").strip()
    if not url:
        return None, "no gateway URL configured"
    payload: dict = {
        str(config.get("sms_to_field") or "to"): phone,
        str(config.get("sms_message_field") or "message"): message,
    }
    api_key = str(config.get("sms_api_key") or "").strip()
    sender = str(config.get("sms_sender_id") or "").strip()
    if api_key:
        payload[str(config.get("sms_api_key_field") or "apiKey")] = api_key
    if sender:
        payload[str(config.get("sms_sender_field") or "senderId")] = sender
    extra = config.get("sms_gateway_extra")
    if isinstance(extra, dict):
        payload.update(extra)
    encoding = str(config.get("sms_gateway_format") or "json").lower()
    if encoding == "form":
        body = urlencode(payload).encode("utf-8")
        content_type = "application/x-www-form-urlencoded"
    else:
        body = json.dumps(payload).encode("utf-8")
        content_type = "application/json"
    request = Request(
        url,
        data=body,
        headers={"Content-Type": content_type},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, body[:900] or f"HTTP {response.status}"
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body[:900] or f"HTTP {exc.code}"
    except (URLError, OSError) as exc:
        return None, str(exc)[:900]


def _response_is_success(config: dict, http_status: int | None, note: str) -> bool:
    """HTTP 2xx is the baseline; optionally honour the provider's own error field.

    When ``sms_require_error_zero`` is enabled, the response body is parsed as
    JSON and the configured error field (default ``error``) must equal 0 for the
    message to count as sent.
    """
    if http_status is None or not (200 <= http_status < 300):
        return False
    if not config.get("sms_require_error_zero"):
        return True
    try:
        parsed = json.loads(note)
    except (TypeError, ValueError):
        return False
    if not isinstance(parsed, dict):
        return False
    error_field = str(config.get("sms_error_field") or "error")
    if error_field not in parsed:
        return False
    try:
        return int(parsed[error_field]) == 0
    except (TypeError, ValueError):
        return False


def deliver_sms(
    db: Session,
    *,
    school_id: uuid.UUID,
    user_id: uuid.UUID,
    recipient: str,
    body: str,
    category: str | None = None,
    student_id: uuid.UUID | None = None,
    defer: bool = False,
) -> str:
    """Persist a CommunicationLog row and attempt real delivery.

    Returns the resulting status: ``sent``, ``failed``, or ``queued``.
    """
    config = sms_gateway_config(db, school_id)
    status = "queued"
    provider_result: str | None = None
    if config.get("gateway_configured") and not defer:
        http_status, note = _post_http(config, recipient, body)
        if _response_is_success(config, http_status, note):
            status = "sent"
            provider_result = note
        else:
            status = "failed"
            provider_result = note or (f"HTTP {http_status}" if http_status else "gateway error")
    else:
        logger.info(
            "sms queued (gateway_configured=%s defer=%s) school=%s category=%s recipient=%s body=%r",
            config.get("gateway_configured"), defer, school_id, category, recipient, body[:120],
        )
    db.add(
        CommunicationLog(
            school_id=school_id,
            sent_by_user_id=user_id,
            communication_type="sms",
            status=status,
            recipient=recipient,
            subject=None,
            body=body,
            student_id=student_id,
            category=category,
            provider_result=provider_result,
            created_at=datetime.now(timezone.utc),
        )
    )
    if status != "queued":
        logger.info(
            "sms %s school=%s category=%s recipient=%s body=%r provider=%s",
            status, school_id, category, recipient, body[:120], (provider_result or "")[:200],
        )
    return status


def deliver_queued_attendance_sms(
    db: Session, school_id: uuid.UUID, *, categories: tuple[str, ...] = ("late",), limit: int = 100
) -> dict[str, int]:
    """Deliver committed attendance alerts without holding an import lock.

    Late and return-summary alerts are generated during ingestion/processing
    and committed as ``queued``; this function sends them in short transactions
    so a slow SMS gateway never blocks attendance imports.  PostgreSQL row
    locks prevent concurrent workers sending the same queue entry.

    A freshness guard skips queued rows older than ``MAX_QUEUE_AGE``: after a
    gateway outage or reconfiguration the 10-minute worker never floods parents
    with weeks of stale alerts.
    """
    selected_categories = tuple(category for category in categories if category)
    if not selected_categories:
        return {"sent": 0, "failed": 0, "skipped_stale": 0}
    config = sms_gateway_config(db, school_id)
    counts = {"sent": 0, "failed": 0, "skipped_stale": 0}
    if not config.get("gateway_configured"):
        return counts
    fresh_cutoff = datetime.now(timezone.utc) - MAX_QUEUE_AGE
    for _ in range(limit):
        log = db.scalar(select(CommunicationLog).where(
            CommunicationLog.school_id == school_id,
            CommunicationLog.communication_type == "sms",
            CommunicationLog.category.in_(selected_categories),
            CommunicationLog.status == "queued",
            CommunicationLog.created_at >= fresh_cutoff,
        ).order_by(CommunicationLog.created_at, CommunicationLog.id).with_for_update(skip_locked=True).limit(1))
        if log is None:
            break
        http_status, note = _post_http(config, log.recipient, log.body or "")
        log.status = "sent" if _response_is_success(config, http_status, note) else "failed"
        log.provider_result = note
        counts[log.status] += 1
        db.commit()
        logger.info(
            "sms %s school=%s category=%s recipient=%s body=%r provider=%s",
            log.status, school_id, log.category, log.recipient, (log.body or "")[:120], (note or "")[:200],
        )
    stale = db.scalar(
        select(func.count()).select_from(CommunicationLog).where(
            CommunicationLog.school_id == school_id,
            CommunicationLog.communication_type == "sms",
            CommunicationLog.category.in_(selected_categories),
            CommunicationLog.status == "queued",
            CommunicationLog.created_at < fresh_cutoff,
        )
    )
    if stale:
        counts["skipped_stale"] = int(stale)
        logger.warning(
            "school=%s has %s stale queued %s sms older than %s; keeping them queued (not delivered)",
            school_id, stale, ",".join(selected_categories), MAX_QUEUE_AGE,
        )
    return counts


def deliver_queued_late_sms(db: Session, school_id: uuid.UUID, *, limit: int = 100) -> dict[str, int]:
    """Backward-compatible late-only queue delivery."""
    return deliver_queued_attendance_sms(db, school_id, categories=("late",), limit=limit)

def guardian_phone(db: Session, student_id: uuid.UUID) -> str | None:
    """Primary guardian phone, else the first linked guardian by creation order."""
    primary = db.scalar(
        select(Guardian.phone)
        .join(StudentGuardian, StudentGuardian.guardian_id == Guardian.id)
        .where(
            StudentGuardian.student_id == student_id,
            StudentGuardian.is_primary.is_(True),
            Guardian.phone.is_not(None),
        )
        .order_by(Guardian.created_at.asc())
        .limit(1)
    )
    if primary:
        return primary
    other_phone = db.scalar(
        select(Guardian.phone)
        .join(StudentGuardian, StudentGuardian.guardian_id == Guardian.id)
        .where(StudentGuardian.student_id == student_id, Guardian.phone.is_not(None))
        .order_by(Guardian.created_at.asc())
        .limit(1)
    )

    if other_phone:
        return other_phone
    student = db.get(Student, student_id)
    return student.emergency_contact_phone if student else None


def sms_already_sent_today(
    db: Session, school_id: uuid.UUID, student_id: uuid.UUID, category: str, day: date
) -> bool:
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    end = datetime.combine(day, time.max, tzinfo=timezone.utc)
    existing = db.scalar(
        select(CommunicationLog.id)
        .where(
            CommunicationLog.school_id == school_id,
            CommunicationLog.student_id == student_id,
            CommunicationLog.category == category,
            CommunicationLog.created_at >= start,
            CommunicationLog.created_at <= end,
        )
        .limit(1)
    )
    return existing is not None


def is_sms_holiday(db: Session, school_id: uuid.UUID, day: date) -> bool:
    """True when ``day`` is a weekly holiday or a configured school holiday.

    Weekly holidays come from ``attendance.settings`` as a list of weekday
    numbers (``weekly_holidays``, e.g. [4, 5] is Friday + Saturday).  The legacy
    single-integer ``weekly_holiday`` is still honoured so previously saved
    settings keep working.  When nothing is configured, Friday is the default.
    """
    settings_value = _setting(db, school_id, "attendance.settings")
    weekly_days: set[int] | None = None
    if settings_value:
        try:
            parsed = json.loads(settings_value)
            if isinstance(parsed, dict):
                value = parsed.get("weekly_holidays", parsed.get("weekly_holiday"))
                if isinstance(value, list):
                    weekly_days = set()
                    for item in value:
                        if isinstance(item, (int, float)):
                            weekly_days.add(int(item))
                        elif isinstance(item, str) and item.strip().lstrip("-").isdigit():
                            weekly_days.add(int(item))
                elif value is not None:
                    try:
                        weekly_days = {int(value)}
                    except (TypeError, ValueError):
                        weekly_days = None
        except (TypeError, ValueError):
            weekly_days = None
    if weekly_days is None:
        weekly_days = {4}  # Friday by default
    if day.weekday() in weekly_days:
        return True
    return (
        db.scalar(
            select(Holiday.id).where(Holiday.school_id == school_id, Holiday.holiday_date == day).limit(1)
        )
        is not None
    )


def student_full_name(student: Student) -> str:
    return " ".join(part for part in [student.first_name, student.last_name] if part)