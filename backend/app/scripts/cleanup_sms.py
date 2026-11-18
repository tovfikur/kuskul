"""Clean up stale/test SMS data and inert localhost SMS gateways.

* Deletes queued SMS rows older than ``--age-days`` (default 7) days — the
  backlog of messages that were never (and will now never) be delivered.
* Deletes all communication-log rows belonging to test tenants (schools named
  like "SMS School ..." / "Delete School ..." created by the test suite).
* Blanks ``sms_gateway_url`` / ``sms_api_key`` / ``sms_sender_id`` in any
  ``email_sms.settings`` entry whose gateway URL points at 127.0.0.1 or
  localhost, so those test tenants can never attempt a "send".

Production schools are never touched unless they match the stale-queued rule
(queued SMS older than ``--age-days`` are purge candidates for every school).

Run with ``--dry-run`` (default) to preview, then ``--apply`` to commit:

    python -m app.scripts.cleanup_sms --dry-run
    python -m app.scripts.cleanup_sms --apply
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, or_, select, update

from app.db.session import SessionLocal
from app.models.communication_log import CommunicationLog
from app.models.school import School
from app.models.setting import Setting

_TEST_SCHOOL_PATTERN = re.compile(
    r"^(SMS School |Delete School )", re.IGNORECASE
)
_LOCAL_GATEWAY_PATTERN = re.compile(r"^https?://(127\.0\.0\.1|localhost)(:\d+)?/", re.IGNORECASE)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--age-days", type=int, default=7, help="Purge queued SMS older than N days")
    parser.add_argument("--dry-run", action="store_true", help="Preview only (this is the default)")
    parser.add_argument("--apply", action="store_true", help="Commit changes (default is a dry run)")
    args = parser.parse_args()

    cutoff = datetime.now(timezone.utc) - timedelta(days=args.age_days)
    report = {"stale_queued_sms": 0, "test_tenant_comms": 0, "localhost_gateways": 0, "schools_fixed": []}

    with SessionLocal() as db:
        test_schools = db.scalars(
            select(School.id).where(or_(School.name.ilike("SMS School %"), School.name.ilike("Delete School %")))
        ).all()
        print(f"Test tenants found: {len(test_schools)}")

        bad_url_settings = db.scalars(
            select(Setting).where(Setting.key == "email_sms.settings")
        ).all()
        for setting in bad_url_settings:
            try:
                parsed = json.loads(setting.value)
            except (TypeError, ValueError):
                continue
            if not isinstance(parsed, dict):
                continue
            url = str(parsed.get("sms_gateway_url") or "").strip()
            if _LOCAL_GATEWAY_PATTERN.match(url):
                report["localhost_gateways"] += 1
                school = db.get(School, setting.school_id)
                report["schools_fixed"].append(f"{school.name} ({school.id})" if school else str(setting.school_id))
                if args.apply:
                    parsed["sms_gateway_url"] = ""
                    parsed["sms_api_key"] = ""
                    parsed["sms_sender_id"] = ""
                    setting.value = json.dumps(parsed)
                    setting.updated_at = datetime.now(timezone.utc)

        if args.apply:
            db.commit()

        stale = db.execute(
            select(func.count()).select_from(CommunicationLog).where(
                CommunicationLog.communication_type == "sms",
                CommunicationLog.status == "queued",
                CommunicationLog.created_at < cutoff,
            )
        ).scalar()
        report["stale_queued_sms"] = int(stale or 0)

        comms_for_test_tenants = 0
        if test_schools:
            comms_for_test_tenants = int(
                db.execute(
                    select(func.count()).select_from(CommunicationLog).where(CommunicationLog.school_id.in_(test_schools))
                ).scalar()
                or 0
            )
        report["test_tenant_comms"] = comms_for_test_tenants

        if args.apply:
            db.execute(
                delete(CommunicationLog).where(
                    CommunicationLog.communication_type == "sms",
                    CommunicationLog.status == "queued",
                    CommunicationLog.created_at < cutoff,
                )
            )
            if test_schools:
                db.execute(delete(CommunicationLog).where(CommunicationLog.school_id.in_(test_schools)))
            db.commit()
            print("Changes committed.")
        else:
            print("Dry run — no changes made. Re-run with --apply to commit.")

    print("\n=== Cleanup report ===")
    print(f"  stale queued SMS (> {args.age_days}d):    {report['stale_queued_sms']}")
    print(f"  communication rows of test tenants:       {report['test_tenant_comms']}")
    print(f"  localhost gateway settings blanked:       {report['localhost_gateways']}")
    for name in report["schools_fixed"]:
        print(f"      - {name}")


if __name__ == "__main__":
    main()