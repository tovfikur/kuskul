from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.db.session import SessionLocal
from app.models.tenant import Tenant
import uuid
from app.core.tenant_context import reset_tenant_id, set_tenant_id
from app.core.config import settings

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(("/docs", "/redoc", "/openapi.json", "/static", "/health")):
            return await call_next(request)

        forwarded_host = request.headers.get("x-forwarded-host")
        raw_host = forwarded_host.split(",", 1)[0].strip() if forwarded_host else request.headers.get("host", "")
        host = raw_host.split(":")[0]
        parts = host.split(".")
        
        request.state.tenant = None
        request.state.tenant_id = None
        request.state.is_saas_admin = False

        subdomain = None
        if "localhost" in host:
            if parts[0] != "localhost":
                subdomain = parts[0]
        else:
            if len(parts) > 2:
                subdomain = parts[0]
            
        if subdomain:
            if subdomain == "admin":
                request.state.is_saas_admin = True
            else:
                db = SessionLocal()
                try:
                    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
                    if tenant:
                        if tenant.status != "active":
                            return JSONResponse(
                                status_code=403, 
                                content={"detail": "Your school account is temporarily suspended. Contact support."}
                            )
                        request.state.tenant = tenant
                        request.state.tenant_id = tenant.id
                finally:
                    db.close()

        if not request.state.tenant_id:
            tenant_subdomain = request.headers.get("X-Tenant-Subdomain")
            if tenant_subdomain:
                tenant_subdomain = tenant_subdomain.strip().lower()
                if tenant_subdomain == "admin":
                    request.state.is_saas_admin = True
                else:
                    db = SessionLocal()
                    try:
                        tenant = db.query(Tenant).filter(Tenant.subdomain == tenant_subdomain).first()
                        if tenant:
                            if tenant.status != "active":
                                return JSONResponse(status_code=403, content={"detail": "Tenant inactive"})
                            request.state.tenant = tenant
                            request.state.tenant_id = tenant.id
                    finally:
                        db.close()
        
        if not request.state.tenant_id:
             tenant_header = request.headers.get("X-Tenant-ID")
             if tenant_header:
                 try:
                     t_id = uuid.UUID(tenant_header)
                     db = SessionLocal()
                     try:
                         tenant = db.query(Tenant).filter(Tenant.id == t_id).first()
                         if tenant:
                             if tenant.status != "active":
                                 return JSONResponse(status_code=403, content={"detail": "Tenant inactive"})
                             request.state.tenant = tenant
                             request.state.tenant_id = tenant.id
                     finally:
                         db.close()
                 except ValueError:
                     pass
        if not request.state.tenant_id:
             origin = request.headers.get("origin")
             if origin:
                 origin_host = origin.split("://")[-1].split(":")[0]
                 origin_parts = origin_host.split(".")
                 origin_subdomain = None
                 
                 if "localhost" in origin_host:
                    if origin_parts[0] != "localhost":
                        origin_subdomain = origin_parts[0]
                 elif len(origin_parts) > 2:
                    origin_subdomain = origin_parts[0]

                 if origin_subdomain and origin_subdomain != "admin":
                     db = SessionLocal()
                     try:
                         tenant = db.query(Tenant).filter(Tenant.subdomain == origin_subdomain).first()
                         if tenant:
                             if tenant.status != "active":
                                 return JSONResponse(status_code=403, content={"detail": "Tenant inactive"})
                             request.state.tenant = tenant
                             request.state.tenant_id = tenant.id
                     finally:
                         db.close()

        if not request.state.tenant_id and settings.environment == "development":
            qp = request.query_params.get("tenant")
            if qp:
                qp = qp.strip().lower()
                if qp == "admin":
                    request.state.is_saas_admin = True
                else:
                    db = SessionLocal()
                    try:
                        tenant = db.query(Tenant).filter(Tenant.subdomain == qp).first()
                        if tenant:
                            if tenant.status != "active":
                                return JSONResponse(status_code=403, content={"detail": "Tenant inactive"})
                            request.state.tenant = tenant
                            request.state.tenant_id = tenant.id
                    finally:
                        db.close()


        token = set_tenant_id(request.state.tenant_id)
        try:
            response = await call_next(request)
            return response
        finally:
            reset_tenant_id(token)
