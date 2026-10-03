from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"

# Deploy codename for Railway / hosted API (product UI remains "Sentinel").
CITADEL_CODENAME = "citadel"

_DEFAULT_CORS = ",".join(
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://sogki.dev",
        "https://www.sogki.dev",
    ]
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    sentinel_service_secret: str = "dev-sentinel-secret"
    sentinel_admin_tokens: str = "dev-admin-token"
    admin_jwt_secret: str = ""
    database_url: str = ""
    sentinel_host: str = "0.0.0.0"
    # Railway injects PORT; local compose may set SENTINEL_PORT.
    port: int = Field(default=8790, validation_alias=AliasChoices("PORT", "SENTINEL_PORT"))
    sentinel_cors_origins: str = _DEFAULT_CORS
    sentinel_cors_origin_regex: str = r"https://.*\.vercel\.app"
    sentinel_request_timeout_seconds: float = 10.0
    sentinel_max_redirects: int = 5
    sentinel_user_agent: str = "SentinelPrivateScanner/1.0 (+personal-lab; non-destructive)"
    app_version: str = "1.0.0"
    deploy_codename: str = CITADEL_CODENAME

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.sentinel_cors_origins.split(",") if o.strip()]

    @property
    def admin_token_set(self) -> set[str]:
        return {t.strip() for t in self.sentinel_admin_tokens.split(",") if t.strip()}

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url.strip():
            return self.database_url.strip()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{(DATA_DIR / 'sentinel.db').as_posix()}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
