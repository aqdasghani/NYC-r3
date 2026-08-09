"""Auth router: register, login, and current user.

Swagger-friendly endpoints:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from ..models.database import User
from ..security import hash_password, verify_password, create_access_token, decode_token
from ..deps import get_db, get_current_user, require_roles
from ..models.schemas import TokenResponse, UserOut, RegisterRequest, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In a real app, you'd persist users; here we bootstrap a demo user if not present.

@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db=Depends(get_db)):
    # Simple in-memory create; in a real DB we would query by email
    user = User(name=payload.name, email=payload.email, role=payload.role, store_id=None, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user_id=user.id, role=user.role, store_id=None, email=user.email)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login")
def login(payload: LoginRequest, db=Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user_id=user.id, role=user.role, store_id=user.store_id, email=user.email)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
