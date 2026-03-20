"""
Trigger Poller Configuration

Loaded from environment variables with sensible dev defaults.
All thresholds mirror the FastAPI API config so they stay in sync.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass
class PollerConfig:
    # ── Infrastructure ────────────────────────────────────────────────────────
    database_url: str = field(default_factory=lambda: os.getenv(
        "DATABASE_URL",
        "postgresql://suraksha:password@localhost:5432/suraksha_db",
    ))
    redis_url: str = field(default_factory=lambda: os.getenv(
        "REDIS_URL", "redis://localhost:6379/0"
    ))

    # ── External APIs ─────────────────────────────────────────────────────────
    openweather_api_key: str = field(default_factory=lambda: os.getenv("OPENWEATHER_API_KEY", ""))
    openweather_url: str = field(default_factory=lambda: os.getenv(
        "OPENWEATHER_API_URL", "https://api.openweathermap.org/data/2.5"
    ))
    openaq_url: str = field(default_factory=lambda: os.getenv(
        "OPENAQ_API_URL", "https://api.openaq.org/v2"
    ))

    # ── Mock feeds paths ──────────────────────────────────────────────────────
    mock_feeds_dir: str = field(default_factory=lambda: os.getenv(
        "MOCK_FEEDS_DIR", "../../infra/mock_feeds"
    ))

    # ── Feature flags ─────────────────────────────────────────────────────────
    mock_mode: bool = field(default_factory=lambda: os.getenv("MOCK_MODE", "true").lower() == "true")
    poll_interval_seconds: int = field(default_factory=lambda: int(os.getenv("POLL_INTERVAL_SECONDS", "300")))

    # ── Trigger thresholds ────────────────────────────────────────────────────
    heavy_rain_mm_per_hr:         float = field(default_factory=lambda: float(os.getenv("TRIGGER_HEAVY_RAIN_MM_PER_HOUR", "5.0")))
    heavy_rain_duration_minutes:  int   = field(default_factory=lambda: int(os.getenv("TRIGGER_HEAVY_RAIN_MIN_DURATION_MINUTES", "30")))
    extreme_heat_celsius:         float = field(default_factory=lambda: float(os.getenv("TRIGGER_EXTREME_HEAT_CELSIUS", "42.0")))
    extreme_heat_hours:           int   = field(default_factory=lambda: int(os.getenv("TRIGGER_EXTREME_HEAT_WINDOW_HOURS", "2")))
    severe_aqi:                   int   = field(default_factory=lambda: int(os.getenv("TRIGGER_SEVERE_POLLUTION_AQI", "300")))
    severe_aqi_hours:             int   = field(default_factory=lambda: int(os.getenv("TRIGGER_SEVERE_POLLUTION_DURATION_HOURS", "2")))
    platform_outage_minutes:      int   = field(default_factory=lambda: int(os.getenv("TRIGGER_PLATFORM_OUTAGE_MINUTES", "60")))
    confidence_threshold:         float = field(default_factory=lambda: float(os.getenv("TRIGGER_CONFIDENCE_THRESHOLD", "0.75")))

    # ── Redis pub/sub channel ─────────────────────────────────────────────────
    redis_trigger_channel: str = "trigger_events"
    redis_cache_ttl: int = field(default_factory=lambda: int(os.getenv("REDIS_CACHE_TTL", "600")))  # 10 min

    # ── Zones to monitor ─────────────────────────────────────────────────────
    # Matches CITY_ZONES from apps/web/lib/utils.ts
    monitored_zones: dict[str, list[str]] = field(default_factory=lambda: {
        "Mumbai":    ["South Mumbai", "Bandra", "Andheri", "Borivali", "Thane", "Navi Mumbai"],
        "Delhi":     ["Central Delhi", "South Delhi", "Dwarka", "Noida", "Gurugram", "Rohini"],
        "Bengaluru": ["Koramangala", "Whitefield", "Indiranagar", "HSR Layout", "Electronic City", "Hebbal"],
        "Hyderabad": ["Banjara Hills", "Hitech City", "Secunderabad", "Kukatpally", "Madhapur", "Gachibowli"],
        "Chennai":   ["T Nagar", "Anna Nagar", "Velachery", "OMR", "Adyar", "Tambaram"],
        "Pune":      ["Shivajinagar", "Koregaon Park", "Wakad", "Hinjewadi", "Baner", "Kothrud"],
    })


# Module-level singleton
config = PollerConfig()
