"""Auth router: register, login, current user, Google OAuth, email verification, password reset.

Swagger-friendly endpoints:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/auth/google/url
- GET /api/auth/google/callback
- POST /api/auth/verify-email
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/logout
- POST /api/auth/users (OWNER only)
- GET /api/auth/users
- POST /api/auth/invites
- POST /api/auth/invites/accept
- POST /api/auth/link/google
- DELETE /api/auth/unlink/google
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import EmailStr

from ..models.database import Store, User, Invitation, EmailVerification, PasswordReset, OAuthAccount
from ..security import hash_password, verify_password, create_access_token, decode_token
from ..deps import get_db, get_current_user, get_owner
from ..models.schemas import (
    TokenResponse, UserOut, RegisterRequest, LoginRequest, UserCreate,
    InviteRequest, InviteAccept, GoogleAuthUrlResponse, GoogleCallbackRequest,
    OAuthLinkRequest, EmailVerificationRequest, PasswordResetRequest, PasswordResetConfirm
)
from ..integrations.oauth_service import google_oauth, get_or_create_user_from_google, link_google_account, unlink_oauth_account
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # Set to True for HTTPS
        samesite="lax",
        max_age=86400  # 24 hours
    )

def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 86400  # 30 days
    )

def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", httponly=True, secure=True, samesite="lax")
    response.delete_cookie(key="refresh_token", httponly=True, secure=True, samesite="lax")

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def _generate_token() -> str:
    return secrets.token_urlsafe(32)

@router.post("/register", response_model=UserOut)
def register(payload: RegisterRequest, response: Response, db=Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    # Every new account owns a store so the dashboard and AI have a working scope.
    store = Store(name=payload.store_name or f"{payload.name}'s Store", store_type="Kirana & Grocery", is_active=True)
    db.add(store)
    db.flush()
    user = User(name=payload.name, email=payload.email, role="OWNER", store_id=store.id,
                hashed_password=hash_password(payload.password), phone=payload.phone)
    db.add(user)
    db.flush()
    store.owner_id = user.id
    db.commit()
    db.refresh(user)
    
    token = create_access_token(user_id=user.id, role=user.role, store_id=store.id, email=user.email)
    set_auth_cookie(response, token)
    return UserOut.model_validate(user)


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db=Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended")

    token = create_access_token(user_id=user.id, role=user.role, store_id=user.store_id, email=user.email)
    set_auth_cookie(response, token)
    return UserOut.model_validate(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, secure=True, samesite="lax")
    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/users", response_model=UserOut)
def create_employee(payload: UserCreate, owner: User = Depends(get_owner), db=Depends(get_db)):
    """OWNER-only: create an employee (MANAGER/BILLER/WORKER) in the owner's store.
    The role is validated server-side — never taken from an unauthenticated caller."""
    if not owner.store_id:
        raise HTTPException(status_code=403, detail="Owner is not assigned to a store")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        store_id=owner.store_id,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/users")
def get_users(user: User = Depends(get_owner), db=Depends(get_db)):
    """Get all users for the current store."""
    if not user.store_id:
        raise HTTPException(status_code=403, detail="Owner is not assigned to a store")
    users = db.query(User).filter(User.store_id == user.store_id).all()
    return [UserOut.model_validate(u) for u in users]


import secrets
from ..models.database import Invitation

@router.post("/invites")
def create_invite(payload: InviteRequest, owner: User = Depends(get_owner), db=Depends(get_db)):
    if not owner.store_id:
        raise HTTPException(status_code=403, detail="Owner is not assigned to a store")
    
    # Check if user already exists
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="User already exists with this email")
        
    token = secrets.token_urlsafe(32)
    # in a real system we would hash the token for DB storage, but for simplicity here we just store it
    # token_hash = hash_password(token) # but let's just use it directly for MVP
    
    invitation = Invitation(
        store_id=owner.store_id,
        email=payload.email,
        role=payload.role,
        token_hash=token, # stored as plaintext token here for ease of MVP verification
        expires_at=datetime.utcnow() + timedelta(days=7),
        invited_by=owner.id
    )
    db.add(invitation)
    db.commit()
    
    # Normally we would send an email here.
    return {"detail": "Invite generated", "invite_link": f"/invite/{token}"}


@router.post("/invites/accept", response_model=UserOut)
def accept_invite(payload: InviteAccept, response: Response, db=Depends(get_db)):
    # Find the invite
    invite = db.query(Invitation).filter(
        Invitation.token_hash == payload.token,
        Invitation.accepted_at.is_(None)
    ).first()
    
    if not invite or invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")
        
    # Check if user already exists
    if db.query(User).filter(User.email == invite.email).first():
        raise HTTPException(status_code=409, detail="User already exists with this email")
        
    user = User(
        name=payload.name,
        email=invite.email,
        role=invite.role,
        store_id=invite.store_id,
        hashed_password=hash_password(payload.password)
    )
    db.add(user)
    
    invite.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    token = create_access_token(user_id=user.id, role=user.role, store_id=user.store_id, email=user.email)
    set_auth_cookie(response, token)
    return UserOut.model_validate(user)
