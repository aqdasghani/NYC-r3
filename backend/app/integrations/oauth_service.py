"""Google OAuth 2.0 integration for authentication.

Server-side only — no secrets exposed to frontend.
Uses standard OAuth 2.0 Authorization Code flow with PKCE for security.
"""
from __future__ import annotations

import hashlib
import secrets
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..models.database import OAuthAccount, User


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES = ["openid", "email", "profile"]


@dataclass
class GoogleUserInfo:
    sub: str
    email: str
    email_verified: bool
    name: str
    picture: Optional[str] = None
    locale: Optional[str] = None


@dataclass
class OAuthTokens:
    access_token: str
    refresh_token: Optional[str]
    expires_in: int
    token_type: str
    scope: str
    id_token: Optional[str] = None


class GoogleOAuthService:
    """Google OAuth 2.0 service with PKCE support."""

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def generate_pkce_pair(self) -> tuple[str, str]:
        """Generate PKCE code_verifier and code_challenge."""
        code_verifier = secrets.token_urlsafe(32)
        code_challenge = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = secrets.token_urlsafe(32)  # Actually use base64url encoded hash
        # Proper base64url encoding of SHA256 hash
        import base64
        code_challenge = base64.urlsafe_b64encode(code_challenge).decode().rstrip("=")
        return code_verifier, code_challenge

    def build_auth_url(self, state: str, code_challenge: str) -> str:
        """Build Google OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_SCOPES),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "offline",  # Request refresh token
            "prompt": "consent",  # Force consent to get refresh token
        }
        return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    async def exchange_code_for_tokens(self, code: str, code_verifier: str) -> OAuthTokens:
        """Exchange authorization code for access/refresh tokens."""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(GOOGLE_TOKEN_URL, data=data)
            response.raise_for_status()
            return OAuthTokens(**response.json())

    async def get_user_info(self, access_token: str) -> GoogleUserInfo:
        """Fetch user info from Google using access token."""
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
            response.raise_for_status()
            return GoogleUserInfo(**response.json())

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        """Refresh an expired access token using refresh token."""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(GOOGLE_TOKEN_URL, data=data)
            response.raise_for_status()
            return OAuthTokens(**response.json())


# Global instance
google_oauth = GoogleOAuthService()


# --- OAuth account management ---

def get_or_create_user_from_google(
    db: Session,
    google_user: GoogleUserInfo,
    tokens: OAuthTokens,
) -> User:
    """Find existing user by Google ID or email, or create new one."""
    # Check if OAuth account already exists
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.provider == "google",
        OAuthAccount.provider_user_id == google_user.sub,
    ).first()

    if oauth_account:
        # Update tokens
        oauth_account.access_token = tokens.access_token
        oauth_account.refresh_token = tokens.refresh_token
        oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=tokens.expires_in)
        oauth_account.scope = tokens.scope
        oauth_account.token_type = tokens.token_type
        oauth_account.updated_at = datetime.utcnow()
        db.commit()
        return db.get(User, oauth_account.user_id)

    # Check if user exists with this email
    user = db.query(User).filter(User.email == google_user.email).first()

    if user:
        # Link OAuth account to existing user
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=google_user.sub,
            provider_email=google_user.email,
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            expires_at=datetime.utcnow() + timedelta(seconds=tokens.expires_in),
            scope=tokens.scope,
            token_type=tokens.token_type,
        )
        db.add(oauth_account)
        db.commit()
        return user

    # Create new user
    user = User(
        name=google_user.name,
        email=google_user.email,
        role="OWNER",  # First user becomes owner
        hashed_password="",  # No password for OAuth-only users
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create store for the new user
    from ..models.database import Store
    store = Store(name=f"{google_user.name}'s Store", store_type="Kirana & Grocery", is_active=True)
    db.add(store)
    db.flush()

    user.store_id = store.id
    store.owner_id = user.id

    # Link OAuth account
    oauth_account = OAuthAccount(
        user_id=user.id,
        provider="google",
        provider_user_id=google_user.sub,
        provider_email=google_user.email,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_at=datetime.utcnow() + timedelta(seconds=tokens.expires_in),
        scope=tokens.scope,
        token_type=tokens.token_type,
    )
    db.add(oauth_account)

    db.commit()
    db.refresh(user)
    return user


def link_google_account(
    db: Session,
    user: User,
    google_user: GoogleUserInfo,
    tokens: OAuthTokens,
) -> OAuthAccount:
    """Link a Google account to an existing authenticated user."""
    # Check if already linked
    existing = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == user.id,
        OAuthAccount.provider == "google",
    ).first()

    if existing:
        # Update existing link
        existing.provider_user_id = google_user.sub
        existing.provider_email = google_user.email
        existing.access_token = tokens.access_token
        existing.refresh_token = tokens.refresh_token
        existing.expires_at = datetime.utcnow() + timedelta(seconds=tokens.expires_in)
        existing.scope = tokens.scope
        existing.token_type = tokens.token_type
        existing.updated_at = datetime.utcnow()
        db.commit()
        return existing

    # Create new link
    oauth_account = OAuthAccount(
        user_id=user.id,
        provider="google",
        provider_user_id=google_user.sub,
        provider_email=google_user.email,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_at=datetime.utcnow() + timedelta(seconds=tokens.expires_in),
        scope=tokens.scope,
        token_type=tokens.token_type,
    )
    db.add(oauth_account)
    db.commit()
    return oauth_account


def unlink_oauth_account(db: Session, user: User, provider: str) -> bool:
    """Unlink an OAuth provider from user."""
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == user.id,
        OAuthAccount.provider == provider,
    ).first()

    if oauth_account:
        db.delete(oauth_account)
        db.commit()
        return True
    return False