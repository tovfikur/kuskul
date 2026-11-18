"""Read-only SMS reconciliation report against the SMS gateway invoice.

Prints, for every school, the sent/queued/failed SMS totals per day and a
per-recipient manifest (count, first/last delivery, date span visible in the
message bodies).  Use it to match the SMS provider's billing report.

Run:
    python -m app.scripts.sms_reconciliation [--school "name or id"] [--days 30]

Nothing is written to the database.
"""
from __future__ import annotations

import argparse
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.communication_log import CommunicationLog
from app.models.school import School

_BODY_DATE = re.compile(r"on (\d{4}-\d{2}-\d{2})")


def _span_from_body(body: str | None) -> tuple[str, str]:
    days = sorted(d for d in (_BODY_DATE.findall(body or "")))
    if not days:
        return "-", "-"
    return days[0], days[-1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--school", default="", help="Filter to a school by name or id")
    parser.add_argument("--days", type=int, default=30, help="Look back window in days")
    args = parser.parse_args()

    since = datetime.now(timezone.utc) - timedelta(days=args.days)

    with SessionLocal() as db:
        schools = db.scalars(
            select(School).order_by(School.name)
        ).all()
        if args.school:
            needle = args.school.strip().casefold()
            schools = [
                s for s in schools
                if needle in s.name.casefold() or needle in str(s.id)
            ]

        rows = db.scalars(
            select(CommunicationLog)
            .where(CommunicationLog.communication_type == "sms", CommunicationLog.created_at >= since)
            .order_by(CommunicationLog.created_at)
        ).all()

        name_by_id = {str(s.id): s.name for s in schools}
        by_school: dict[str, list] = defaultdict(list)
        for row in rows:
            by_school[str(row.school_id)].append(row)

        grand = {"sent": 0, "queued": 0, "failed": 0}
        for school_id, school_rows in sorted(by_school.items()):
            name = name_by_id.get(school_id, school_id)
            print(f"\n=== {name} ({school_id}) ===")
            daily = defaultdict(lambda: {"sent": 0, "queued": 0, "failed": 0, "late": 0, "absent": 0, "other": 0})
            per_recipient: dict[str, dict] = {}
            for row in school_rows:
                d = row.created_at.date().isoformat()
                daily[d][row.status] += 1
                if row.category == "late":
                    daily[d]["late"] += 1
                elif row.category == "absent":
                    daily[d]["absent"] += 1
                else:
                    daily[d]["other"] += 1
                meta = per_recipient.setdefault(
                    row.recipient,
                    {"count": 0, "first": row.created_at, "last": row.created_at, "bodies": []},
                )
                meta["count"] += 1
                meta["first"] = min(meta["first"], row.created_at)
                meta["last"] = max(meta["last"], row.created_at)
                if len(meta["bodies"]) < 3:
                    meta["bodies"].append(row.body or "")
                grand[row.status] += 1
            print("  per day:")
            for d, c in sorted(daily.items()):
                print(
                    f"    {d}: sent={c['sent']} queued={c['queued']} failed={c['failed']} "
                    f"(late={c['late']} absent={c['absent']} other={c['other']})"
                )
            print(f"  recipients ({len(per_recipient)} distinct):")
            for phone, meta in sorted(per_recipient.items(), key=lambda kv: -kv[1]["count"]):
                span = _span_from_body(next((b for b in meta["bodies"] if b), None))
                print(
                    f"    {phone}: {meta['count']} sms, first={meta['first'].isoformat()}, "
                    f"last={meta['last'].isoformat()}, backdated {span[0]}..{span[1]}"
                )
                for b in meta["bodies"]:
                    print(f"        {b[:120]}")
        print("\n=== TOTALS ===")
        print(f"  sent={grand['sent']} queued={grand['queued']} failed={grand['failed']}")


if __name__ == "__main__":
    main()