from __future__ import annotations

import html
import io

import segno
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import bad_request
from app.db.session import get_db
from app.schemas.admissions import AdmissionFormLinkOut, AdmissionFormStateUpdate
from app.services.admission_form import build_admission_form_link, update_admission_form_state

router = APIRouter(dependencies=[Depends(require_permission("students:read"))])


@router.get("/form-link", response_model=AdmissionFormLinkOut)
def get_admission_form_link(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AdmissionFormLinkOut:
    token, state = build_admission_form_link(db, school_id)
    db.commit()
    return AdmissionFormLinkOut(token=token, enabled=bool(state.get("enabled")))


@router.patch(
    "/form-link",
    response_model=AdmissionFormLinkOut,
    dependencies=[Depends(require_permission("students:write"))],
)
def update_admission_form_link(
    payload: AdmissionFormStateUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AdmissionFormLinkOut:
    state = update_admission_form_state(db, school_id, enabled=payload.enabled)
    token, _ = build_admission_form_link(db, school_id)
    db.commit()
    return AdmissionFormLinkOut(token=token, enabled=bool(state.get("enabled")))


@router.post(
    "/form-link/rotate",
    response_model=AdmissionFormLinkOut,
    dependencies=[Depends(require_permission("students:write"))],
)
def rotate_admission_form_link(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AdmissionFormLinkOut:
    state = update_admission_form_state(db, school_id, rotate=True)
    token, _ = build_admission_form_link(db, school_id)
    db.commit()
    return AdmissionFormLinkOut(token=token, enabled=bool(state.get("enabled")))


@router.get("/form-link/qr", response_class=StreamingResponse)
def get_admission_form_qr(
    target: str = Query(..., min_length=1, max_length=2048),
) -> StreamingResponse:
    if not target.lower().startswith(("http://", "https://")):
        raise bad_request("QR target must be an http(s) URL")

    qr = segno.make(target, error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=6, border=2)
    title = html.escape("Admission form QR code")
    content = buffer.getvalue().decode("utf-8").replace("<svg", f'<svg aria-label="{title}"', 1).encode("utf-8")
    headers = {"Content-Disposition": 'inline; filename="admission_form_qr.svg"'}
    return StreamingResponse(iter([content]), media_type="image/svg+xml", headers=headers)
