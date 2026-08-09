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

from ..models.database import User, Store
from ..security import hash_password, verify_password, create_access_token, decode_token
from ..deps import get_db, get_current_user, require_roles
import os
from google.oauth2 import id_token
from google.auth.transport import requests

# In a real app, you'd persist users; here we bootstrap a demo user if not present.

from ..models.schemas import TokenResponse, UserOut, RegisterRequest, LoginRequest, GoogleLoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db=Depends(get_db)):
    try:
        # Verify the token against Google
        # We don't enforce audience here because we use a dummy client ID for demo, but in production we'd pass audience=CLIENT_ID
        idinfo = id_token.verify_oauth2_token(payload.token, requests.Request())
        
        email = idinfo.get("email")
        if not email:
            raise ValueError("No email provided by Google")
            
        google_id = idinfo.get("sub")
        name = idinfo.get("name", "Google User")
        picture = idinfo.get("picture")

        user = db.query(User).filter(User.email == email).first()
        if user:
            # Update existing user with Google info
            user.google_id = google_id
            user.picture_url = picture
            db.commit()
            db.refresh(user)
        else:
            # Create Store for new user
            store = Store(name=f"{name}'s Store", store_type="Other")
            db.add(store)
            db.commit()
            db.refresh(store)
            
            # Create User
            user = User(
                name=name,
                email=email,
                role="OWNER",
                store_id=store.id,
                hashed_password=None,
                google_id=google_id,
                picture_url=picture
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Link store owner
            store.owner_id = user.id
            db.commit()
            
        token = create_access_token(user_id=user.id, role=user.role, store_id=user.store_id, email=user.email)
        return TokenResponse(access_token=token, user=UserOut.model_validate(user))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google token: {str(e)}")




@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db=Depends(get_db)):
    # Check if user already exists
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Create Store if provided
    store = None
    if payload.store_name:
        store = Store(name=payload.store_name, store_type=payload.store_type)
        db.add(store)
        db.commit()
        db.refresh(store)

    # Create User
    user = User(
        name=payload.name, 
        email=payload.email, 
        role="OWNER" if store else payload.role, 
        store_id=store.id if store else None, 
        hashed_password=hash_password(payload.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Link store owner
    if store:
        store.owner_id = user.id
        db.commit()

    token = create_access_token(user_id=user.id, role=user.role, store_id=user.store_id, email=user.email)
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
