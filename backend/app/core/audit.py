import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def write_audit_log(
    db: Session,
    *,
    school_id: uuid.UUID,
    action: str,
    user_id: Optional[uuid.UUID],
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc)
    if action:
        action = action[:80]
    if entity_type:
        entity_type = entity_type[:64]
    if entity_id:
        entity_id = entity_id[:64]
    if details:
        details = details[:2000]
    db.add(
        AuditLog(
            school_id=school_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            created_at=now,
        )
    )
