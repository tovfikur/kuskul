import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.setting import Setting
from app.schemas.settings import SettingOut, SettingUpdate

router = APIRouter(dependencies=[Depends(require_permission("settings:read"))])


def _out(s: Setting) -> SettingOut:
    return SettingOut(id=s.id, school_id=s.school_id, key=s.key, value=s.value)


def _get_or_create(db: Session, school_id: uuid.UUID, key: str) -> Setting:
    s = db.scalar(select(Setting).where(Setting.school_id == school_id, Setting.key == key))
    if s:
        return s
    now = datetime.now(timezone.utc)
    s = Setting(school_id=school_id, key=key, value="", updated_at=now)
    db.add(s)
    db.flush()
    return s


@router.get("", response_model=list[SettingOut])
def get_settings(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[SettingOut]:
    rows = db.execute(select(Setting).where(Setting.school_id == school_id).order_by(Setting.key.asc())).scalars().all()
    return [_out(s) for s in rows]


@router.get("/{key}", response_model=SettingOut)
def get_setting(key: str, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SettingOut:
    s = _get_or_create(db, school_id, key)
    db.commit()
    return _out(s)


@router.put("/{key}", response_model=SettingOut, dependencies=[Depends(require_permission("settings:write"))])
def update_setting(
    key: str, payload: SettingUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> SettingOut:
    s = _get_or_create(db, school_id, key)
    s.value = payload.value
    s.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _out(s)


@router.get("/email/configuration", response_model=SettingOut)
def get_email_configuration(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SettingOut:
    s = _get_or_create(db, school_id, "email.configuration")
    db.commit()
    return _out(s)


@router.put("/email/configuration", response_model=SettingOut, dependencies=[Depends(require_permission("settings:write"))])
def update_email_configuration(payload: SettingUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SettingOut:
    return update_setting(key="email.configuration", payload=payload, db=db, school_id=school_id)


@router.get("/sms/configuration", response_model=SettingOut)
def get_sms_configuration(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SettingOut:
    s = _get_or_create(db, school_id, "sms.configuration")
    db.commit()
    return _out(s)


@router.put("/sms/configuration", response_model=SettingOut, dependencies=[Depends(require_permission("settings:write"))])
def update_sms_configuration(payload: SettingUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SettingOut:
    return update_setting(key="sms.configuration", payload=payload, db=db, school_id=school_id)


@router.get("/payment/gateways", response_model=SettingOut)
def get_payment_gateways(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SettingOut:
    s = _get_or_create(db, school_id, "payment.gateways")
    db.commit()
    return _out(s)


@router.put("/payment/gateways/{gateway_id}", response_model=SettingOut, dependencies=[Depends(require_permission("settings:write"))])
def update_payment_gateway(
    gateway_id: str, payload: SettingUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> SettingOut:
    return update_setting(key=f"payment.gateway.{gateway_id}", payload=payload, db=db, school_id=school_id)

