"""One attendance pass, invoked by cron every ten minutes.

Sync throughout the day so delayed end-of-day punches and downtime catch-up
are not lost. Automatic absences wait for the 12-minute ingestion delay.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from itertools import groupby
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.api.v1.endpoints.attendance_students import _attendance_policy, process_absences
from app.api.v1.endpoints.hikvision_attendance import SYNC_DELAY_MINUTES, sync_hikcentral_connect
from app.db.session import SessionLocal
from app.models.hikvision_attendance import HikvisionDevice
from app.models.membership import Membership
from app.models.user import User
from app.services.absence_sms import process_returns
from app.services.sms import deliver_queued_attendance_sms

logger = logging.getLogger(__name__)


def _school_day_has_ended(policy: dict) -> bool:
    now = datetime.now(ZoneInfo("Asia/Dhaka"))
    end = str(policy.get("attendance_end_time") or "17:00")
    hour, minute = (int(part) for part in end.split(":"))
    cutoff = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return now >= cutoff + timedelta(minutes=SYNC_DELAY_MINUTES)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    failed = False
    with SessionLocal() as db:
        devices = db.scalars(
            select(HikvisionDevice).where(HikvisionDevice.active.is_(True))
            .order_by(HikvisionDevice.school_id)
        ).all()
        for school_id, group in groupby(devices, key=lambda device: device.school_id):
            school_devices = list(group)
            policy = _attendance_policy(db, school_id)
            user = db.scalar(
                select(User).join(Membership, Membership.user_id == User.id)
                .where(Membership.school_id == school_id, Membership.is_active.is_(True), User.is_active.is_(True))
                .order_by(User.created_at.asc()).limit(1)
            )
            if not user:
                logger.error("School %s: no active school user", school_id)
                failed = True
                continue
            for device in school_devices:
                device_id = device.id
                try:
                    result = sync_hikcentral_connect(device_id, db=db, user=user, school_id=school_id)
                    logger.info("Device %s: %s", device_id, result)
                except Exception:
                    db.rollback()
                    failed = True
                    logger.exception("Device %s: sync failed; next pulse will retry", device_id)
            # Absence marking is independent of cloud sync: a student with no
            # attendance row by the school end time is absent even if one of the
            # school's devices failed to sync during this pulse.
            try:
                if _school_day_has_ended(policy):
                    result = process_absences(db=db, user=user, school_id=school_id)
                    logger.info("School %s absence pass: %s", school_id, result)
            except Exception:
                db.rollback()
                failed = True
                logger.exception("School %s: absence processing failed", school_id)
            try:
                result = process_returns(db=db, school_id=school_id, user_id=user.id)
                logger.info("School %s return summary pass: %s", school_id, result)
            except Exception:
                db.rollback()
                failed = True
                logger.exception("School %s: return summary processing failed", school_id)
            try:
                result = deliver_queued_attendance_sms(db, school_id, categories=("late", "absence_summary"))
                logger.info("School %s queued attendance SMS: %s", school_id, result)
            except Exception:
                db.rollback()
                failed = True
                logger.exception("School %s: queued SMS delivery failed", school_id)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
