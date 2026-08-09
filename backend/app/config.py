"""Application configuration via environment variables / .env file."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "GreenShop AI"
    DEBUG: bool = True

    # Database — SQLite default, switch to PostgreSQL via full URL.
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'greenshop.db'}"

    # Auth
    JWT_SECRET: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MIN: int = 1440  # 24h
    JWT_REFRESH_EXPIRES_DAYS: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/google"

    # Cache (optional Redis; empty -> in-memory)
    REDIS_URL: str = ""

    # AI services
    GOOGLE_VISION_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # AI Provider abstraction
    AI_PROVIDER: str = "gemini"  # gemini | ollama | openai
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    # WhatsApp
    WHATSAPP_VERIFY_TOKEN: str = "greenshop-demo"
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""

    # CORS — comma-separated origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://greenshop-ai.vercel.app,*"

    # Scheduler
    DISABLE_SCHEDULER: bool = False
    DETECTION_INTERVAL_MINUTES: int = 15

    # Seed — demo data only when explicitly enabled. A fresh DB with SEED_DEMO=false
    # boots empty (real onboarding); demo environments opt in.
    SEED_DEMO: bool = False  # Changed default to False for production
    SEED_PRODUCT_COUNT: int = 1284

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
