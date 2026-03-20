"""
Data Fetchers — Suraksha Weekly Trigger Poller (FR-4)

Fetches weather, AQI, curfew, and platform-outage data.
- Real mode: httpx calls to OpenWeatherMap, OpenAQ, and mock JSON feeds.
- Mock mode: returns hardcoded realistic data for all monitored zones.
- Fallback chain (real-mode API failure):
    1. Redis cache (returns with cache_age_minutes from :set_at companion key)
    2. Static mock JSON (services/api/mock_data/) — only when MOCK_MODE=true
    3. ServiceUnavailableError — when MOCK_MODE=false and no cache exists
- Every fallback path writes an audit row to audit_logs via asyncpg.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Optional

import asyncpg
import httpx
import redis.asyncio as aioredis

from config import PollerConfig
from evaluator import ZoneReading

logger = logging.getLogger(__name__)

# ── Mock data directory (shared with the API service) ─────────────────────────
# services/trigger-poller/  →  services/  →  services/api/mock_data/
_MOCK_DATA_DIR = Path(__file__).resolve().parent.parent / "api" / "mock_data"


# ── ServiceUnavailableError ────────────────────────────────────────────────────

class ServiceUnavailableError(Exception):
    """
    Raised when an external API is unavailable and no cached or mock data exists.

    The caller (run_poll_cycle) catches this as a generic Exception — the zone is
    skipped for this poll cycle and the error is counted in total_errors.
    """
    def __init__(self, message: str, api_name: str = "unknown") -> None:
        super().__init__(message)
        self.api_name = api_name


# ── Cache key helpers ──────────────────────────────────────────────────────────

def _weather_key(zone: str) -> str:
    return f"cache:openweather:{zone.lower().replace(' ', '_')}"

def _aqi_key(zone: str) -> str:
    return f"cache:openaq:{zone.lower().replace(' ', '_')}"

def _set_at_key(base_key: str) -> str:
    """Companion key that stores the Unix timestamp of the last successful write."""
    return f"{base_key}:set_at"


# ── Audit fallback helper (asyncpg direct write — no SQLAlchemy session here) ──

async def _audit_fallback(
    db_conn: Optional[asyncpg.Connection],
    zone: str,
    api_name: str,
    reason: str,
) -> None:
    """Write a FALLBACK_USED audit row directly via asyncpg (non-fatal)."""
    if db_conn is None:
        logger.debug(
            "[audit] No db_conn — skipping fallback audit log for %s / zone=%s",
            api_name, zone,
        )
        return
    try:
        await db_conn.execute(
            """
            INSERT INTO audit_logs
                (id, entity_type, entity_id, action, actor, payload, timestamp)
            VALUES
                (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, NOW())
            """,
            "ExternalAPI",
            zone,
            "FALLBACK_USED",
            "system",
            json.dumps({"api": api_name, "reason": reason, "zone": zone}),
        )
    except Exception as audit_exc:
        logger.warning("[audit] Failed to write fallback audit row: %s", audit_exc)


# ── Mock data (realistic Indian metro conditions for demo) ────────────────────
# Zones with values that breach thresholds are marked with "# TRIGGER"

_MOCK_WEATHER: dict[str, dict] = {
    # Mumbai — monsoon-like conditions
    "South Mumbai":    {"rain_mm_hr": 0.3, "temp_c": 30.5, "sources": ["OpenWeatherMap"]},
    "Bandra":          {"rain_mm_hr": 0.5, "temp_c": 30.2, "sources": ["OpenWeatherMap"]},
    "Andheri":         {"rain_mm_hr": 6.8, "temp_c": 28.4, "sources": ["OpenWeatherMap", "IMD_Station"]},   # TRIGGER HeavyRain
    "Borivali":        {"rain_mm_hr": 4.2, "temp_c": 29.1, "sources": ["OpenWeatherMap"]},
    "Thane":           {"rain_mm_hr": 2.1, "temp_c": 30.8, "sources": ["OpenWeatherMap"]},
    "Navi Mumbai":     {"rain_mm_hr": 0.8, "temp_c": 31.0, "sources": ["OpenWeatherMap"]},
    # Delhi — summer heat
    "Central Delhi":   {"rain_mm_hr": 0.0, "temp_c": 41.5, "sources": ["OpenWeatherMap"]},
    "South Delhi":     {"rain_mm_hr": 0.0, "temp_c": 40.8, "sources": ["OpenWeatherMap"]},
    "Dwarka":          {"rain_mm_hr": 0.0, "temp_c": 40.2, "sources": ["OpenWeatherMap"]},
    "Noida":           {"rain_mm_hr": 0.0, "temp_c": 44.2, "sources": ["OpenWeatherMap", "IMD_Station"]},   # TRIGGER ExtremeHeat
    "Gurugram":        {"rain_mm_hr": 0.0, "temp_c": 42.8, "sources": ["OpenWeatherMap", "IMD_Station"]},   # TRIGGER ExtremeHeat
    "Rohini":          {"rain_mm_hr": 0.0, "temp_c": 41.0, "sources": ["OpenWeatherMap"]},
    # Bengaluru — mild conditions
    "Koramangala":     {"rain_mm_hr": 1.2, "temp_c": 28.5, "sources": ["OpenWeatherMap"]},
    "Whitefield":      {"rain_mm_hr": 0.8, "temp_c": 29.2, "sources": ["OpenWeatherMap"]},
    "Indiranagar":     {"rain_mm_hr": 1.5, "temp_c": 28.8, "sources": ["OpenWeatherMap"]},
    "HSR Layout":      {"rain_mm_hr": 0.6, "temp_c": 29.0, "sources": ["OpenWeatherMap"]},
    "Electronic City": {"rain_mm_hr": 0.4, "temp_c": 29.5, "sources": ["OpenWeatherMap"]},
    "Hebbal":          {"rain_mm_hr": 1.0, "temp_c": 28.3, "sources": ["OpenWeatherMap"]},
    # Hyderabad — moderate
    "Banjara Hills":   {"rain_mm_hr": 0.0, "temp_c": 38.5, "sources": ["OpenWeatherMap"]},
    "Hitech City":     {"rain_mm_hr": 0.0, "temp_c": 37.8, "sources": ["OpenWeatherMap"]},
    "Secunderabad":    {"rain_mm_hr": 0.0, "temp_c": 39.2, "sources": ["OpenWeatherMap"]},
    "Kukatpally":      {"rain_mm_hr": 0.0, "temp_c": 38.0, "sources": ["OpenWeatherMap"]},
    "Madhapur":        {"rain_mm_hr": 0.0, "temp_c": 37.5, "sources": ["OpenWeatherMap"]},
    "Gachibowli":      {"rain_mm_hr": 0.0, "temp_c": 37.2, "sources": ["OpenWeatherMap"]},
    # Chennai — coastal
    "T Nagar":         {"rain_mm_hr": 0.2, "temp_c": 35.5, "sources": ["OpenWeatherMap"]},
    "Anna Nagar":      {"rain_mm_hr": 0.1, "temp_c": 35.2, "sources": ["OpenWeatherMap"]},
    "Velachery":       {"rain_mm_hr": 0.3, "temp_c": 35.8, "sources": ["OpenWeatherMap"]},
    "OMR":             {"rain_mm_hr": 0.0, "temp_c": 34.9, "sources": ["OpenWeatherMap"]},
    "Adyar":           {"rain_mm_hr": 0.4, "temp_c": 35.0, "sources": ["OpenWeatherMap"]},
    "Tambaram":        {"rain_mm_hr": 0.1, "temp_c": 36.2, "sources": ["OpenWeatherMap"]},
    # Pune — mild
    "Shivajinagar":    {"rain_mm_hr": 0.8, "temp_c": 32.5, "sources": ["OpenWeatherMap"]},
    "Koregaon Park":   {"rain_mm_hr": 0.5, "temp_c": 32.8, "sources": ["OpenWeatherMap"]},
    "Wakad":           {"rain_mm_hr": 0.3, "temp_c": 33.2, "sources": ["OpenWeatherMap"]},
    "Hinjewadi":       {"rain_mm_hr": 0.2, "temp_c": 33.5, "sources": ["OpenWeatherMap"]},
    "Baner":           {"rain_mm_hr": 0.6, "temp_c": 32.0, "sources": ["OpenWeatherMap"]},
    "Kothrud":         {"rain_mm_hr": 0.4, "temp_c": 33.0, "sources": ["OpenWeatherMap"]},
}

_MOCK_AQI: dict[str, dict] = {
    # Delhi — severe pollution
    "Central Delhi":   {"aqi": 326, "pm25": 185.0, "sources": ["OpenAQ", "SAFAR"]},  # TRIGGER
    "South Delhi":     {"aqi": 285, "pm25": 160.0, "sources": ["OpenAQ"]},
    "Dwarka":          {"aqi": 275, "pm25": 155.0, "sources": ["OpenAQ"]},
    "Noida":           {"aqi": 310, "pm25": 175.0, "sources": ["OpenAQ", "SAFAR"]},  # TRIGGER
    "Gurugram":        {"aqi": 293, "pm25": 163.0, "sources": ["OpenAQ"]},
    "Rohini":          {"aqi": 288, "pm25": 162.0, "sources": ["OpenAQ"]},
    # Mumbai — moderate
    "South Mumbai":    {"aqi": 145, "pm25":  78.0, "sources": ["OpenAQ"]},
    "Bandra":          {"aqi": 132, "pm25":  71.0, "sources": ["OpenAQ"]},
    "Andheri":         {"aqi": 158, "pm25":  85.0, "sources": ["OpenAQ"]},
    "Borivali":        {"aqi": 125, "pm25":  66.0, "sources": ["OpenAQ"]},
    "Thane":           {"aqi": 148, "pm25":  79.0, "sources": ["OpenAQ"]},
    "Navi Mumbai":     {"aqi": 120, "pm25":  63.0, "sources": ["OpenAQ"]},
    # Bengaluru — good
    "Koramangala":     {"aqi":  82, "pm25":  42.0, "sources": ["OpenAQ"]},
    "Whitefield":      {"aqi":  76, "pm25":  38.0, "sources": ["OpenAQ"]},
    "Indiranagar":     {"aqi":  88, "pm25":  45.0, "sources": ["OpenAQ"]},
    "HSR Layout":      {"aqi":  80, "pm25":  41.0, "sources": ["OpenAQ"]},
    "Electronic City": {"aqi":  70, "pm25":  35.0, "sources": ["OpenAQ"]},
    "Hebbal":          {"aqi":  85, "pm25":  44.0, "sources": ["OpenAQ"]},
    # Hyderabad
    "Banjara Hills":   {"aqi": 165, "pm25":  90.0, "sources": ["OpenAQ"]},
    "Hitech City":     {"aqi": 142, "pm25":  76.0, "sources": ["OpenAQ"]},
    "Secunderabad":    {"aqi": 178, "pm25":  96.0, "sources": ["OpenAQ"]},
    "Kukatpally":      {"aqi": 155, "pm25":  83.0, "sources": ["OpenAQ"]},
    "Madhapur":        {"aqi": 148, "pm25":  79.0, "sources": ["OpenAQ"]},
    "Gachibowli":      {"aqi": 138, "pm25":  73.0, "sources": ["OpenAQ"]},
    # Chennai
    "T Nagar":         {"aqi": 118, "pm25":  62.0, "sources": ["OpenAQ"]},
    "Anna Nagar":      {"aqi": 105, "pm25":  55.0, "sources": ["OpenAQ"]},
    "Velachery":       {"aqi": 122, "pm25":  65.0, "sources": ["OpenAQ"]},
    "OMR":             {"aqi":  95, "pm25":  50.0, "sources": ["OpenAQ"]},
    "Adyar":           {"aqi": 112, "pm25":  59.0, "sources": ["OpenAQ"]},
    "Tambaram":        {"aqi":  98, "pm25":  52.0, "sources": ["OpenAQ"]},
    # Pune
    "Shivajinagar":    {"aqi": 108, "pm25":  57.0, "sources": ["OpenAQ"]},
    "Koregaon Park":   {"aqi":  95, "pm25":  50.0, "sources": ["OpenAQ"]},
    "Wakad":           {"aqi":  88, "pm25":  46.0, "sources": ["OpenAQ"]},
    "Hinjewadi":       {"aqi":  80, "pm25":  42.0, "sources": ["OpenAQ"]},
    "Baner":           {"aqi":  92, "pm25":  48.0, "sources": ["OpenAQ"]},
    "Kothrud":         {"aqi":  97, "pm25":  51.0, "sources": ["OpenAQ"]},
}

_WEATHER_DEFAULT = {"rain_mm_hr": 0.5, "temp_c": 30.0, "sources": ["OpenWeatherMap"]}
_AQI_DEFAULT     = {"aqi": 110, "pm25": 58.0, "sources": ["OpenAQ"]}

# Redis TTL for successful real-API writes (seconds)
_CACHE_TTL = 300


# ── Real API fetchers with full fallback chain ─────────────────────────────────

async def _fetch_weather_real(
    city: str,
    zone: str,
    cfg: PollerConfig,
    redis: aioredis.Redis,
    client: httpx.AsyncClient,
    db_conn: Optional[asyncpg.Connection] = None,
) -> tuple[float, float, list[str], int]:
    """
    Fetch rain (mm/hr) and temperature (°C) from OpenWeatherMap.

    Fallback chain on failure:
      1. Redis  — cache:openweather:{zone} (staleness from :set_at companion key)
      2. Mock JSON — services/api/mock_data/openweather.json (MOCK_MODE only)
      3. ServiceUnavailableError — raised when MOCK_MODE=false and cache is empty

    Returns (rain_mm_hr, temp_c, sources, cache_age_minutes).
    cache_age_minutes=0  → live data
    cache_age_minutes>0  → Redis cache age
    cache_age_minutes=-1 → mock JSON or set_at key missing
    """
    cache_key = _weather_key(zone)
    sat_key   = _set_at_key(cache_key)

    try:
        url = f"{cfg.openweather_url}/weather"
        params = {
            "q":     f"{city},IN",
            "appid": cfg.openweather_api_key,
            "units": "metric",
        }
        r = await client.get(url, params=params, timeout=8.0)
        r.raise_for_status()
        data = r.json()

        rain_mm_hr = data.get("rain", {}).get("1h", 0.0)
        temp_c     = data.get("main", {}).get("temp", 25.0)
        sources    = ["OpenWeatherMap"]

        # Write cache + set_at in a single pipeline
        async with redis.pipeline(transaction=True) as pipe:
            pipe.setex(cache_key, _CACHE_TTL, json.dumps({"rain_mm_hr": rain_mm_hr, "temp_c": temp_c}))
            pipe.setex(sat_key,   _CACHE_TTL, str(time.time()))
            await pipe.execute()

        return rain_mm_hr, temp_c, sources, 0

    except Exception as exc:
        logger.warning(
            "OpenWeatherMap failed for %s (%s): %s — trying fallback", zone, city, exc
        )

    # ── Fallback 1: Redis cache ────────────────────────────────────────────────
    cached = await redis.get(cache_key)
    if cached:
        d          = json.loads(cached)
        set_at_val = await redis.get(sat_key)
        age_minutes = (
            int((time.time() - float(set_at_val)) / 60) if set_at_val else -1
        )
        await _audit_fallback(db_conn, zone, "openweather", "redis_cache_hit")
        return d["rain_mm_hr"], d["temp_c"], ["OpenWeatherMap_CACHED"], age_minutes

    # ── Fallback 2: Mock JSON (MOCK_MODE=true only) ────────────────────────────
    if cfg.mock_mode:
        try:
            with open(_MOCK_DATA_DIR / "openweather.json") as fh:
                mock = json.load(fh)
            city_data = mock["cities"].get(city) or mock["cities"]["_default"]
            await _audit_fallback(db_conn, zone, "openweather", "mock_json_fallback")
            return (
                city_data["rainfall_mm_per_hour"],
                city_data["temperature_celsius"],
                city_data["sources"],
                -1,
            )
        except Exception as mock_exc:
            logger.error("[fetcher] Failed to load openweather mock JSON: %s", mock_exc)

    # ── Fallback 3: Hard fail ──────────────────────────────────────────────────
    await _audit_fallback(db_conn, zone, "openweather", "unavailable_no_data")
    raise ServiceUnavailableError(
        f"Weather API unavailable and no cached data for zone {zone}",
        api_name="openweather",
    )


async def _fetch_aqi_real(
    city: str,
    zone: str,
    cfg: PollerConfig,
    redis: aioredis.Redis,
    client: httpx.AsyncClient,
    db_conn: Optional[asyncpg.Connection] = None,
) -> tuple[int, float, list[str], int]:
    """
    Fetch AQI from OpenAQ for the given city.

    Fallback chain on failure:
      1. Redis  — cache:openaq:{zone} (staleness from :set_at companion key)
      2. Mock JSON — services/api/mock_data/openaq.json (MOCK_MODE only)
      3. ServiceUnavailableError — raised when MOCK_MODE=false and cache is empty

    Returns (aqi, pm25, sources, cache_age_minutes).
    """
    cache_key = _aqi_key(zone)
    sat_key   = _set_at_key(cache_key)

    try:
        url = f"{cfg.openaq_url}/measurements"
        params = {
            "city":       city,
            "country":    "IN",
            "parameter":  ["pm25", "pm10"],
            "limit":      5,
            "sort":       "desc",
            "order_by":   "datetime",
        }
        r = await client.get(url, params=params, timeout=8.0)
        r.raise_for_status()
        results = r.json().get("results", [])

        pm25 = 0.0
        for m in results:
            if m.get("parameter") == "pm25":
                pm25 = float(m.get("value", 0))
                break
        # Approximate AQI from PM2.5 (India NAQI scale)
        aqi     = int(min(pm25 * 2.0, 500))
        sources = ["OpenAQ"]

        async with redis.pipeline(transaction=True) as pipe:
            pipe.setex(cache_key, _CACHE_TTL, json.dumps({"aqi": aqi, "pm25": pm25}))
            pipe.setex(sat_key,   _CACHE_TTL, str(time.time()))
            await pipe.execute()

        return aqi, pm25, sources, 0

    except Exception as exc:
        logger.warning(
            "OpenAQ failed for %s (%s): %s — trying fallback", zone, city, exc
        )

    # ── Fallback 1: Redis cache ────────────────────────────────────────────────
    cached = await redis.get(cache_key)
    if cached:
        d          = json.loads(cached)
        set_at_val = await redis.get(sat_key)
        age_minutes = (
            int((time.time() - float(set_at_val)) / 60) if set_at_val else -1
        )
        await _audit_fallback(db_conn, zone, "openaq", "redis_cache_hit")
        return d["aqi"], d["pm25"], ["OpenAQ_CACHED"], age_minutes

    # ── Fallback 2: Mock JSON (MOCK_MODE=true only) ────────────────────────────
    if cfg.mock_mode:
        try:
            with open(_MOCK_DATA_DIR / "openaq.json") as fh:
                mock = json.load(fh)
            city_data = mock["cities"].get(city) or mock["cities"]["_default"]
            await _audit_fallback(db_conn, zone, "openaq", "mock_json_fallback")
            return (
                city_data["aqi_value"],
                city_data["pm25"],
                city_data["sources"],
                -1,
            )
        except Exception as mock_exc:
            logger.error("[fetcher] Failed to load openaq mock JSON: %s", mock_exc)

    # ── Fallback 3: Hard fail ──────────────────────────────────────────────────
    await _audit_fallback(db_conn, zone, "openaq", "unavailable_no_data")
    raise ServiceUnavailableError(
        f"AQI API unavailable and no cached data for zone {zone}",
        api_name="openaq",
    )


# ── Mock feed loaders ──────────────────────────────────────────────────────────

def _load_curfew_feed(cfg: PollerConfig) -> list[dict]:
    path = Path(cfg.mock_feeds_dir) / "curfews.json"
    try:
        with open(path) as f:
            return json.load(f).get("restrictions", [])
    except Exception as exc:
        logger.warning("Could not load curfews.json: %s", exc)
        return []


def _load_outage_feed(cfg: PollerConfig) -> list[dict]:
    path = Path(cfg.mock_feeds_dir) / "platform_outage.json"
    try:
        with open(path) as f:
            return json.load(f).get("platforms", [])
    except Exception as exc:
        logger.warning("Could not load platform_outage.json: %s", exc)
        return []


def _get_restriction_for_zone(zone: str, restrictions: list[dict]) -> tuple[bool, str, str]:
    """Returns (is_active, reason, source) for the given zone."""
    for r in restrictions:
        if r.get("zone") == zone and r.get("active", False):
            return True, r.get("reason", ""), r.get("source", "GovernmentFeed")
    return False, "", ""


def _get_outage_for_city(city: str, platforms: list[dict]) -> tuple[int, str, str]:
    """Returns (outage_minutes, platform_name, source) — 0 if no outage for the city."""
    worst_minutes  = 0
    worst_platform = ""
    worst_source   = ""
    for p in platforms:
        if p.get("status") != "operational" and (
            city in p.get("affected_cities", []) or not p.get("affected_cities")
        ):
            mins = p.get("outage_duration_minutes", 0)
            if mins > worst_minutes:
                worst_minutes  = mins
                worst_platform = p.get("platform", "Unknown")
                worst_source   = p.get("source", "PlatformMonitor")
    return worst_minutes, worst_platform, worst_source


# ── Main fetch function ────────────────────────────────────────────────────────

async def fetch_zone_reading(
    city: str,
    zone: str,
    cfg: PollerConfig,
    redis: aioredis.Redis,
    client: Optional[httpx.AsyncClient] = None,
    db_conn: Optional[asyncpg.Connection] = None,
) -> ZoneReading:
    """
    Fetch all sensor data for one zone and return a populated ZoneReading.

    Uses mock data when cfg.mock_mode=True or API keys are absent.
    On live-mode failures, the full fallback chain in _fetch_weather_real /
    _fetch_aqi_real applies (Redis → mock JSON → ServiceUnavailableError).
    """
    reading  = ZoneReading(zone=zone, city=city, mock_mode=cfg.mock_mode)
    use_mock = cfg.mock_mode or not cfg.openweather_api_key

    if use_mock:
        # Pure mock path — in-memory dicts, no I/O required
        w = _MOCK_WEATHER.get(zone, _WEATHER_DEFAULT)
        reading.rain_mm_hr      = w["rain_mm_hr"]
        reading.temp_c          = w["temp_c"]
        reading.weather_sources = list(w["sources"])

        a = _MOCK_AQI.get(zone, _AQI_DEFAULT)
        reading.aqi         = a["aqi"]
        reading.pm25        = a["pm25"]
        reading.aqi_sources = list(a["sources"])
    else:
        assert client is not None, "httpx client required for real-mode fetching"
        (
            reading.rain_mm_hr,
            reading.temp_c,
            reading.weather_sources,
            reading.weather_cache_staleness,
        ) = await _fetch_weather_real(city, zone, cfg, redis, client, db_conn=db_conn)
        (
            reading.aqi,
            reading.pm25,
            reading.aqi_sources,
            reading.aqi_cache_staleness,
        ) = await _fetch_aqi_real(city, zone, cfg, redis, client, db_conn=db_conn)

    # Local restriction (always from mock feeds in current implementation)
    restrictions = _load_curfew_feed(cfg)
    reading.has_restriction, reading.restriction_reason, reading.restriction_source = \
        _get_restriction_for_zone(zone, restrictions)

    # Platform outage (mock feeds)
    platforms = _load_outage_feed(cfg)
    reading.outage_minutes, reading.outage_platform, reading.outage_source = \
        _get_outage_for_city(city, platforms)

    return reading
