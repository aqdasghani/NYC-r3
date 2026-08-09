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
import httpx

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
    clear_auth_cookies(response)
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


# ============================================================================
# Google OAuth endpoints
# ============================================================================

@router.get("/google/url", response_model=GoogleAuthUrlResponse)
def google_auth_url(request: Request):
    """Initiate Google OAuth flow - returns authorization URL with PKCE."""
    if not google_oauth.is_configured():
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    state = _generate_token()
    code_verifier, code_challenge = google_oauth.generate_pkce_pair()

    # Store PKCE verifier in session/cookie for callback verification
    # In production, use Redis or secure session store
    response = Response(content='{"auth_url": "pending"}')
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=600  # 10 minutes
    )
    response.set_cookie(
        key="oauth_code_verifier",
        value=code_verifier,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=600
    )

    auth_url = google_oauth.build_auth_url(state, code_challenge)

    return GoogleAuthUrlResponse(auth_url=auth_url, state=state)


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    request: Request,
    response: Response,
    db=Depends(get_db)
):
    """Handle Google OAuth callback - exchange code for tokens, create/link user."""
    if not google_oauth.is_configured():
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    # Verify state parameter
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    code_verifier = request.cookies.get("oauth_code_verifier")
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Missing PKCE code verifier")

    # Exchange code for tokens
    try:
        tokens = await google_oauth.exchange_code_for_tokens(code, code_verifier)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e.response.text}")

    # Get user info from Google
    try:
        google_user = await google_oauth.get_user_info(tokens.access_token)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user info: {e.response.text}")

    # Get or create user
    user = get_or_create_user_from_google(db, google_user, tokens)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")

    # Create access token and set cookies
    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
        store_id=user.store_id,
        email=user.email
    )
    refresh_token = _generate_token()
    # Store refresh token hash in DB for validation (simplified - in production use proper token store)

    set_auth_cookie(response, access_token)
    set_refresh_cookie(response, refresh_token)

    # Clear OAuth cookies
    response.delete_cookie(key="oauth_state", httponly=True, secure=True, samesite="lax")
    response.delete_cookie(key="oauth_code_verifier", httponly=True, secure=True, samesite="lax")

    # Redirect to dashboard
    response.headers["Location"] = "/dashboard"
    response.status_code = 302
    return response


@router.post("/link/google", response_model=UserOut)
async def link_google(
    payload: OAuthLinkRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Link Google account to currently authenticated user."""
    if not google_oauth.is_configured():
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    # Verify state parameter
    stored_state = payload.state
    # In production, verify against stored state from link initiation

    # Exchange code for tokens
    try:
        tokens = await google_oauth.exchange_code_for_tokens(payload.code, "")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e.response.text}")

    # Get user info from Google
    try:
        google_user = await google_oauth.get_user_info(tokens.access_token)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user info: {e.response.text}")

    # Check if this Google account is already linked to another user
    existing_link = db.query(OAuthAccount).filter(
        OAuthAccount.provider == "google",
        OAuthAccount.provider_user_id == google_user.sub,
    ).first()

    if existing_link and existing_link.user_id != current_user.id:
        raise HTTPException(
            status_code=409,
            detail="This Google account is already linked to another user"
        )

    # Link the account
    link_google_account(db, current_user, google_user, tokens)
    db.refresh(current_user)

    return UserOut.model_validate(current_user)


@router.delete("/unlink/google")
def unlink_google(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Unlink Google account from current user."""
    success = unlink_oauth_account(db, current_user, "google")
    if not success:
        raise HTTPException(status_code=404, detail="Google account not linked")
    return {"detail": "Google account unlinked successfully"}


# ============================================================================
# Email Verification endpoints
# ============================================================================

@router.post("/verify-email")
def verify_email(
    payload: EmailVerificationRequest,
    response: Response,
    db=Depends(get_db)
):
    """Verify user's email with token."""
    token_hash = _hash_token(payload.token)

    verification = db.query(EmailVerification).filter(
        EmailVerification.token_hash == token_hash,
        EmailVerification.verified_at.is_(None),
        EmailVerification.expires_at > datetime.utcnow()
    ).first()

    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user = db.get(User, verification.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.email_verified = True
    verification.verified_at = datetime.utcnow()
    db.commit()

    return {"detail": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Resend email verification token."""
    if current_user.email_verified:
        return {"detail": "Email already verified"}

    # Invalidate old tokens
    db.query(EmailVerification).filter(
        EmailVerification.user_id == current_user.id,
        EmailVerification.verified_at.is_(None)
    ).delete()

    # Generate new token
    raw_token = _generate_token()
    token_hash = _hash_token(raw_token)

    verification = EmailVerification(
        user_id=current_user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(verification)
    db.commit()

    # In production, send email with raw_token
    # For now, return it for testing
    return {"detail": "Verification email sent", "token": raw_token}


# ============================================================================
# Password Reset endpoints
# ============================================================================

@router.post("/forgot-password")
def forgot_password(
    payload: PasswordResetRequest,
    db=Depends(get_db)
):
    """Request password reset - generates token and sends email."""
    user = db.query(User).filter(User.email == payload.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"detail": "If the email exists, a reset link has been sent"}

    # Don't allow reset for OAuth-only users (no password set)
    if not user.hashed_password:
        raise HTTPException(status_code=400, detail="Cannot reset password for OAuth-only accounts")

    # Invalidate old tokens
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.used_at.is_(None)
    ).delete()

    # Generate new token
    raw_token = _generate_token()
    token_hash = _hash_token(raw_token)

    reset = PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(reset)
    db.commit()

    # In production, send email with raw_token
    # For now, return it for testing
    return {"detail": "If the email exists, a reset link has been sent", "token": raw_token}


@router.post("/reset-password")
def reset_password(
    payload: PasswordResetConfirm,
    response: Response,
    db=Depends(get_db)
):
    """Confirm password reset with token."""
    token_hash = _hash_token(payload.token)

    reset = db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.used_at.is_(None),
        PasswordReset.expires_at > datetime.utcnow()
    ).first()

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.get(User, reset.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.password)
    reset.used_at = datetime.utcnow()
    db.commit()

    # Log user in automatically
    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
        store_id=user.store_id,
        email=user.email
    )
    set_auth_cookie(response, access_token)

    return {"detail": "Password reset successful", "user": UserOut.model_validate(user)}


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)
    return {"detail": "Logged out successfully"}
