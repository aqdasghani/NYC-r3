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
    ENVIRONMENT: str = "development"  # development | demo | production
    DEBUG: bool = True

    # Database — SQLite default for dev/test, PostgreSQL required for production.
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'greenshop.db'}"
    SEED_WITH_SYNTHETIC_DATA: bool = False

    # Auth
    JWT_SECRET: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MIN: int = 1440  # 24h
    GOOGLE_CLIENT_ID: str = ""

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
        return str(self.DATABASE_URL).startswith("sqlite")

    def validate_production(self) -> None:
        if self.ENVIRONMENT == "production":
            db_url = str(self.DATABASE_URL).lower()
            pg_prefixes = ("postgresql://", "postgres://", "postgresql+psycopg://", "postgresql+psycopg2://")
            if not self.DATABASE_URL or self.is_sqlite or not db_url.startswith(pg_prefixes):
                raise ValueError("Production mode requires PostgreSQL DATABASE_URL, not SQLite.")
            if not self.JWT_SECRET or self.JWT_SECRET == "dev-secret-change-me-in-production":
                raise ValueError("Production mode requires a secure JWT_SECRET environment variable.")
            if not self.CORS_ORIGINS or not self.cors_origin_list:
                raise ValueError("Production mode requires explicit CORS_ORIGINS.")
            if self.DEBUG:
                self.DEBUG = False


settings = Settings()
if settings.ENVIRONMENT == "production":
    settings.validate_production()
    settings.DEBUG = False

