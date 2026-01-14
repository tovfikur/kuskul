import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented, problem
from app.db.session import get_db
from app.models.library_book import LibraryBook
from app.models.library_issue import LibraryIssue
from app.schemas.library import LibraryBookCreate, LibraryBookOut, LibraryBookUpdate

router = APIRouter(dependencies=[Depends(require_permission("library_books:read"))])


def _out(b: LibraryBook) -> LibraryBookOut:
    return LibraryBookOut(
        id=b.id,
        school_id=b.school_id,
        title=b.title,
        author=b.author,
        category=b.category,
        isbn=b.isbn,
        description=b.description,
        total_copies=b.total_copies,
        available_copies=b.available_copies,
        cover_url=b.cover_url,
    )


@router.get("/search", response_model=list[LibraryBookOut])
def search_books(
    query: str,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[LibraryBookOut]:
    q = select(LibraryBook).where(LibraryBook.school_id == school_id)
    q = q.where(
        (LibraryBook.title.ilike(f"%{query}%"))
        | (LibraryBook.author.ilike(f"%{query}%"))
        | (LibraryBook.isbn.ilike(f"%{query}%"))
    )
    rows = db.execute(q.order_by(LibraryBook.created_at.desc()).limit(50)).scalars().all()
    return [_out(b) for b in rows]


@router.get("/available", response_model=list[LibraryBookOut])
def get_available_books(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[LibraryBookOut]:
    rows = db.execute(
        select(LibraryBook).where(LibraryBook.school_id == school_id, LibraryBook.available_copies > 0).order_by(LibraryBook.title.asc())
    ).scalars().all()
    return [_out(b) for b in rows]


@router.get("", response_model=dict)
def list_books(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    search: Optional[str] = None,
    isbn: Optional[str] = None,
) -> dict:
    offset = (page - 1) * limit if page > 1 else 0
    base = select(LibraryBook).where(LibraryBook.school_id == school_id)
    if category:
        base = base.where(LibraryBook.category == category)
    if isbn:
        base = base.where(LibraryBook.isbn == isbn)
    if search:
        base = base.where((LibraryBook.title.ilike(f"%{search}%")) | (LibraryBook.author.ilike(f"%{search}%")))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(LibraryBook.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(b).model_dump() for b in rows], "total": int(total), "page": page, "limit": limit}


@router.post("", response_model=LibraryBookOut, dependencies=[Depends(require_permission("library_books:write"))])
def create_book(payload: LibraryBookCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> LibraryBookOut:
    if payload.total_copies < 0:
        raise problem(status_code=400, title="Bad Request", detail="total_copies must be >= 0")
    now = datetime.now(timezone.utc)
    b = LibraryBook(
        school_id=school_id,
        title=payload.title,
        author=payload.author,
        category=payload.category,
        isbn=payload.isbn,
        description=payload.description,
        total_copies=payload.total_copies,
        available_copies=payload.total_copies,
        cover_url=None,
        created_at=now,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _out(b)


@router.get("/{book_id}", response_model=LibraryBookOut)
def get_book(book_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> LibraryBookOut:
    b = db.get(LibraryBook, book_id)
    if not b or b.school_id != school_id:
        raise not_found("Book not found")
    return _out(b)


@router.put("/{book_id}", response_model=LibraryBookOut, dependencies=[Depends(require_permission("library_books:write"))])
def update_book(
    book_id: uuid.UUID, payload: LibraryBookUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> LibraryBookOut:
    b = db.get(LibraryBook, book_id)
    if not b or b.school_id != school_id:
        raise not_found("Book not found")
    data = payload.model_dump(exclude_unset=True)
    if "total_copies" in data and data["total_copies"] is not None:
        issued = max(b.total_copies - b.available_copies, 0)
        new_total = int(data["total_copies"])
        if new_total < issued:
            raise problem(status_code=400, title="Bad Request", detail="total_copies cannot be less than issued copies")
        b.total_copies = new_total
        b.available_copies = new_total - issued
        data.pop("total_copies", None)
    for k, v in data.items():
        setattr(b, k, v)
    db.commit()
    return _out(b)


@router.delete("/{book_id}", dependencies=[Depends(require_permission("library_books:write"))])
def delete_book(book_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    b = db.get(LibraryBook, book_id)
    if not b or b.school_id != school_id:
        raise not_found("Book not found")
    active = db.scalar(select(func.count()).select_from(LibraryIssue).where(LibraryIssue.book_id == book_id, LibraryIssue.status == "issued")) or 0
    if active:
        raise problem(status_code=409, title="Conflict", detail="Book has active issues")
    db.delete(b)
    db.commit()
    return {"status": "ok"}


@router.post("/{book_id}/cover", dependencies=[Depends(require_permission("library_books:write"))])
def upload_book_cover(
    book_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    b = db.get(LibraryBook, book_id)
    if not b or b.school_id != school_id:
        raise not_found("Book not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    b.cover_url = file.filename
    db.commit()
    return {"status": "ok"}


@router.post("/bulk-import", include_in_schema=False, dependencies=[Depends(require_permission("library_books:write"))])
def bulk_import_books() -> None:
    raise not_implemented("Bulk import is not implemented yet")

