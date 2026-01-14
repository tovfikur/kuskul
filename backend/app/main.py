import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

import app.db.base
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.rate_limit import InMemoryRateLimiter, RateLimitRule
from app.core.security import decode_access_token
from app.core.audit import write_audit_log
from app.db.session import SessionLocal


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    limiter = InMemoryRateLimiter()
    auth_rule = RateLimitRule(window_seconds=15 * 60, max_requests=settings.rate_limit_auth_per_15_minutes)
    api_rule = RateLimitRule(window_seconds=60, max_requests=settings.rate_limit_api_per_minute)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def _security_headers(request: Request, call_next):
        if settings.rate_limit_enabled:
            client_host = request.client.host if request.client else "unknown"
            path = request.url.path
            is_auth = path.startswith(f"{settings.api_v1_prefix}/auth/") and path.endswith(("/login", "/register"))
            rule = auth_rule if is_auth else api_rule
            key = f"{client_host}:{'auth' if is_auth else 'api'}"
            if not limiter.allow(key=key, rule=rule):
                return JSONResponse(
                    status_code=429,
                    media_type="application/problem+json",
                    content={"type": "about:blank", "title": "Too Many Requests", "status": 429, "detail": "Rate limit exceeded"},
                )

        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        if request.url.path not in {"/docs", "/redoc"}:
            resp.headers.setdefault("Content-Security-Policy", "default-src 'self'")
        if settings.environment == "production":
            resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return resp

    @app.middleware("http")
    async def _audit_log(request: Request, call_next):
        resp = await call_next(request)
        if request.method in {"POST", "PUT", "PATCH", "DELETE"} and resp.status_code < 500:
            school_raw = request.headers.get("X-School-Id")
            if school_raw:
                try:
                    school_id = uuid.UUID(school_raw)
                except Exception:
                    return resp
                user_id = None
                auth = request.headers.get("Authorization", "")
                if auth.lower().startswith("bearer "):
                    token = auth.split(" ", 1)[1].strip()
                    try:
                        payload = decode_access_token(token)
                        user_id = uuid.UUID(payload["sub"])
                    except Exception:
                        user_id = None
                action = f"{request.method} {request.url.path}"
                db = SessionLocal()
                try:
                    write_audit_log(db, school_id=school_id, action=action, user_id=user_id)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()
                finally:
                    db.close()
        return resp

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            media_type="application/problem+json",
            content={"type": "about:blank", "title": "Internal Server Error", "status": 500, "detail": "Unexpected error"},
        )

    @app.exception_handler(HTTPException)
    async def _http_exception_handler(request: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            payload = dict(detail)
            payload.setdefault("type", "about:blank")
            payload.setdefault("title", "Error")
            payload.setdefault("status", exc.status_code)
            payload.setdefault("detail", "Error")
        else:
            payload = {"type": "about:blank", "title": "Error", "status": exc.status_code, "detail": str(detail)}
        return JSONResponse(status_code=exc.status_code, media_type="application/problem+json", content=payload)

    @app.get(f"{settings.api_v1_prefix}/docs", include_in_schema=False)
    def _docs_redirect():
        return RedirectResponse(url="/docs")

    @app.get(f"{settings.api_v1_prefix}/redoc", include_in_schema=False)
    def _redoc_redirect():
        return RedirectResponse(url="/redoc")

    @app.get(f"{settings.api_v1_prefix}/openapi.json", include_in_schema=False)
    def _openapi_redirect():
        return RedirectResponse(url="/openapi.json")

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
