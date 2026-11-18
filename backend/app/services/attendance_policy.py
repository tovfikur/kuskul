"""Shared attendance calculation helpers.

The "late after" threshold is the single source of truth that the /students
Attendance Calculation settings define: school start time plus the late grace
period.  Every consumer (Hikvision ingest, attendance summaries, guardian SMS)
must decide "late" the same way so the stored flag and the school's alerts agree
with what was configured in the UI.
"""
from datetime import time
from typing import Any, Optional


def late_threshold(policy: dict[str, Any]) -> Optional[time]:
    """school_start_time + late_grace_minutes (grace clamped to >= 0).

    Returns None when the policy is unset or malformed; callers then fall back
    to a legacy per-device rule instead of guessing a threshold.
    """
    start_time = policy.get("school_start_time")
    grace = policy.get("late_grace_minutes")
    if not isinstance(start_time, str) or not isinstance(grace, (int, float)):
        return None
    try:
        hours, minutes = (int(part) for part in start_time.split(":"))
    except (TypeError, ValueError):
        return None
    total_minutes = (hours * 60 + minutes + max(0, int(grace))) % (24 * 60)
    return time(total_minutes // 60, total_minutes % 60)


def is_late_local(
    local_time: time,
    policy: dict[str, Any],
    device_late_after: Optional[str] = None,
) -> bool:
    """True when the local punch time is at or after the school's threshold.

    The device ``late_after`` value is used only when no school-wide threshold
    is configured (legacy devices); it never competes with the Attendance
    Calculation settings.
    """
    threshold = late_threshold(policy)
    if threshold is not None:
        return local_time >= threshold
    if not device_late_after:
        return False
    try:
        hour, minute = (int(part) for part in device_late_after.split(":"))
    except (TypeError, ValueError):
        return False
    return local_time >= time(hour, minute)