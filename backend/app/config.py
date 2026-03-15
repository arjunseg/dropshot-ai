from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    app_env: Literal["development", "production", "test"] = "development"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://dropshot:dropshot@localhost:5432/dropshot"
    redis_url: str = "redis://localhost:6379/0"

    # ── Storage ──────────────────────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "dropshot-videos"
    aws_s3_region: str = "us-east-1"
    aws_s3_endpoint_url: str | None = None  # None = real AWS; set for MinIO

    # ── Auth ─────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "dev_secret_change_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 30

    # ── Stripe ───────────────────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""

    # ── Claude / Anthropic ───────────────────────────────────────────────────
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-6"

    # ── Expo Push ────────────────────────────────────────────────────────────
    expo_access_token: str = ""

    # ── Pipeline ─────────────────────────────────────────────────────────────
    pipeline_max_video_bytes: int = 524_288_000  # 500 MB
    pipeline_target_fps: int = 30
    paddle_model_path: str = "./models/paddle_detector_v1.pt"
    paddle_confidence_threshold: float = 0.7

    # ── Business Rules ───────────────────────────────────────────────────────
    free_tier_monthly_limit: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()
