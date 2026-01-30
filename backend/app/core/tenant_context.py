from __future__ import annotations

import uuid
from contextvars import ContextVar, Token
from typing import Optional


_tenant_id_ctx: ContextVar[Optional[uuid.UUID]] = ContextVar("tenant_id", default=None)


def get_tenant_id() -> Optional[uuid.UUID]:
    return _tenant_id_ctx.get()


def set_tenant_id(tenant_id: Optional[uuid.UUID]) -> Token[Optional[uuid.UUID]]:
    return _tenant_id_ctx.set(tenant_id)


def reset_tenant_id(token: Token[Optional[uuid.UUID]]) -> None:
    _tenant_id_ctx.reset(token)

