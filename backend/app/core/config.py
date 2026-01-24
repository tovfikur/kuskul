import json

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", enable_decoding=False)

    app_name: str = "KusKul SMS API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./dev.db"

    jwt_issuer: str = "kuskul"
    jwt_audience: str = "kuskul-web"
    jwt_secret_key: str = Field(default="change-me-please-32-bytes", min_length=16)
    jwt_access_token_expires_minutes: int = 60

    refresh_token_expires_days: int = 7
    refresh_token_cookie_name: str = "refresh_token"
    refresh_token_cookie_secure: bool = False
    refresh_token_cookie_samesite: str = "lax"

    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    rate_limit_enabled: bool = True
    rate_limit_api_per_minute: int = 100
    rate_limit_auth_per_15_minutes: int = 5

    @property
    def cors_allow_origins(self) -> list[str]:
        s = (self.cors_origins or "").strip()
        if not s:
            return []
        if s.startswith("["):
            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    return [str(x).strip() for x in parsed if str(x).strip()]
            except Exception:
                return []
        return [part.strip() for part in s.split(",") if part.strip()]


settings = Settings()
