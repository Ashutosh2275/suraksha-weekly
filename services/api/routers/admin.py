"""
Admin Router — Suraksha Weekly

Provides admin dashboard, audit, fraud intelligence, and simulation endpoints.
"""
from __future__ import annotations

import base64
import json
import logging
from datetime import datetime
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.rate_limiter import rate_limit
from core.redis import get_redis
from core.auth_dependencies import require_role, require_admin, CurrentUser
from core.roles import Role
from models import AuditLog, FraudCluster

logger = logging.getLogger(__name__)
router = APIRouter()

_CLUSTER_CACHE_TTL = 300


def _encode_cluster_cursor(detected_at: datetime, cluster_id: str) -> str:
    return base64.urlsafe_b64encode(f"{detected_at.isoformat()}|{cluster_id}".encode()).decode()


def _decode_cluster_cursor(cursor: str) -> tuple[datetime, str]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, cid = raw.split("|", 1)
    return datetime.fromisoformat(ts), cid


def _require_admin(
    x_admin_token: Annotated[Optional[str], Header()] = None,
) -> None:
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Admin-Token header required.",
        )


class ModelStatusResponse(BaseModel):
    rule_only_mode: bool
    last_precision: float
    precision_floor: float
    model_path: str
    model_loaded: bool


class GraphAnalysisResponse(BaseModel):
    device_clusters_found: int
    zone_clusters_found: int
    new_clusters_persisted: int
    claims_tagged: int


class FraudClusterSummary(BaseModel):
    id: str
    cluster_type: str
    link_node: str
    member_count: int
    member_worker_ids: list[str]
    risk_level: str
    flagged_for_kyc: bool
    auto_resolved: bool
    detected_at: str


class FraudClustersResponse(BaseModel):
    total: int
    clusters: list[FraudClusterSummary]
    next_cursor: Optional[str] = None
    is_cached: bool = False
    cache_age_minutes: float = 0.0


class AuditLogSummary(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    actor_id: Optional[str] = None
    payload: dict
    timestamp: str


class AuditLogListResponse(BaseModel):
    total: int
    page: int
    limit: int
    logs: list[AuditLogSummary]


class SimulationRunResponse(BaseModel):
    scenario_name: str
    inputs: dict
    gross_loss_ratio_pct: float
    combined_ratio_pct: float
    contribution_margin_pct: float
    required_premium_adjustment_pct: float
    exposure_at_risk_inr: float
    weekly_breakdown: list[dict]
    city_segment_breakdown: list[dict]
    is_sustainable: bool
    sustainability_issues: list[str]
    simulation_timestamp: str
    cache_key: str
    cached: bool = False


@router.get(
    "/dashboard",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
    summary="[Admin] Dashboard summary",
)
async def get_dashboard(current_user: CurrentUser = Depends(require_admin)):
    return {"message": "Admin dashboard endpoint", "user": str(current_user)}


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="[Admin] List audit logs",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:
    base_q = select(AuditLog)
    if entity_type:
        base_q = base_q.where(AuditLog.entity_type == entity_type)
    if action:
        base_q = base_q.where(AuditLog.action == action)
    if search:
        like = f"%{search}%"
        base_q = base_q.where(or_(AuditLog.entity_id.ilike(like), AuditLog.actor.ilike(like)))

    total_q = await session.execute(select(func.count()).select_from(base_q.subquery()))
    total = total_q.scalar_one() or 0

    rows_q = await session.execute(
        base_q.order_by(desc(AuditLog.timestamp)).offset((page - 1) * limit).limit(limit)
    )
    rows = list(rows_q.scalars().all())

    return AuditLogListResponse(
        total=total,
        page=page,
        limit=limit,
        logs=[
            AuditLogSummary(
                id=row.id,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                action=row.action,
                actor=row.actor,
                actor_id=row.actor_id,
                payload=row.payload or {},
                timestamp=row.timestamp.isoformat(),
            )
            for row in rows
        ],
    )


@router.get(
    "/fraud/model-status",
    response_model=ModelStatusResponse,
    summary="[Admin] Fraud model health",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def fraud_model_status() -> ModelStatusResponse:
    from ml.fraud_model import get_model_status

    return ModelStatusResponse(**get_model_status())


@router.post(
    "/fraud/analyze-graph",
    response_model=GraphAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="[Admin] Run fraud graph analysis",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def run_graph_analysis(session: AsyncSession = Depends(get_db)) -> GraphAnalysisResponse:
    from services.fraud_graph_service import analyze_fraud_graph

    try:
        summary = await analyze_fraud_graph(session)
        await session.commit()
        return GraphAnalysisResponse(**summary)
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph analysis failed: {exc}",
        )


@router.get(
    "/fraud/clusters",
    response_model=FraudClustersResponse,
    summary="[Admin] List fraud clusters (cursor-paginated)",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def list_fraud_clusters(
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
    resolved: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: Optional[str] = Query(default=None),
) -> FraudClustersResponse:
    page_cache_key = f"cache:fraud_clusters:{resolved}:{limit}" if cursor is None else None
    sat_key = f"{page_cache_key}:set_at" if page_cache_key else None

    if page_cache_key:
        try:
            cached_raw = await redis.get(page_cache_key)
            if cached_raw:
                data = json.loads(cached_raw)
                set_at_raw = await redis.get(sat_key)
                cache_age = 0.0
                if set_at_raw:
                    set_at = datetime.fromisoformat(set_at_raw)
                    cache_age = round((datetime.utcnow() - set_at).total_seconds() / 60, 2)
                data["is_cached"] = True
                data["cache_age_minutes"] = cache_age
                return FraudClustersResponse(**data)
        except Exception as cache_exc:
            logger.warning("[admin] Cluster cache read failed: %s", cache_exc)

    q = (
        select(FraudCluster)
        .where(FraudCluster.auto_resolved == resolved)
        .order_by(desc(FraudCluster.detected_at), desc(FraudCluster.id))
    )
    if cursor:
        try:
            cursor_ts, cursor_id = _decode_cluster_cursor(cursor)
            q = q.where(
                or_(
                    FraudCluster.detected_at < cursor_ts,
                    and_(FraudCluster.detected_at == cursor_ts, FraudCluster.id < cursor_id),
                )
            )
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor.")

    result = await session.execute(q.limit(limit + 1))
    clusters = list(result.scalars().all())
    has_more = len(clusters) > limit
    page_items = clusters[:limit]
    next_cursor = _encode_cluster_cursor(page_items[-1].detected_at, page_items[-1].id) if has_more else None

    if cursor is None:
        cnt_q = await session.execute(
            select(func.count(FraudCluster.id)).where(FraudCluster.auto_resolved == resolved)
        )
        total = cnt_q.scalar() or 0
    else:
        total = -1

    response = FraudClustersResponse(
        total=total,
        clusters=[
            FraudClusterSummary(
                id=c.id,
                cluster_type=c.cluster_type,
                link_node=c.link_node,
                member_count=c.member_count,
                member_worker_ids=c.member_worker_ids or [],
                risk_level=c.risk_level,
                flagged_for_kyc=c.flagged_for_kyc,
                auto_resolved=c.auto_resolved,
                detected_at=c.detected_at.isoformat(),
            )
            for c in page_items
        ],
        next_cursor=next_cursor,
        is_cached=False,
        cache_age_minutes=0.0,
    )

    if page_cache_key:
        try:
            payload = response.model_dump(mode="json")
            await redis.setex(page_cache_key, _CLUSTER_CACHE_TTL, json.dumps(payload, default=str))
            await redis.setex(sat_key, _CLUSTER_CACHE_TTL, datetime.utcnow().isoformat())
        except Exception as cwe:
            logger.warning("[admin] Cluster cache write failed: %s", cwe)

    return response


@router.post(
    "/fraud/validate-model",
    response_model=ModelStatusResponse,
    summary="[Admin] Re-validate fraud model precision",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def validate_model() -> ModelStatusResponse:
    from ml.fraud_model import get_model_status, validate_model_precision

    validate_model_precision()
    return ModelStatusResponse(**get_model_status())


@router.get(
    "/simulation/run",
    response_model=SimulationRunResponse,
    summary="[Admin] Run insurance economics simulation",
    dependencies=[Depends(require_admin), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def run_simulation(
    scenario: str = Query(..., description="Scenario name or 'custom'"),
    overrides: Optional[str] = Query(None, description="JSON string of parameter overrides"),
    redis: aioredis.Redis = Depends(get_redis),
) -> SimulationRunResponse:
    from services.simulation_service import get_simulation_service

    overrides_dict = {}
    if overrides:
        try:
            overrides_dict = json.loads(overrides)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON in overrides parameter: {exc}",
            )

    sim_service = get_simulation_service()
    cache_key = sim_service._generate_cache_key(scenario, overrides_dict)

    cached_result = await redis.get(cache_key)
    if cached_result:
        result_dict = json.loads(cached_result)
        result_dict["cached"] = True
        return SimulationRunResponse(**result_dict)

    try:
        output = sim_service.run_scenario(scenario, overrides_dict)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    weekly_breakdown_dicts = [
        {
            "week": w.week,
            "claims_count": w.claims_count,
            "claims_cost_inr": w.claims_cost_inr,
            "premium_earned_inr": w.premium_earned_inr,
            "loss_ratio_pct": w.loss_ratio_pct,
            "combined_ratio_pct": w.combined_ratio_pct,
            "triggers_fired": w.triggers_fired,
        }
        for w in output.weekly_breakdown
    ]

    city_breakdown_dicts = [
        {
            "city": c.city,
            "claims_count": c.claims_count,
            "claims_cost_inr": c.claims_cost_inr,
            "premium_earned_inr": c.premium_earned_inr,
            "operating_expenses_inr": c.operating_expenses_inr,
            "loss_ratio_pct": c.loss_ratio_pct,
            "combined_ratio_pct": c.combined_ratio_pct,
            "contribution_margin_pct": c.contribution_margin_pct,
            "stop_expand_flag": c.stop_expand_flag,
            "stop_expand_reason": c.stop_expand_reason,
        }
        for c in output.city_segment_breakdown
    ]

    response_dict = {
        "scenario_name": output.scenario_name,
        "inputs": output.inputs,
        "gross_loss_ratio_pct": output.gross_loss_ratio_pct,
        "combined_ratio_pct": output.combined_ratio_pct,
        "contribution_margin_pct": output.contribution_margin_pct,
        "required_premium_adjustment_pct": output.required_premium_adjustment_pct,
        "exposure_at_risk_inr": output.exposure_at_risk_inr,
        "weekly_breakdown": weekly_breakdown_dicts,
        "city_segment_breakdown": city_breakdown_dicts,
        "is_sustainable": output.is_sustainable,
        "sustainability_issues": output.sustainability_issues,
        "simulation_timestamp": output.simulation_timestamp,
        "cache_key": output.cache_key,
        "cached": False,
    }

    await redis.setex(cache_key, 3600, json.dumps(response_dict))
    return SimulationRunResponse(**response_dict)
