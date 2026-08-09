"""Application configuration via environment variables / .env file."""
from __future__ import annotations

from pathlib import Path

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

    # Cache (optional Redis; empty -> in-memory)
    REDIS_URL: str = ""

    # AI services (all optional; empty -> mock-first fallbacks)
    GOOGLE_VISION_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # WhatsApp
    WHATSAPP_VERIFY_TOKEN: str = "greenshop-demo"
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""

    # CORS — comma-separated origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # Scheduler
    DISABLE_SCHEDULER: bool = False
    DETECTION_INTERVAL_MINUTES: int = 15

    # Seed
    SEED_PRODUCT_COUNT: int = 1284

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
