import uuid
import base64
import gzip
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.db.session import Base
from app.models.backup_entry import BackupEntry
from app.models.user import User
from app.schemas.backup import BackupEntryOut, CreateBackupRequest

router = APIRouter(dependencies=[Depends(require_permission("backup:read"))])


def _out(b: BackupEntry) -> BackupEntryOut:
    return BackupEntryOut(
        id=b.id,
        school_id=b.school_id,
        created_by_user_id=b.created_by_user_id,
        status=b.status,
        filename=b.filename,
        notes=b.notes,
    )


def _jsonify(value):
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime,)):
        return value.isoformat()
    try:
        from datetime import date as _date

        if isinstance(value, _date):
            return value.isoformat()
    except Exception:
        pass
    if isinstance(value, bytes):
        return {"__bytes__": base64.b64encode(value).decode("ascii")}
    return value


def _coerce(col, value):
    if value is None:
        return None
    if isinstance(value, dict) and "__bytes__" in value:
        return base64.b64decode(value["__bytes__"].encode("ascii"))
    py = getattr(col.type, "python_type", None)
    if py is uuid.UUID:
        return uuid.UUID(str(value))
    try:
        from datetime import date as _date

        if py is _date:
            return _date.fromisoformat(str(value))
    except Exception:
        pass
    if py is datetime:
        return datetime.fromisoformat(str(value))
    if py is int:
        return int(value)
    if py is bool:
        return bool(value)
    return value


def _snapshot_school(db: Session, school_id: uuid.UUID) -> dict:
    tables = {t.name: t for t in Base.metadata.sorted_tables}
    snapshot: dict[str, list[dict]] = {}

    for table in Base.metadata.sorted_tables:
        if table.name in {"backup_entries"}:
            continue
        if "school_id" not in table.c:
            continue
        rows = db.execute(select(table).where(table.c.school_id == school_id)).mappings().all()
        snapshot[table.name] = [{k: _jsonify(v) for k, v in dict(r).items()} for r in rows]

    if "memberships" in tables:
        memberships = snapshot.get("memberships", [])
        user_ids = {uuid.UUID(m["user_id"]) for m in memberships if m.get("user_id")}
        role_ids = {uuid.UUID(m["role_id"]) for m in memberships if m.get("role_id")}
        if user_ids and "users" in tables:
            users_rows = db.execute(select(tables["users"]).where(tables["users"].c.id.in_(list(user_ids)))).mappings().all()
            snapshot["users"] = [{k: _jsonify(v) for k, v in dict(r).items()} for r in users_rows]
        if role_ids and "roles" in tables:
            roles_rows = db.execute(select(tables["roles"]).where(tables["roles"].c.id.in_(list(role_ids)))).mappings().all()
            snapshot["roles"] = [{k: _jsonify(v) for k, v in dict(r).items()} for r in roles_rows]

    return {"school_id": str(school_id), "tables": snapshot}


def _restore_school(db: Session, school_id: uuid.UUID, payload: dict) -> None:
    tables = {t.name: t for t in Base.metadata.sorted_tables}
    data = payload.get("tables") or {}

    for table in reversed(Base.metadata.sorted_tables):
        if table.name in {"backup_entries"}:
            continue
        if "school_id" in table.c:
            db.execute(delete(table).where(table.c.school_id == school_id))

    for table in Base.metadata.sorted_tables:
        rows = data.get(table.name)
        if not rows:
            continue
        if table.name not in tables:
            continue
        cleaned = []
        for r in rows:
            item = {}
            for col in table.c:
                if col.name in r:
                    item[col.name] = _coerce(col, r[col.name])
            cleaned.append(item)
        if cleaned:
            db.execute(insert(table), cleaned)


@router.get("/list", response_model=list[BackupEntryOut])
def list_backups(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[BackupEntryOut]:
    rows = db.execute(select(BackupEntry).where(BackupEntry.school_id == school_id).order_by(BackupEntry.created_at.desc())).scalars().all()
    return [_out(b) for b in rows]


@router.post("/create", response_model=BackupEntryOut, dependencies=[Depends(require_permission("backup:write"))])
def create_backup(
    payload: CreateBackupRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> BackupEntryOut:
    now = datetime.now(timezone.utc)
    filename = f"backup_{school_id}_{now.strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex}.json.gz"
    snapshot = _snapshot_school(db, school_id)
    blob = gzip.compress(json.dumps(snapshot).encode("utf-8"))
    b = BackupEntry(
        school_id=school_id,
        created_by_user_id=user.id,
        status="created",
        filename=filename,
        notes=payload.notes,
        content_type="application/json+gzip",
        content=blob,
        created_at=now,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _out(b)


@router.post("/restore/{backup_id}", dependencies=[Depends(require_permission("backup:write"))])
def restore_backup(
    backup_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    b = db.get(BackupEntry, backup_id)
    if not b or b.school_id != school_id:
        raise not_found("Backup not found")
    if not b.content:
        raise problem(status_code=400, title="Bad Request", detail="Backup has no content")
    payload = json.loads(gzip.decompress(b.content).decode("utf-8"))
    if payload.get("school_id") != str(school_id):
        raise problem(status_code=400, title="Bad Request", detail="Backup school mismatch")
    _restore_school(db, school_id, payload)
    db.commit()
    b.status = "restored"
    db.commit()
    return {"status": "ok"}


@router.delete("/{backup_id}", dependencies=[Depends(require_permission("backup:write"))])
def delete_backup(backup_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    b = db.get(BackupEntry, backup_id)
    if not b or b.school_id != school_id:
        raise not_found("Backup not found")
    db.delete(b)
    db.commit()
    return {"status": "ok"}


@router.get("/{backup_id}/download", include_in_schema=False)
def download_backup(
    backup_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    b = db.get(BackupEntry, backup_id)
    if not b or b.school_id != school_id:
        raise not_found("Backup not found")
    if not b.content:
        raise not_found("Backup content not found")
    headers = {"Content-Disposition": f'attachment; filename="{b.filename}"'}
    return StreamingResponse(iter([b.content]), media_type=b.content_type or "application/octet-stream", headers=headers)
