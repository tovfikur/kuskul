"""Deterministic absence-SMS policy and return-summary context.

The send/skip decision is deliberately rule-based: an LLM is only used to
write the message body.  This module owns the exact facts (streaks, dates,
totals, mass-absence detection) so the model can never invent attendance data.
"""
from __future__ import annotations

import json
import uuid
from bisect import bisect_left, bisect_right
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.academic_year import AcademicYear
from app.models.attendance_excuse import AttendanceExcuse
from app.models.communication_log import CommunicationLog
from app.models.enrollment import Enrollment
from app.models.hikvision_attendance import HikvisionAttendanceEvent
from app.models.holiday import Holiday
from app.models.school import School
from app.models.student import Student
from app.models.teacher_assignment import StudentAttendance
from app.services.sms import deliver_sms, guardian_phone, is_sms_holiday, student_full_name

DHAKA = ZoneInfo("Asia/Dhaka")
LOOKBACK_DAYS = 60

DEFAULT_FIRST_DAYS = 3
DEFAULT_MASS_ABSENCE_THRESHOLD = 60
DEFAULT_MASS_ABSENCE_MIN_STUDENTS = 10


def _int_setting(policy: dict, key: str, default: int, *, minimum: int = 0, maximum: int = 10_000) -> int:
    try:
        value = int(policy.get(key, default))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def first_days(policy: dict) -> int:
    return _int_setting(policy, "absent_sms_first_days", DEFAULT_FIRST_DAYS, minimum=0, maximum=30)


def return_summary_enabled(policy: dict) -> bool:
    return bool(policy.get("absent_sms_return_summary", True))


def mass_absence_threshold(policy: dict) -> int:
    return _int_setting(
        policy, "absent_sms_mass_absence_threshold", DEFAULT_MASS_ABSENCE_THRESHOLD, minimum=1, maximum=100
    )


def mass_absence_min_students(policy: dict) -> int:
    return _int_setting(
        policy, "absent_sms_mass_absence_min_students", DEFAULT_MASS_ABSENCE_MIN_STUDENTS, minimum=1, maximum=100_000
    )


def _weekly_holidays(policy: dict) -> set[int]:
    value = policy.get("weekly_holidays", policy.get("weekly_holiday"))
    if isinstance(value, list):
        days = set()
        for item in value:
            if isinstance(item, (int, float)):
                days.add(int(item))
            elif isinstance(item, str) and item.strip().lstrip("-").isdigit():
                days.add(int(item))
        return days
    if value is not None:
        try:
            return {int(value)}
        except (TypeError, ValueError):
            pass
    return {4}  # Friday, matching the existing SMS holiday default.


def school_days_between(db: Session, school_id: uuid.UUID, start_day: date, end_day: date, policy: dict) -> list[date]:
    weekly = _weekly_holidays(policy)
    holiday_rows = db.execute(
        select(Holiday.holiday_date).where(
            Holiday.school_id == school_id,
            Holiday.holiday_date >= start_day,
            Holiday.holiday_date <= end_day,
        )
    ).scalars().all()
    holidays = set(holiday_rows)
    days: list[date] = []
    cursor = start_day
    while cursor <= end_day:
        if cursor.weekday() not in weekly and cursor not in holidays:
            days.append(cursor)
        cursor += timedelta(days=1)
    return days


def previous_school_day(db: Session, *, school_id: uuid.UUID, day: date, policy: dict) -> date | None:
    days = school_days_between(db, school_id, day - timedelta(days=LOOKBACK_DAYS), day, policy)
    prior = [candidate for candidate in days if candidate < day]
    return prior[-1] if prior else None


@dataclass
class AttendanceHistory:
    school_days: list[date]
    rows: dict[uuid.UUID, dict[date, StudentAttendance]] = field(default_factory=dict)


@dataclass
class AbsenceStreak:
    days: int
    dates: list[date]


def load_history(
    db: Session,
    *,
    school_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    end_day: date,
    policy: dict,
    lookback_days: int = LOOKBACK_DAYS,
) -> AttendanceHistory:
    if not student_ids:
        return AttendanceHistory(school_days=[])
    start_day = end_day - timedelta(days=max(1, lookback_days))
    school_days = school_days_between(db, school_id, start_day, end_day, policy)
    start_dt = datetime.combine(start_day, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end_day, time.max, tzinfo=timezone.utc)
    rows = db.execute(
        select(StudentAttendance).where(
            StudentAttendance.student_id.in_(student_ids),
            StudentAttendance.attendance_date >= start_dt,
            StudentAttendance.attendance_date <= end_dt,
        )
    ).scalars().all()
    by_student: dict[uuid.UUID, dict[date, StudentAttendance]] = {sid: {} for sid in student_ids}
    priority = {"absent": 0, "leave": 1, "present": 2}
    for row in rows:
        day = row.attendance_date.date()
        existing = by_student.setdefault(row.student_id, {}).get(day)
        if existing is None or priority.get(row.status, 0) >= priority.get(existing.status, 0):
            by_student[row.student_id][day] = row
    return AttendanceHistory(school_days=school_days, rows=by_student)


def current_absence_streak(history: AttendanceHistory, student_id: uuid.UUID, day: date) -> AbsenceStreak:
    if not history.school_days:
        return AbsenceStreak(0, [])
    idx = bisect_right(history.school_days, day) - 1
    rows = history.rows.get(student_id, {})
    dates: list[date] = []
    cursor = idx
    while cursor >= 0:
        school_day = history.school_days[cursor]
        row = rows.get(school_day)
        if row is None or row.status != "absent":
            break
        dates.append(school_day)
        cursor -= 1
    dates.reverse()
    return AbsenceStreak(len(dates), dates)


def previous_absence_streak(history: AttendanceHistory, student_id: uuid.UUID, return_day: date) -> AbsenceStreak:
    if not history.school_days:
        return AbsenceStreak(0, [])
    idx = bisect_left(history.school_days, return_day) - 1
    rows = history.rows.get(student_id, {})
    dates: list[date] = []
    cursor = idx
    while cursor >= 0:
        school_day = history.school_days[cursor]
        row = rows.get(school_day)
        if row is None or row.status != "absent":
            break
        dates.append(school_day)
        cursor -= 1
    dates.reverse()
    return AbsenceStreak(len(dates), dates)


def month_totals(history: AttendanceHistory, student_id: uuid.UUID, day: date) -> tuple[int, int]:
    month_start = date(day.year, day.month, 1)
    absent = 0
    late = 0
    for attendance_day, row in history.rows.get(student_id, {}).items():
        if month_start <= attendance_day <= day:
            if row.status == "absent":
                absent += 1
            elif row.status == "present" and row.is_late:
                late += 1
    return absent, late


def approved_excuse_student_ids(db: Session, *, school_id: uuid.UUID, day: date) -> set[uuid.UUID]:
    rows = db.execute(
        select(AttendanceExcuse.student_id).where(
            AttendanceExcuse.school_id == school_id,
            AttendanceExcuse.attendance_date == day,
            AttendanceExcuse.status == "approved",
        )
    ).scalars().all()
    return set(rows)


def already_sent_student_ids(
    db: Session, *, school_id: uuid.UUID, category: str, day: date, student_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    if not student_ids:
        return set()
    start = datetime.combine(day, time.min, tzinfo=DHAKA).astimezone(timezone.utc)
    end = datetime.combine(day, time.max, tzinfo=DHAKA).astimezone(timezone.utc)
    rows = db.execute(
        select(CommunicationLog.student_id).where(
            CommunicationLog.school_id == school_id,
            CommunicationLog.student_id.in_(student_ids),
            CommunicationLog.category == category,
            CommunicationLog.created_at >= start,
            CommunicationLog.created_at <= end,
        )
    ).scalars().all()
    return {row for row in rows if row is not None}


@dataclass
class MassAbsenceStats:
    total_students: int
    present: int
    leave: int
    absent: int
    mass_absence: bool

    def as_dict(self) -> dict[str, int | bool]:
        return {
            "total_students": self.total_students,
            "present": self.present,
            "leave": self.leave,
            "absent": self.absent,
            "mass_absence": self.mass_absence,
        }


def mass_absence_stats(
    db: Session, *, school_id: uuid.UUID, academic_year_id: uuid.UUID, day: date, policy: dict
) -> MassAbsenceStats:
    active_ids = (
        select(Enrollment.student_id)
        .join(Student, Student.id == Enrollment.student_id)
        .where(
            Enrollment.academic_year_id == academic_year_id,
            Enrollment.status == "active",
            Student.school_id == school_id,
            Student.status == "active",
        )
        .distinct()
    )
    total = db.scalar(select(func.count()).select_from(active_ids.subquery())) or 0
    if total == 0:
        return MassAbsenceStats(0, 0, 0, 0, False)
    day_dt = datetime.combine(day, time.min, tzinfo=timezone.utc)
    status_rows = db.execute(
        select(StudentAttendance.status, func.count(func.distinct(StudentAttendance.student_id)))
        .where(
            StudentAttendance.attendance_date == day_dt,
            StudentAttendance.student_id.in_(active_ids),
        )
        .group_by(StudentAttendance.status)
    ).all()
    counts = {status: int(count) for status, count in status_rows}
    present = counts.get("present", 0)
    leave = counts.get("leave", 0)
    attended = present + leave
    absent = max(0, int(total) - attended)
    threshold = mass_absence_threshold(policy)
    min_students = mass_absence_min_students(policy)
    mass = (
        int(total) >= min_students
        and absent > 0
        and (attended == 0 or absent * 100 >= int(total) * threshold)
    )
    return MassAbsenceStats(int(total), present, leave, absent, mass)


def should_send_daily_absence(
    *, policy: dict, streak_days: int, mass_absence: bool, already_sent: bool, has_phone: bool
) -> tuple[bool, str]:
    if mass_absence:
        return False, "mass_absence"
    if already_sent:
        return False, "already_sent"
    if not has_phone:
        return False, "no_phone"
    if streak_days <= 0:
        return False, "no_streak"
    if streak_days > first_days(policy):
        return False, "streak_limit"
    return True, ""


def should_send_return_summary(*, policy: dict, prior_streak_days: int, already_sent: bool) -> tuple[bool, str]:
    if not return_summary_enabled(policy):
        return False, "disabled"
    if already_sent:
        return False, "already_sent"
    if prior_streak_days <= first_days(policy):
        return False, "short_absence"
    return True, ""


def school_name(db: Session, school_id: uuid.UUID) -> str:
    row = db.get(School, school_id)
    return row.name if row else ""


def daily_context(
    db: Session,
    *,
    school_id: uuid.UUID,
    student_name: str,
    medium: str,
    day: date,
    streak: AbsenceStreak,
    month_absent_days: int,
    month_late_days: int,
) -> dict:
    return {
        "message_type": "daily_absence",
        "student_name": student_name,
        "medium": medium,
        "school_name": school_name(db, school_id),
        "date": day.isoformat(),
        "absence_streak_days": streak.days,
        "total_absent_days_this_month": month_absent_days,
        "total_late_days_this_month": month_late_days,
    }


def return_summary_context(
    db: Session,
    *,
    school_id: uuid.UUID,
    student: Student,
    attendance: StudentAttendance,
    streak: AbsenceStreak,
    return_day: date,
    return_time: str | None,
    month_absent_days: int,
    month_late_days: int,
) -> dict:
    return {
        "message_type": "return_summary",
        "student_name": student_full_name(student),
        "medium": student.medium or "",
        "school_name": school_name(db, school_id),
        "absence_days": streak.days,
        "absence_start_date": streak.dates[0].isoformat() if streak.dates else "",
        "absence_end_date": streak.dates[-1].isoformat() if streak.dates else "",
        "return_date": return_day.isoformat(),
        "return_time": return_time or "",
        "returned_late": bool(attendance.is_late),
        "total_absent_days_this_month": month_absent_days,
        "total_late_days_this_month": month_late_days,
    }


def return_time_for_student(db: Session, *, school_id: uuid.UUID, student_id: uuid.UUID, day: date) -> str | None:
    start = datetime.combine(day, time.min, tzinfo=DHAKA).astimezone(timezone.utc)
    end = datetime.combine(day, time.max, tzinfo=DHAKA).astimezone(timezone.utc)
    event_at = db.scalar(
        select(HikvisionAttendanceEvent.event_at)
        .where(
            HikvisionAttendanceEvent.student_id == student_id,
            HikvisionAttendanceEvent.event_at >= start,
            HikvisionAttendanceEvent.event_at <= end,
            HikvisionAttendanceEvent.processing_status.in_(("processed", "corrected_absent", "already_marked")),
        )
        .order_by(HikvisionAttendanceEvent.event_at.asc())
        .limit(1)
    )
    if event_at is None:
        return None
    return event_at.astimezone(DHAKA).strftime("%H:%M")


def process_returns(
    db: Session, *, school_id: uuid.UUID, user_id: uuid.UUID, return_date: date | None = None
) -> dict[str, int]:
    """Send one AI-written summary when a student returns after a long absence.

    This runs from the scheduled worker, after attendance sync.  It is safe to
    call repeatedly: an existing ``absence_summary`` log suppresses duplicates.
    """
    from app.services.ai_message_writer import compose_return_summary

    policy = _attendance_policy(db, school_id)
    if not policy.get("send_absent_sms", False):
        return {"summaries_sent": 0, "summaries_suppressed": 0, "skipped": "absent_sms_disabled"}
    day = return_date or datetime.now(DHAKA).date()
    if is_sms_holiday(db, school_id, day):
        return {"summaries_sent": 0, "summaries_suppressed": 0, "skipped": "holiday"}
    year = db.scalar(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)).limit(1)
    )
    if not year:
        return {"summaries_sent": 0, "summaries_suppressed": 0, "skipped": "no_current_year"}
    day_dt = datetime.combine(day, time.min, tzinfo=timezone.utc)
    rows = db.execute(
        select(StudentAttendance, Student, Enrollment)
        .join(Student, Student.id == StudentAttendance.student_id)
        .join(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.academic_year_id == year.id),
        )
        .where(
            Student.school_id == school_id,
            Student.status == "active",
            Enrollment.status == "active",
            StudentAttendance.attendance_date == day_dt,
            StudentAttendance.status == "present",
        )
    ).all()
    if not rows:
        return {"summaries_sent": 0, "summaries_suppressed": 0, "skipped": ""}
    unique: dict[uuid.UUID, tuple[StudentAttendance, Student]] = {}
    for attendance, student, _enrollment in rows:
        unique.setdefault(student.id, (attendance, student))
    prior_day = previous_school_day(db, school_id=school_id, day=day, policy=policy)
    if prior_day is None:
        return {"summaries_sent": 0, "summaries_suppressed": 0, "skipped": "no_previous_school_day"}
    prior_dt = datetime.combine(prior_day, time.min, tzinfo=timezone.utc)
    prior_absent_ids = set(
        db.execute(
            select(StudentAttendance.student_id).where(
                StudentAttendance.student_id.in_(list(unique)),
                StudentAttendance.attendance_date == prior_dt,
                StudentAttendance.status == "absent",
            )
        ).scalars().all()
    )
    if not prior_absent_ids:
        return {"summaries_sent": 0, "summaries_suppressed": 0, "skipped": ""}
    # Only students absent on the previous school day can be returning from a
    # multi-day absence.  This keeps the 60-day history query small on normal days.
    unique = {student_id: value for student_id, value in unique.items() if student_id in prior_absent_ids}
    student_ids = list(unique)
    history = load_history(db, school_id=school_id, student_ids=student_ids, end_day=day, policy=policy)
    sent_today = already_sent_student_ids(
        db, school_id=school_id, category="absence_summary", day=day, student_ids=student_ids
    )
    sent = 0
    suppressed = 0
    for student_id, (attendance, student) in unique.items():
        prior = previous_absence_streak(history, student_id, day)
        allowed, reason = should_send_return_summary(
            policy=policy, prior_streak_days=prior.days, already_sent=student_id in sent_today
        )
        if not allowed:
            if reason in {"short_absence", "already_sent"}:
                suppressed += 1
            continue
        phone = guardian_phone(db, student_id)
        if not phone:
            suppressed += 1
            continue
        month_absent, month_late = month_totals(history, student_id, day)
        context = return_summary_context(
            db,
            school_id=school_id,
            student=student,
            attendance=attendance,
            streak=prior,
            return_day=day,
            return_time=return_time_for_student(db, school_id=school_id, student_id=student_id, day=day),
            month_absent_days=month_absent,
            month_late_days=month_late,
        )
        body = compose_return_summary(context, policy)
        deliver_sms(
            db,
            school_id=school_id,
            user_id=user_id,
            recipient=phone,
            body=body,
            category="absence_summary",
            student_id=student_id,
            defer=True,
        )
        # A return summary replaces a queued late alert for the same return.
        queued_late = db.execute(
            select(CommunicationLog).where(
                CommunicationLog.school_id == school_id,
                CommunicationLog.student_id == student_id,
                CommunicationLog.category == "late",
                CommunicationLog.status == "queued",
            )
        ).scalars().all()
        for log in queued_late:
            log.status = "superseded"
            log.provider_result = "Replaced by absence return summary"
        sent += 1
    db.flush()
    return {"summaries_sent": sent, "summaries_suppressed": suppressed, "skipped": ""}


def _attendance_policy(db: Session, school_id: uuid.UUID) -> dict:
    from app.models.setting import Setting

    row = db.scalar(select(Setting).where(Setting.school_id == school_id, Setting.key == "attendance.settings"))
    if not row or not row.value:
        return {}
    try:
        parsed = json.loads(row.value)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError):
        return {}
