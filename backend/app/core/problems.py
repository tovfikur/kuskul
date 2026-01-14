from typing import Any, Dict, Optional

from fastapi import HTTPException, status


def problem(
    *,
    status_code: int,
    title: str,
    detail: str,
    type: str = "about:blank",
    extra: Optional[Dict[str, Any]] = None,
) -> HTTPException:
    payload: dict[str, Any] = {"type": type, "title": title, "status": status_code, "detail": detail}
    if extra:
        payload.update(extra)
    return HTTPException(status_code=status_code, detail=payload)


def unauthorized(detail: str = "Authentication required") -> HTTPException:
    return problem(status_code=status.HTTP_401_UNAUTHORIZED, title="Unauthorized", detail=detail)


def forbidden(detail: str = "Forbidden") -> HTTPException:
    return problem(status_code=status.HTTP_403_FORBIDDEN, title="Forbidden", detail=detail)


def not_found(detail: str = "Not found") -> HTTPException:
    return problem(status_code=status.HTTP_404_NOT_FOUND, title="Not Found", detail=detail)


def not_implemented(detail: str = "Not implemented") -> HTTPException:
    return problem(status_code=status.HTTP_501_NOT_IMPLEMENTED, title="Not Implemented", detail=detail)
