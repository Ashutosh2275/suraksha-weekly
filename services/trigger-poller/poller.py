"""
Parametric Trigger Poller — Suraksha Weekly (FR-4 / PRD §8)

Runs an asyncio loop every POLL_INTERVAL_SECONDS (default 300 = 5 min):
  1. For each monitored city × zone: fetches weather + AQI + curfew + outage data.
  2. Evaluates all 5 parametric trigger conditions with configurable thresholds.
  3. Writes every evaluation to TriggerEvent (status=EVALUATED or ACTIVE).
  4. Publishes ACTIVE triggers to Redis pub/sub → picked up by Claim Orchestration.

Usage:
    python poller.py           # production — real APIs if keys present, else mock
    MOCK_MODE=true python poller.py   # force mock mode
"""
from __future__ import annotations

import asyncio
import json
import logging
import signal
import sys
from datetime import datetime

import asyncpg
import httpx
import redis.asyncio as aioredis

from config import PollerConfig, config
from db_writer import get_db_connection, write_trigger_event
from evaluator import TriggerEvaluation, evaluate_all_triggers
from fetchers import fetch_zone_reading

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("trigger_poller")

# ── Graceful shutdown flag ────────────────────────────────────────────────────
_shutdown = asyncio.Event()


def _handle_signal(signum: int, frame) -> None:  # type: ignore[type-arg]
    logger.info("Shutdown signal received (%s). Finishing current cycle…", signum)
    _shutdown.set()


# ── Redis publish helper ───────────────────────────────────────────────────────

async def _publish_trigger(
    redis: aioredis.Redis,
    trigger_id: str,
    evaluation: TriggerEvaluation,
    cfg: PollerConfig,
) -> None:
    """
    Publish ACTIVE trigger event to Redis pub/sub.

    Channel: cfg.redis_trigger_channel ("trigger_events")
    Subscribers (e.g. Claim Orchestration Service) pick this up to
    initiate claims for all affected workers in the zone immediately.
    """
    payload = json.dumps({
        "trigger_id":       trigger_id,
        "type":             evaluation.trigger_type,
        "zone":             evaluation.zone,
        "city":             evaluation.city,
        "measured_value":   evaluation.measured_value,
        "threshold":        evaluation.threshold,
        "confidence_score": evaluation.confidence_score,
        "sources":          evaluation.sources,
        "triggered_at":     datetime.utcnow().isoformat(),
    })
    n = await redis.publish(cfg.redis_trigger_channel, payload)
    logger.info(
        "[redis] Published %s for %s → %s receivers",
        evaluation.trigger_type, evaluation.zone, n,
    )


# ── Single poll cycle ─────────────────────────────────────────────────────────

async def run_poll_cycle(
    cfg: PollerConfig,
    db_conn: asyncpg.Connection,
    redis: aioredis.Redis,
    http_client: httpx.AsyncClient,
) -> dict:
    """
    Execute one full poll cycle across all monitored cities and zones.

    Returns a summary dict with counts for metrics / health endpoint.
    """
    total_evaluated = 0
    total_active    = 0
    total_errors    = 0

    for city, zones in cfg.monitored_zones.items():
        for zone in zones:
            try:
                # 1. Fetch sensor readings for this zone
                reading = await fetch_zone_reading(city, zone, cfg, redis, http_client, db_conn=db_conn)

                # 2. Evaluate all 5 trigger conditions
                evaluations = await evaluate_all_triggers(reading, cfg, redis)
                total_evaluated += len(evaluations)

                # 3. Persist every evaluation (EVALUATED or ACTIVE)
                for ev in evaluations:
                    trigger_id = await write_trigger_event(db_conn, ev)

                    # 4. Publish ACTIVE triggers to Redis pub/sub for claim orchestration
                    if ev.status == "active":
                        total_active += 1
                        await _publish_trigger(redis, trigger_id, ev, cfg)
                        logger.info(
                            "[ACTIVE] %-20s  zone=%-20s  value=%-6s  conf=%.2f  id=%s",
                            ev.trigger_type, ev.zone,
                            ev.measured_value, ev.confidence_score, trigger_id,
                        )

            except Exception as exc:
                total_errors += 1
                logger.exception(
                    "[error] Zone %s/%s failed: %s", city, zone, exc
                )

    summary = {
        "poll_at":        datetime.utcnow().isoformat(),
        "total_evaluated": total_evaluated,
        "total_active":   total_active,
        "total_errors":   total_errors,
        "mock_mode":      cfg.mock_mode,
    }
    logger.info(
        "[cycle] evaluated=%d  active=%d  errors=%d  mock=%s",
        total_evaluated, total_active, total_errors, cfg.mock_mode,
    )
    return summary


# ── Main async entry-point ────────────────────────────────────────────────────

async def main(cfg: PollerConfig = config) -> None:
    """
    Main poll loop — runs until SIGTERM/SIGINT or internal error.
    """
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT,  _handle_signal)

    logger.info(
        "Trigger Poller starting — mock_mode=%s, interval=%ds, cities=%s",
        cfg.mock_mode, cfg.poll_interval_seconds, list(cfg.monitored_zones.keys()),
    )

    # Establish long-lived connections
    db_conn: asyncpg.Connection | None = None
    redis: aioredis.Redis | None = None

    try:
        logger.info("Connecting to PostgreSQL…")
        db_conn = await get_db_connection(cfg.database_url)
        logger.info("Connecting to Redis…")
        redis = aioredis.from_url(cfg.redis_url, decode_responses=True)
        await redis.ping()

        async with httpx.AsyncClient(
            headers={"User-Agent": "SurakshaWeekly-TriggerPoller/1.0"},
        ) as http_client:
            logger.info("Connections established. Starting poll loop.")

            while not _shutdown.is_set():
                cycle_start = asyncio.get_event_loop().time()

                try:
                    await run_poll_cycle(cfg, db_conn, redis, http_client)
                except Exception as exc:
                    logger.exception("Poll cycle crashed: %s", exc)

                # Wait for the remainder of the interval (or next signal)
                elapsed = asyncio.get_event_loop().time() - cycle_start
                sleep_for = max(0.0, cfg.poll_interval_seconds - elapsed)
                logger.info("Next poll in %.0fs", sleep_for)

                try:
                    await asyncio.wait_for(_shutdown.wait(), timeout=sleep_for)
                except asyncio.TimeoutError:
                    pass  # Normal — interval elapsed, run next cycle

    finally:
        if db_conn:
            await db_conn.close()
        if redis:
            await redis.aclose()
        logger.info("Trigger Poller stopped.")


if __name__ == "__main__":
    asyncio.run(main())
