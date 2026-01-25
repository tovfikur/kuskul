import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.exam_type_master import ExamTypeMaster
from app.models.user import User
from app.schemas.exam_schedules import ExamScheduleOut
from app.schemas.exams import ExamCreate, ExamOut, ExamTypeOut, ExamUpdate

router = APIRouter(dependencies=[Depends(require_permission("exams:read"))])


def _out(e: Exam) -> ExamOut:
    return ExamOut(
        id=e.id,
        academic_year_id=e.academic_year_id,
        name=e.name,
        exam_code=e.exam_code,
        exam_type_code=e.exam_type_code,
        exam_type=e.exam_type,
        status=e.status,
        start_date=e.start_date,
        end_date=e.end_date,
        weight_percentage=e.weight_percentage,
        included_in_final_result=e.included_in_final_result,
        best_of_count=e.best_of_count,
        aggregation_method=e.aggregation_method,
        counts_for_gpa=e.counts_for_gpa,
        result_entry_deadline=e.result_entry_deadline,
        result_publish_date=e.result_publish_date,
        locked_at=e.locked_at,
        is_result_editable=e.is_result_editable,
        instructions=e.instructions,
        is_published=e.is_published,
    )


def _schedule_out(s: ExamSchedule) -> ExamScheduleOut:
    return ExamScheduleOut(
        id=s.id,
        exam_id=s.exam_id,
        class_id=s.class_id,
        subject_id=s.subject_id,
        exam_date=s.exam_date,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        max_marks=s.max_marks,
    )


def _find_exam_type(db: Session, code_or_label: str) -> Optional[ExamTypeMaster]:
    value = (code_or_label or "").strip()
    if not value:
        return None
    by_code = db.get(ExamTypeMaster, value)
    if by_code and by_code.is_active:
        return by_code
    q = select(ExamTypeMaster).where(ExamTypeMaster.label.ilike(value)).limit(1)
    found = db.execute(q).scalar_one_or_none()
    if found and found.is_active:
        return found
    return None


@router.get("/types", response_model=list[ExamTypeOut])
def list_exam_types(db: Session = Depends(get_db)) -> list[ExamTypeOut]:
    rows = db.execute(select(ExamTypeMaster).where(ExamTypeMaster.is_active.is_(True)).order_by(ExamTypeMaster.label.asc())).scalars().all()
    return [
        ExamTypeOut(
            code=r.code,
            label=r.label,
            frequency_hint=r.frequency_hint,
            weight_min=r.weight_min,
            weight_max=r.weight_max,
            is_active=r.is_active,
        )
        for r in rows
    ]


@router.get("", response_model=list[ExamOut])
def list_exams(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
    exam_type: Optional[str] = None,
    exam_type_code: Optional[str] = None,
) -> list[ExamOut]:
    q = select(Exam).join(AcademicYear, AcademicYear.id == Exam.academic_year_id).where(AcademicYear.school_id == school_id)
    if academic_year_id:
        q = q.where(Exam.academic_year_id == academic_year_id)
    if exam_type_code:
        q = q.where(Exam.exam_type_code == exam_type_code)
    if exam_type:
        q = q.where(Exam.exam_type == exam_type)
    rows = db.execute(q.order_by(Exam.created_at.desc())).scalars().all()
    return [_out(e) for e in rows]


@router.get("/upcoming", response_model=list[ExamOut])
def get_upcoming_exams(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[ExamOut]:
    today = date.today()
    q = (
        select(Exam)
        .join(AcademicYear, AcademicYear.id == Exam.academic_year_id)
        .where(AcademicYear.school_id == school_id, Exam.start_date.is_not(None), Exam.start_date >= today)
        .order_by(Exam.start_date.asc())
    )
    rows = db.execute(q).scalars().all()
    return [_out(e) for e in rows]


@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ExamOut:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    return _out(e)


@router.post("", response_model=ExamOut, dependencies=[Depends(require_permission("exams:write"))])
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    user: User = Depends(get_current_user),
) -> ExamOut:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    if payload.start_date and payload.end_date and payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    now = datetime.now(timezone.utc)
    exam_type_code: Optional[str] = None
    exam_type_label: Optional[str] = None
    if payload.exam_type_code:
        t = _find_exam_type(db, payload.exam_type_code)
        if not t:
            raise problem(status_code=400, title="Bad Request", detail="Invalid exam_type_code")
        exam_type_code = t.code
        exam_type_label = t.label
    elif payload.exam_type:
        t = _find_exam_type(db, payload.exam_type)
        if t:
            exam_type_code = t.code
            exam_type_label = t.label
        else:
            exam_type_label = payload.exam_type
    e = Exam(
        academic_year_id=payload.academic_year_id,
        name=payload.name,
        exam_code=payload.exam_code,
        exam_type_code=exam_type_code,
        exam_type=exam_type_label,
        status=(payload.status or "draft"),
        start_date=payload.start_date,
        end_date=payload.end_date,
        weight_percentage=payload.weight_percentage,
        included_in_final_result=True if payload.included_in_final_result is None else payload.included_in_final_result,
        best_of_count=payload.best_of_count,
        aggregation_method=payload.aggregation_method,
        counts_for_gpa=True if payload.counts_for_gpa is None else payload.counts_for_gpa,
        result_entry_deadline=payload.result_entry_deadline,
        result_publish_date=payload.result_publish_date,
        is_result_editable=True if payload.is_result_editable is None else payload.is_result_editable,
        instructions=payload.instructions,
        created_by_user_id=user.id,
        updated_by_user_id=user.id,
        is_published=False,
        created_at=now,
        updated_at=now,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _out(e)


@router.put("/{exam_id}", response_model=ExamOut, dependencies=[Depends(require_permission("exams:write"))])
def update_exam(
    exam_id: uuid.UUID,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    user: User = Depends(get_current_user),
) -> ExamOut:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    data = payload.model_dump(exclude_unset=True)
    exam_type_code: Optional[str] = e.exam_type_code
    exam_type_label: Optional[str] = e.exam_type
    if "exam_type_code" in data:
        if data["exam_type_code"] is None:
            exam_type_code = None
        else:
            t = _find_exam_type(db, data["exam_type_code"])
            if not t:
                raise problem(status_code=400, title="Bad Request", detail="Invalid exam_type_code")
            exam_type_code = t.code
            exam_type_label = t.label
    if "exam_type" in data and "exam_type_code" not in data:
        if data["exam_type"] is None:
            exam_type_label = None
        else:
            t = _find_exam_type(db, data["exam_type"])
            if t:
                exam_type_code = t.code
                exam_type_label = t.label
            else:
                exam_type_label = data["exam_type"]

    if "name" in data:
        e.name = data["name"]
    if "exam_code" in data:
        e.exam_code = data["exam_code"]
    if "start_date" in data:
        e.start_date = data["start_date"]
    if "end_date" in data:
        e.end_date = data["end_date"]
    if "status" in data and data["status"] is not None:
        e.status = data["status"]
    if "weight_percentage" in data:
        e.weight_percentage = data["weight_percentage"]
    if "included_in_final_result" in data and data["included_in_final_result"] is not None:
        e.included_in_final_result = data["included_in_final_result"]
    if "best_of_count" in data:
        e.best_of_count = data["best_of_count"]
    if "aggregation_method" in data:
        e.aggregation_method = data["aggregation_method"]
    if "counts_for_gpa" in data and data["counts_for_gpa"] is not None:
        e.counts_for_gpa = data["counts_for_gpa"]
    if "result_entry_deadline" in data:
        e.result_entry_deadline = data["result_entry_deadline"]
    if "result_publish_date" in data:
        e.result_publish_date = data["result_publish_date"]
    if "is_result_editable" in data and data["is_result_editable"] is not None:
        e.is_result_editable = data["is_result_editable"]
    if "instructions" in data:
        e.instructions = data["instructions"]
    e.exam_type_code = exam_type_code
    e.exam_type = exam_type_label
    e.updated_by_user_id = user.id
    e.updated_at = datetime.now(timezone.utc)
    if e.start_date and e.end_date and e.end_date < e.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    db.commit()
    return _out(e)


@router.delete("/{exam_id}", dependencies=[Depends(require_permission("exams:write"))])
def delete_exam(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
        
    # Cascade Delete related records
    
    # 1. Delete Marks (linked to ExamSchedule)
    try:
        from app.models.mark import Mark
        subq = select(ExamSchedule.id).where(ExamSchedule.exam_id == exam_id)
        db.execute(delete(Mark).where(Mark.exam_schedule_id.in_(subq)))
    except ImportError:
        pass

    # 2. Delete Schedules
    db.execute(delete(ExamSchedule).where(ExamSchedule.exam_id == exam_id))

    # 3. Delete Results
    try:
        from app.models.result import Result
        db.execute(delete(Result).where(Result.exam_id == exam_id))
    except ImportError:
        pass

    db.delete(e)
    db.commit()
    return {"status": "ok"}


@router.get("/{exam_id}/schedule", response_model=list[ExamScheduleOut])
def get_exam_schedule(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[ExamScheduleOut]:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    rows = db.execute(select(ExamSchedule).where(ExamSchedule.exam_id == exam_id).order_by(ExamSchedule.exam_date.asc())).scalars().all()
    return [_schedule_out(s) for s in rows]


@router.post("/{exam_id}/publish", dependencies=[Depends(require_permission("exams:write"))])
def publish_exam(
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    e.is_published = True
    e.status = "published"
    if e.result_publish_date is None:
        e.result_publish_date = date.today()
    e.updated_by_user_id = user.id
    e.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}

