"""Shared FastAPI dependencies: DB session, current user, RBAC, financial redaction."""
from __future__ import annotations

import uuid
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .models.database import SessionLocal, User

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> object:
    """Yield a DB session, closing it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    from .security import decode_token

    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_roles(*roles: str):
    """Dependency factory — returns a dependency enforcing that the current
    user holds one of ``roles`` (RBAC per architecture §9)."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return current_user

    return dependency


get_owner_manager = require_roles("OWNER", "MANAGER")
get_owner = require_roles("OWNER")

# Staff are allowed AI reads but not financials / not executions.
STAFF_FINANCIAL_KEYS = {"value_at_risk", "value_locked", "sale_price", "gst_amount", "purchase_price", "price"}


def redact_financials(data: Any) -> Any:
    """Deep-copy ``data`` (dict/list) with financial fields set to None.
    Used so STAFF never sees ₹ figures they are not entitled to."""
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if k in STAFF_FINANCIAL_KEYS:
                out[k] = None
            else:
                out[k] = redact_financials(v)
        return out
    if isinstance(data, list):
        return [redact_financials(item) for item in data]
    return data
