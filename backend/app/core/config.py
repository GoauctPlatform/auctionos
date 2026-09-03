from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Union, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "GoAuct"
    API_V1_STR: str = "/api/v1"
    # No default value: server will refuse to start if SECRET_KEY is not set in env.
    # In production, generate with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60          # 1 hour (was 24h — reduced for security)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7             # Refresh token lifespan
    FRONTEND_URL: str = "https://www.goauct.com"
    
    # Optional Sentry DSN for error tracking
    SENTRY_DSN: Optional[str] = None
    
    # OAuth Configurations
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    DATABASE_URL: str = "sqlite:///./sql_app.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_postgres_url(cls, v: str) -> str:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    REDIS_URL: str = "redis://redis:6379"
    ZENROWS_API_KEY: Optional[str] = None
    ATTOM_API_KEY: Optional[str] = None
    VITE_GOOGLE_STREET_VIEW_KEY: Optional[str] = None
    
    # Stripe Payment Integration
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_ADVANCED_PRICE_ID: Optional[str] = None
    STRIPE_PRO_PRICE_ID: Optional[str] = None
    STRIPE_ENTERPRISE_PRICE_ID: Optional[str] = None

    # Email Configuration
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_FROM_NAME: Optional[str] = "GoAuct"
    MAIL_PORT: int = 465
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = True

    # Resend API
    RESEND_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        case_sensitive=True, 
        env_file=".env",
        protected_namespaces=()
    )

settings = Settings()
