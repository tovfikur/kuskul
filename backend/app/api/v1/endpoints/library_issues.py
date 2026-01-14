import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.library_book import LibraryBook
from app.models.library_issue import LibraryIssue
from app.models.membership import Membership
from app.schemas.library import IssueBookRequest, LibraryIssueOut, ReturnBookRequest

router = APIRouter(dependencies=[Depends(require_permission("library_issues:read"))])


def _out(i: LibraryIssue) -> LibraryIssueOut:
    return LibraryIssueOut(
        id=i.id,
        school_id=i.school_id,
        book_id=i.book_id,
        user_id=i.user_id,
        status=i.status,
        due_date=i.due_date,
        renewed_count=i.renewed_count,
        fine_amount=i.fine_amount,
    )


def _ensure_user_in_school(db: Session, school_id: uuid.UUID, user_id: uuid.UUID) -> None:
    m = db.scalar(select(Membership).where(Membership.school_id == school_id, Membership.user_id == user_id, Membership.is_active.is_(True)))
    if not m:
        raise not_found("User not found")


@router.get("/active", response_model=list[LibraryIssueOut])
def get_active_issues(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[LibraryIssueOut]:
    rows = db.execute(
        select(LibraryIssue).where(LibraryIssue.school_id == school_id, LibraryIssue.status == "issued").order_by(LibraryIssue.issued_at.desc())
    ).scalars().all()
    return [_out(i) for i in rows]


@router.get("/overdue", response_model=list[LibraryIssueOut])
def get_overdue_books(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[LibraryIssueOut]:
    today = date.today()
    rows = db.execute(
        select(LibraryIssue).where(
            LibraryIssue.school_id == school_id, LibraryIssue.status == "issued", LibraryIssue.due_date < today
        ).order_by(LibraryIssue.due_date.asc())
    ).scalars().all()
    return [_out(i) for i in rows]


@router.get("/user/{user_id}/history", response_model=list[LibraryIssueOut])
def get_user_issue_history(
    user_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[LibraryIssueOut]:
    _ensure_user_in_school(db, school_id, user_id)
    rows = db.execute(
        select(LibraryIssue).where(LibraryIssue.school_id == school_id, LibraryIssue.user_id == user_id).order_by(LibraryIssue.issued_at.desc())
    ).scalars().all()
    return [_out(i) for i in rows]


@router.get("", response_model=list[LibraryIssueOut])
def list_book_issues(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    status: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    book_id: Optional[uuid.UUID] = None,
) -> list[LibraryIssueOut]:
    q = select(LibraryIssue).where(LibraryIssue.school_id == school_id).order_by(LibraryIssue.issued_at.desc())
    if status:
        q = q.where(LibraryIssue.status == status)
    if user_id:
        q = q.where(LibraryIssue.user_id == user_id)
    if book_id:
        q = q.where(LibraryIssue.book_id == book_id)
    rows = db.execute(q).scalars().all()
    return [_out(i) for i in rows]


@router.post("/issue", response_model=LibraryIssueOut, dependencies=[Depends(require_permission("library_issues:write"))])
def issue_book(payload: IssueBookRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> LibraryIssueOut:
    book = db.get(LibraryBook, payload.book_id)
    if not book or book.school_id != school_id:
        raise not_found("Book not found")
    if book.available_copies <= 0:
        raise problem(status_code=409, title="Conflict", detail="No available copies")
    _ensure_user_in_school(db, school_id, payload.user_id)
    due = payload.due_date or (date.today() + timedelta(days=14))
    now = datetime.now(timezone.utc)
    issue = LibraryIssue(
        school_id=school_id,
        book_id=payload.book_id,
        user_id=payload.user_id,
        status="issued",
        issued_at=now,
        due_date=due,
        returned_at=None,
        renewed_count=0,
        fine_amount=0,
    )
    book.available_copies -= 1
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return _out(issue)


@router.post("/return", dependencies=[Depends(require_permission("library_issues:write"))])
def return_book(payload: ReturnBookRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    issue = db.get(LibraryIssue, payload.issue_id)
    if not issue or issue.school_id != school_id:
        raise not_found("Issue not found")
    if issue.status != "issued":
        return {"status": "ok"}
    book = db.get(LibraryBook, issue.book_id)
    if book and book.school_id == school_id:
        book.available_copies += 1
    issue.status = "returned"
    issue.returned_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.get("/{issue_id}", response_model=LibraryIssueOut)
def get_book_issue(issue_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> LibraryIssueOut:
    issue = db.get(LibraryIssue, issue_id)
    if not issue or issue.school_id != school_id:
        raise not_found("Issue not found")
    return _out(issue)


@router.post("/renew/{issue_id}", dependencies=[Depends(require_permission("library_issues:write"))])
def renew_book(issue_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    issue = db.get(LibraryIssue, issue_id)
    if not issue or issue.school_id != school_id:
        raise not_found("Issue not found")
    if issue.status != "issued":
        raise problem(status_code=409, title="Conflict", detail="Only issued books can be renewed")
    issue.due_date = issue.due_date + timedelta(days=14)
    issue.renewed_count += 1
    db.commit()
    return {"status": "ok"}


@router.post("/calculate-fine/{issue_id}")
def calculate_fine(issue_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, int]:
    issue = db.get(LibraryIssue, issue_id)
    if not issue or issue.school_id != school_id:
        raise not_found("Issue not found")
    if issue.status != "issued":
        return {"fine": int(issue.fine_amount)}
    overdue_days = max((date.today() - issue.due_date).days, 0)
    per_day = 10
    fine = overdue_days * per_day
    issue.fine_amount = fine
    db.commit()
    return {"fine": int(fine)}

