"""
Application configuration using Pydantic BaseSettings.
"""
import json
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    # Core
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_SECRET: str = "jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://suraksha:password@localhost:5432/suraksha_db"
    DATABASE_POOL_SIZE: int = 20        # base connections per process
    DATABASE_MAX_OVERFLOW: int = 40     # burst headroom; 20+40=60 max supports 10k concurrent workers
    DATABASE_POOL_TIMEOUT: int = 30     # seconds to wait before raising on exhausted pool
    DATABASE_POOL_RECYCLE: int = 1800   # recycle idle connections every 30 min (avoids stale TCP)

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300  # 5 minutes

    # External APIs
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_API_URL: str = "https://api.openweathermap.org/data/2.5"
    OPENAQ_API_URL: str = "https://api.openaq.org/v2"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    STRIPE_SECRET_KEY: str = ""

    # Feature Flags
    MOCK_MODE: bool = True
    MOCK_WEATHER_DATA: bool = True
    MOCK_AQI_DATA: bool = True
    MOCK_PLATFORM_OUTAGE: bool = True

    # Fraud Detection
    FRAUD_MODEL_PATH: str = "ml/models/fraud_model.joblib"
    FRAUD_SCORE_THRESHOLD_LOW: int = 30
    FRAUD_SCORE_THRESHOLD_MED: int = 65
    FRAUD_SCORE_THRESHOLD_HIGH: int = 85
    FRAUD_SCORE_THRESHOLD_CRITICAL: int = 100

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ]
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1"]

    # Admin / Internal Security
    ADMIN_TOKEN: str = "dev-admin-token-change-in-production"
    INTERNAL_SERVICE_SECRET: str = ""  # Set to a strong secret to allow internal bypass of rate limits

    # Health Probes (PRD §38)
    STARTUP_TIMEOUT_SECONDS: int = 60  # Max seconds the startup probe waits for all init steps

    # API Versioning
    DEPRECATED_VERSIONS_RAW: str = "{}"  # JSON map: {"v1": "2027-04-01"}

    # Claim Processing
    CLAIM_AUTO_APPROVE_WORKER_COUNT: int = 100
    CLAIM_MANUAL_REVIEW_SLA_MINUTES: int = 30
    CLAIM_MAX_PAYOUT_MULTIPLIER: float = 1.5

    # Trigger Thresholds (Parametric)
    TRIGGER_HEAVY_RAIN_MM_PER_HOUR: float = 5.0
    TRIGGER_HEAVY_RAIN_MIN_DURATION_MINUTES: int = 30
    TRIGGER_EXTREME_HEAT_CELSIUS: float = 42.0
    TRIGGER_EXTREME_HEAT_WINDOW_HOURS: int = 2
    TRIGGER_SEVERE_POLLUTION_AQI: int = 300
    TRIGGER_SEVERE_POLLUTION_DURATION_HOURS: int = 2
    TRIGGER_PLATFORM_OUTAGE_MINUTES: int = 60
    TRIGGER_CONFIDENCE_THRESHOLD: float = 0.75

    # Dynamic Pricing Engine (FR-3 / PRD §9)
    PREMIUM_BASE_RATE: float = 99.0       # ₹ base before multipliers (standard plan)
    PREMIUM_FLOOR: float = 29.0           # ₹ minimum weekly premium
    PREMIUM_CEILING: float = 299.0        # ₹ maximum weekly premium (standard plan)
    PREMIUM_MODEL_PATH: str = "ml/models/premium_model.pkl"
    COVERAGE_CAP_MULTIPLIER: float = 1.6  # coverage = avg_weekly_earnings × this
    COVERAGE_CAP_MIN: float = 2000.0      # ₹ hard minimum coverage
    COVERAGE_CAP_MAX: float = 20000.0     # ₹ hard maximum coverage

    # Deterministic weekly premium engine
    WEEKLY_PREMIUM_BASE_RATE_BY_CITY: dict = {
        "default": 49.0,
    }
    WEEKLY_PREMIUM_FLOOR: float = 29.0
    WEEKLY_PREMIUM_CEILING: float = 149.0

    # Policy lifecycle
    POLICY_QUOTE_TTL_SECONDS: int = 600
    POLICY_EVENTS_CHANNEL: str = "policy_events"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def DEPRECATED_VERSIONS(self) -> dict[str, str]:
        try:
            parsed = json.loads(self.DEPRECATED_VERSIONS_RAW)
            if isinstance(parsed, dict):
                return {str(k): str(v) for k, v in parsed.items()}
        except Exception:
            pass
        return {}


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Returns:
        Settings: Application settings singleton
    """
    return Settings()


settings = get_settings()
