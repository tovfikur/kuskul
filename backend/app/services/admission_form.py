from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_public_admission_token, decode_public_admission_token
from app.models.school import School
from app.models.setting import Setting
from app.models.tenant import Tenant

SETTING_KEY = "admissions.public_form"


def _parse_state(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def get_admission_form_state(
    db: Session, school_id: uuid.UUID, *, create: bool = False
) -> dict[str, Any]:
    setting = db.scalar(
        select(Setting).where(Setting.school_id == school_id, Setting.key == SETTING_KEY)
    )
    state = _parse_state(setting.value if setting else None)
    version = state.get("version")
    enabled = bool(state.get("enabled", True))

    if isinstance(version, str) and version.strip():
        return {"enabled": enabled, "version": version}

    if not create:
        return {"enabled": False, "version": None}

    version = uuid.uuid4().hex
    state = {"enabled": True, "version": version}
    now = datetime.now(timezone.utc)
    if setting:
        setting.value = json.dumps(state)
        setting.updated_at = now
    else:
        db.add(Setting(school_id=school_id, key=SETTING_KEY, value=json.dumps(state), updated_at=now))
    db.flush()
    return {"enabled": True, "version": version}


def update_admission_form_state(
    db: Session,
    school_id: uuid.UUID,
    *,
    enabled: bool | None = None,
    rotate: bool = False,
) -> dict[str, Any]:
    state = get_admission_form_state(db, school_id, create=True)
    if enabled is not None:
        state["enabled"] = enabled
    if rotate:
        state["version"] = uuid.uuid4().hex

    setting = db.scalar(
        select(Setting).where(Setting.school_id == school_id, Setting.key == SETTING_KEY)
    )
    now = datetime.now(timezone.utc)
    if setting:
        setting.value = json.dumps(state)
        setting.updated_at = now
    else:
        db.add(Setting(school_id=school_id, key=SETTING_KEY, value=json.dumps(state), updated_at=now))
    db.flush()
    return state


def build_admission_form_link(
    db: Session, school_id: uuid.UUID
) -> tuple[str, dict[str, Any]]:
    state = get_admission_form_state(db, school_id, create=True)
    token = create_public_admission_token(
        school_id=school_id, version=str(state["version"])
    )
    return token, state


def resolve_admission_form_token(db: Session, token: str) -> tuple[School, dict[str, Any]]:
    payload = decode_public_admission_token(token)
    try:
        school_id = uuid.UUID(str(payload["school_id"]))
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid school") from exc

    school = db.get(School, school_id)
    if not school or not school.is_active:
        raise ValueError("School not found")

    if school.tenant_id is not None:
        tenant = db.get(Tenant, school.tenant_id)
        if not tenant or tenant.status != "active":
            raise ValueError("School is inactive")

    state = get_admission_form_state(db, school_id, create=False)
    if not state.get("enabled") or state.get("version") != payload.get("version"):
        raise ValueError("Admission form is not available")

    return school, payload
