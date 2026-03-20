"""
Parametric Trigger Router — Suraksha Weekly (FR-4 / PRD §8)

Endpoints
─────────
GET  /api/v1/triggers/active
    Returns all currently active TriggerEvent rows.
    Optionally filtered by ?city=, ?zone=, ?type=.
    Includes staleness flags when data is older than 5 minutes.
    Falls back to mock_data/trigger_events.json when DB is empty and MOCK_MODE=true.

GET  /api/v1/triggers/{trigger_id}
    Returns a single TriggerEvent including its full audit_snapshot.

POST /api/v1/triggers/simulate   (admin only — X-Admin-Token header required)
    Injects a synthetic TriggerEvent into the DB and publishes it on Redis
    pub/sub.  Used for the 5-min demo video and integration testing.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.redis import get_redis
from models import TriggerEvent
from services.audit import log_event
from services.trigger_service import (
    VALID_TRIGGER_TYPES,
    get_active_triggers,
    get_trigger_by_id,
    list_recent_triggers,
    simulate_trigger,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Mock data path ─────────────────────────────────────────────────────────────
# services/api/routers/ → services/api/ → services/api/mock_data/
_MOCK_DATA_DIR = Path(__file__).resolve().parent.parent / "mock_data"

# Threshold: events older than this are considered stale
_STALE_MINUTES = 5


# ── Response schemas ───────────────────────────────────────────────────────────

class TriggerEventResponse(BaseModel):
    """Serialised TriggerEvent row for API consumers."""
    id:               str
    type:             str
    zone:             str
    city:             Optional[str]    = None   # from audit_snapshot
    value:            float
    threshold:        float
    confidence_score: float
    sources:          list[str]
    status:           str
    triggered_at:     str
    payout_multiplier: Optional[float] = None   # from audit_snapshot
    audit_snapshot:   Optional[dict]   = None   # only in detail endpoint

    @classmethod
    def from_orm(
        cls,
        event: TriggerEvent,
        *,
        include_audit: bool = False,
    ) -> "TriggerEventResponse":
        snap: dict = event.audit_snapshot or {}
        return cls(
            id               = event.id,
            type             = event.type,
            zone             = event.zone,
            city             = snap.get("city"),
            value            = event.value,
            threshold        = event.threshold,
            confidence_score = event.confidence_score,
            sources          = event.sources or [],
            status           = event.status,
            triggered_at     = event.triggered_at.isoformat(),
            payout_multiplier = snap.get("payout_multiplier"),
            audit_snapshot   = snap if include_audit else None,
        )


class ActiveTriggersResponse(BaseModel):
    """Wrapper returned by GET /triggers/active."""
    count:             int
    triggers:          list[TriggerEventResponse]
    is_cached:         bool           = False
    cache_age_minutes: Optional[int]  = None
    warning:           Optional[str]  = None


class SimulateRequest(BaseModel):
    """Body for POST /triggers/simulate."""
    trigger_type: str = Field(
        ...,
        description=(
            "Type of trigger to simulate. "
            "One of: HeavyRain, ExtremeHeat, SeverePollution, "
            "LocalRestriction, PlatformOutage."
        ),
    )
    zone:  str   = Field(..., description="Delivery zone name, e.g. 'Andheri'")
    city:  str   = Field(..., description="City name, e.g. 'Mumbai'")
    value: float = Field(..., gt=0, description="Measured value that breaches the threshold")

    @field_validator("trigger_type")
    @classmethod
    def _valid_type(cls, v: str) -> str:
        if v not in VALID_TRIGGER_TYPES:
            raise ValueError(
                f"trigger_type must be one of {sorted(VALID_TRIGGER_TYPES)}"
            )
        return v


class SimulateResponse(BaseModel):
    """Response from POST /triggers/simulate."""
    trigger_id:       str
    trigger_type:     str
    zone:             str
    city:             str
    value:            float
    threshold:        float
    confidence_score: float
    status:           str
    triggered_at:     str
    redis_receivers:  Optional[int] = None
    message:          str


# ── Admin token guard ──────────────────────────────────────────────────────────

def _require_admin(
    x_admin_token: Annotated[Optional[str], Header()] = None,
) -> None:
    """
    Dependency: verify the X-Admin-Token header.

    Raises HTTP 401 if missing or incorrect.
    The token is compared against settings.ADMIN_TOKEN.
    """
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Admin-Token header required for this endpoint.",
        )


# ── Mock trigger loader ────────────────────────────────────────────────────────

def _load_mock_triggers(now: datetime) -> list[TriggerEventResponse]:
    """
    Load static mock active triggers from trigger_events.json.

    triggered_at is computed as now − triggered_at_offset_minutes so the
    data looks live during the demo.
    """
    try:
        with open(_MOCK_DATA_DIR / "trigger_events.json") as fh:
            data = json.load(fh)
        result: list[TriggerEventResponse] = []
        for evt in data.get("events", []):
            offset      = evt.get("triggered_at_offset_minutes", 15)
            triggered_at = now - timedelta(minutes=offset)
            snap         = evt.get("audit_snapshot", {})
            result.append(TriggerEventResponse(
                id               = evt["id"],
                type             = evt["type"],
                zone             = evt["zone"],
                city             = snap.get("city"),
                value            = evt["value"],
                threshold        = evt["threshold"],
                confidence_score = evt["confidence_score"],
                sources          = evt.get("sources", []),
                status           = evt.get("status", "active"),
                triggered_at     = triggered_at.isoformat(),
                payout_multiplier = snap.get("payout_multiplier"),
                audit_snapshot   = None,
            ))
        return result
    except Exception as exc:
        logger.error("[triggers] Failed to load mock trigger_events.json: %s", exc)
        return []


def _event_age_minutes(event: TriggerEvent, now: datetime) -> int:
    """Return how many minutes ago this event was triggered (UTC)."""
    triggered = event.triggered_at
    if triggered.tzinfo is None:
        triggered = triggered.replace(tzinfo=timezone.utc)
    return max(0, int((now - triggered).total_seconds() / 60))


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get(
    "/active",
    response_model=ActiveTriggersResponse,
    summary="List active trigger events",
    description=(
        "Returns all TriggerEvent rows that are currently in 'active' status. "
        "These are the events that have caused (or will cause) automatic payouts. "
        "Optionally filter by city, zone, or trigger type. "
        "When data is older than 5 minutes, is_cached=true and cache_age_minutes are set. "
        "When DB is empty and MOCK_MODE=true, returns static demo triggers."
    ),
)
async def get_active(
    city:    Optional[str] = Query(None, description="Filter by city, e.g. 'Mumbai'"),
    zone:    Optional[str] = Query(None, description="Filter by zone, e.g. 'Andheri'"),
    type:    Optional[str] = Query(None, description="Filter by trigger type"),
    limit:   int           = Query(50, ge=1, le=200, description="Max rows to return"),
    session: AsyncSession  = Depends(get_db),
) -> ActiveTriggersResponse:
    events = await get_active_triggers(
        session,
        city=city,
        zone=zone,
        trigger_type=type,
        limit=limit,
    )

    now = datetime.now(timezone.utc)

    # ── Stale-data check (events exist but are all older than 5 min) ──────────
    if events:
        ages       = [_event_age_minutes(e, now) for e in events]
        min_age    = min(ages)
        is_stale   = min_age >= _STALE_MINUTES
        if is_stale:
            await log_event(
                session,
                entity_type="ExternalAPI",
                entity_id="triggers",
                action="FALLBACK_USED",
                actor="system",
                payload={
                    "reason":             "stale_data",
                    "cache_age_minutes":  min_age,
                    "active_event_count": len(events),
                },
            )
            await session.commit()
            return ActiveTriggersResponse(
                count             = len(events),
                triggers          = [TriggerEventResponse.from_orm(e) for e in events],
                is_cached         = True,
                cache_age_minutes = min_age,
            )

        # Fresh data — normal return path
        return ActiveTriggersResponse(
            count    = len(events),
            triggers = [TriggerEventResponse.from_orm(e) for e in events],
        )

    # ── Empty DB: mock JSON fallback (MOCK_MODE=true) ─────────────────────────
    if settings.MOCK_MODE:
        mock_triggers = _load_mock_triggers(now)
        if mock_triggers:
            await log_event(
                session,
                entity_type="ExternalAPI",
                entity_id="triggers",
                action="FALLBACK_USED",
                actor="system",
                payload={
                    "reason":     "empty_db_mock_fallback",
                    "mock_count": len(mock_triggers),
                },
            )
            await session.commit()
            return ActiveTriggersResponse(
                count             = len(mock_triggers),
                triggers          = mock_triggers,
                is_cached         = True,
                cache_age_minutes = -1,
            )

    # ── Empty DB, no fallback available ───────────────────────────────────────
    await log_event(
        session,
        entity_type="ExternalAPI",
        entity_id="triggers",
        action="FALLBACK_USED",
        actor="system",
        payload={"reason": "empty_db_no_fallback", "mock_mode": settings.MOCK_MODE},
    )
    await session.commit()
    return ActiveTriggersResponse(
        count   = 0,
        triggers= [],
        warning = "No trigger data available. External data feeds may be down.",
    )


@router.get(
    "/{trigger_id}",
    response_model=TriggerEventResponse,
    summary="Get trigger event detail",
    description=(
        "Returns a single TriggerEvent by ID, including the full audit_snapshot "
        "which records the raw sensor readings, sources, and confidence breakdown "
        "at the moment of evaluation."
    ),
)
async def get_trigger(
    trigger_id: str,
    session: AsyncSession = Depends(get_db),
) -> TriggerEventResponse:
    event = await get_trigger_by_id(session, trigger_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TriggerEvent '{trigger_id}' not found.",
        )
    return TriggerEventResponse.from_orm(event, include_audit=True)


@router.post(
    "/simulate",
    response_model=SimulateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Simulate / inject a trigger event (admin only)",
    description=(
        "Manually inject a parametric trigger into the system. "
        "Writes a TriggerEvent row with status='active' and confidence_score=0.95, "
        "then publishes it on the Redis 'trigger_events' channel so Claim "
        "Orchestration picks it up immediately. "
        "Requires the X-Admin-Token header. "
        "Intended for demo videos and integration testing."
    ),
    dependencies=[Depends(_require_admin)],
)
async def simulate(
    body:    SimulateRequest,
    session: AsyncSession     = Depends(get_db),
    redis:   aioredis.Redis   = Depends(get_redis),
) -> SimulateResponse:
    try:
        event = await simulate_trigger(
            session,
            redis,
            trigger_type   = body.trigger_type,
            zone           = body.zone,
            city           = body.city,
            value          = body.value,
            redis_channel  = "trigger_events",
        )
        await session.commit()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("simulate_trigger failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to simulate trigger. Please check server logs.",
        )

    return SimulateResponse(
        trigger_id       = event.id,
        trigger_type     = event.type,
        zone             = event.zone,
        city             = body.city,
        value            = event.value,
        threshold        = event.threshold,
        confidence_score = event.confidence_score,
        status           = event.status,
        triggered_at     = event.triggered_at.isoformat(),
        message          = (
            f"Trigger '{body.trigger_type}' simulated for {body.zone}/{body.city}. "
            "Claim Orchestration will initiate payouts for all active policies "
            "in this zone within seconds."
        ),
    )
