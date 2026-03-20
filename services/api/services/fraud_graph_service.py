"""
Fraud Graph Service — Suraksha Weekly (PRD §10 / PRD §19)

Detects coordinated fraud rings via graph-based analysis.

Graph model:
  - Nodes  = Workers
  - Edges  = Shared link-nodes (device fingerprint or payout-account tag)
  - Connected components with ≥ _MIN_CLUSTER_SIZE workers → FraudCluster

Community detection uses networkx connected-component analysis, which is
exact for the device-sharing use case (workers are in the same cluster IFF
they share at least one device fingerprint transitively).

Pipeline:
  1. build_device_sharing_graph()  — load all workers with device fingerprints
  2. detect_clusters()             — find components ≥ _MIN_CLUSTER_SIZE
  3. _persist_cluster()            — upsert FraudCluster rows
  4. _tag_pending_claims()         — inject SHARED_DEVICE_CLUSTER into in-flight claims
  5. analyze_fraud_graph()         — orchestration entry-point

Called from:
  - app.py lifespan (once on startup to catch pre-existing clusters)
  - Admin router POST /admin/fraud/analyze-graph  (on-demand)
"""
from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

import networkx as nx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Claim, FraudCluster, Worker
from services.audit import log_event

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────
_MIN_CLUSTER_SIZE        = 3    # workers sharing a node to constitute a cluster
_ZONE_VELOCITY_WINDOW_MIN = 30  # minutes window for co-timed zone-burst detection
_ZONE_VELOCITY_MIN_WORKERS = 3  # workers in same zone window to trigger zone cluster


# ── Graph construction ────────────────────────────────────────────────────────

async def _load_device_map(
    session: AsyncSession,
) -> dict[str, list[str]]:
    """
    Return {device_fingerprint: [worker_id, ...]} for all workers with a
    non-null device fingerprint.  Only fingerprints shared by ≥2 workers are
    relevant — single-owner fingerprints can't form clusters.
    """
    q = await session.execute(
        select(Worker.id, Worker.device_fingerprint)
        .where(Worker.device_fingerprint.isnot(None))
    )
    device_to_workers: dict[str, list[str]] = defaultdict(list)
    for worker_id, fp in q.all():
        if fp:
            device_to_workers[fp].append(worker_id)
    # Keep only truly shared fingerprints
    return {fp: wids for fp, wids in device_to_workers.items() if len(wids) >= 2}


def _build_worker_graph(
    device_map: dict[str, list[str]],
) -> tuple[nx.Graph, dict[str, str]]:
    """
    Build an undirected worker graph from a device_map.

    Returns:
        G              — networkx Graph (nodes=worker_ids, edges=shared_device)
        edge_device    — {(w1,w2): device_fingerprint} for provenance
    """
    G = nx.Graph()
    edge_device: dict[tuple[str, str], str] = {}

    for fp, worker_ids in device_map.items():
        for i in range(len(worker_ids)):
            for j in range(i + 1, len(worker_ids)):
                w1, w2 = worker_ids[i], worker_ids[j]
                G.add_edge(w1, w2)
                edge_device[(w1, w2)] = fp
                edge_device[(w2, w1)] = fp

    return G, edge_device


def detect_clusters(
    G: nx.Graph,
    edge_device: dict[tuple[str, str], str],
) -> list[dict]:
    """
    Find connected components of size ≥ _MIN_CLUSTER_SIZE.

    Returns a list of cluster dicts:
        {
          "member_worker_ids": [...],
          "link_node":         "<shared device fingerprint>",
          "cluster_type":      "device_share",
          "member_count":      N,
          "risk_level":        "high" | "critical",
        }
    """
    clusters = []
    for component in nx.connected_components(G):
        if len(component) < _MIN_CLUSTER_SIZE:
            continue

        members = sorted(component)

        # Find the most common device fingerprint among the edges in this component
        fp_counter: dict[str, int] = defaultdict(int)
        for i, w1 in enumerate(members):
            for w2 in members[i + 1:]:
                fp = edge_device.get((w1, w2)) or edge_device.get((w2, w1))
                if fp:
                    fp_counter[fp] += 1

        primary_fp = max(fp_counter, key=fp_counter.get) if fp_counter else "unknown"
        risk_level = "critical" if len(members) >= 5 else "high"

        clusters.append({
            "member_worker_ids": members,
            "link_node":         primary_fp,
            "cluster_type":      "device_share",
            "member_count":      len(members),
            "risk_level":        risk_level,
        })

    return clusters


# ── Zone-velocity burst detection ────────────────────────────────────────────

async def _detect_zone_velocity_clusters(
    session: AsyncSession,
) -> list[dict]:
    """
    Find groups of workers who ALL made claims in the same zone within a
    rolling _ZONE_VELOCITY_WINDOW_MIN-minute window (co-ordinated fraud ring).

    Returns cluster dicts with cluster_type="zone_velocity_burst".
    """
    window_start = datetime.utcnow() - timedelta(minutes=_ZONE_VELOCITY_WINDOW_MIN)

    from models import TriggerEvent  # avoid circular at module level
    q = await session.execute(
        select(Claim.worker_id, TriggerEvent.zone, Claim.initiated_at)
        .join(TriggerEvent, TriggerEvent.id == Claim.trigger_event_id)
        .where(Claim.initiated_at >= window_start)
    )
    rows = q.all()

    # Group by zone
    zone_workers: dict[str, set[str]] = defaultdict(set)
    for worker_id, zone, _ in rows:
        zone_workers[zone].add(worker_id)

    clusters = []
    for zone, workers in zone_workers.items():
        if len(workers) >= _ZONE_VELOCITY_MIN_WORKERS:
            clusters.append({
                "member_worker_ids": sorted(workers),
                "link_node":         f"zone:{zone}",
                "cluster_type":      "zone_velocity_burst",
                "member_count":      len(workers),
                "risk_level":        "high",
            })

    return clusters


# ── Persistence helpers ───────────────────────────────────────────────────────

async def _cluster_already_exists(
    session:     AsyncSession,
    cluster_type: str,
    link_node:    str,
) -> bool:
    """Check if an equivalent cluster was already persisted (dedup guard)."""
    q = await session.execute(
        select(FraudCluster.id).where(
            FraudCluster.cluster_type  == cluster_type,
            FraudCluster.link_node     == link_node,
            FraudCluster.auto_resolved == False,  # noqa: E712
        ).limit(1)
    )
    return q.scalar_one_or_none() is not None


async def _persist_cluster(
    session: AsyncSession,
    cluster: dict,
) -> Optional[FraudCluster]:
    """
    Upsert a FraudCluster row.  Returns None if the cluster already exists.
    """
    if await _cluster_already_exists(session, cluster["cluster_type"], cluster["link_node"]):
        logger.debug(
            "[graph] Cluster type=%s node=%s already persisted — skipping.",
            cluster["cluster_type"], cluster["link_node"][:20],
        )
        return None

    fc = FraudCluster(
        id                = str(uuid.uuid4()),
        cluster_type      = cluster["cluster_type"],
        link_node         = cluster["link_node"],
        member_worker_ids = cluster["member_worker_ids"],
        member_count      = cluster["member_count"],
        risk_level        = cluster["risk_level"],
        flagged_for_kyc   = True,
        auto_resolved     = False,
        notes             = (
            f"Auto-detected by fraud_graph_service. "
            f"Members: {', '.join(cluster['member_worker_ids'][:5])}"
            + ("…" if cluster["member_count"] > 5 else "")
        ),
        detected_at       = datetime.utcnow(),
        created_at        = datetime.utcnow(),
    )
    session.add(fc)
    await session.flush()

    await log_event(
        session,
        entity_type = "FraudCluster",
        entity_id   = fc.id,
        action      = "detected",
        actor       = "fraud_graph_service",
        payload     = {
            "cluster_type":      fc.cluster_type,
            "link_node":         fc.link_node,
            "member_count":      fc.member_count,
            "member_worker_ids": fc.member_worker_ids,
            "risk_level":        fc.risk_level,
        },
    )

    logger.warning(
        "[graph] NEW FRAUD CLUSTER detected: type=%s  workers=%d  node=%s  risk=%s",
        fc.cluster_type, fc.member_count,
        (fc.link_node[:30] + "…") if len(fc.link_node) > 30 else fc.link_node,
        fc.risk_level,
    )
    return fc


async def _tag_pending_claims(
    session:    AsyncSession,
    worker_ids: list[str],
    tag:        str = "SHARED_DEVICE_CLUSTER",
) -> int:
    """
    Inject `tag` into the fraud_reason_tags of any 'initiated' or 'in_review'
    claims belonging to the cluster members — so that score_claim() will pick
    it up as a soft-flag on their next assessment.

    Returns the number of claims tagged.
    """
    q = await session.execute(
        select(Claim).where(
            Claim.worker_id.in_(worker_ids),
            Claim.status.in_(["initiated", "in_review"]),
        )
    )
    claims = q.scalars().all()
    count = 0
    for claim in claims:
        tags = list(claim.fraud_reason_tags or [])
        if tag not in tags:
            tags.append(tag)
            claim.fraud_reason_tags = tags
            claim.updated_at        = datetime.utcnow()
            count += 1

    if count:
        logger.info("[graph] Tagged %d pending claims with '%s'.", count, tag)
    return count


# ── Orchestration entry-point ─────────────────────────────────────────────────

async def analyze_fraud_graph(session: AsyncSession) -> dict:
    """
    Full graph fraud analysis pipeline.

    1. Build device-sharing graph from Worker.device_fingerprint.
    2. Detect connected components ≥ _MIN_CLUSTER_SIZE.
    3. Detect zone-velocity burst groups.
    4. Persist new clusters.
    5. Tag in-flight claims of cluster members.

    Returns a summary dict (for admin endpoint and logging).
    The caller is responsible for committing the session.
    """
    summary = {
        "device_clusters_found":    0,
        "zone_clusters_found":      0,
        "new_clusters_persisted":   0,
        "claims_tagged":            0,
    }

    # ── Device-sharing graph ─────────────────────────────────────────────────
    device_map = await _load_device_map(session)
    if device_map:
        G, edge_device = _build_worker_graph(device_map)
        device_clusters = detect_clusters(G, edge_device)
        summary["device_clusters_found"] = len(device_clusters)
    else:
        device_clusters = []

    # ── Zone-velocity burst detection ────────────────────────────────────────
    zone_clusters = await _detect_zone_velocity_clusters(session)
    summary["zone_clusters_found"] = len(zone_clusters)

    # ── Persist + tag ────────────────────────────────────────────────────────
    all_clusters = device_clusters + zone_clusters
    for cluster in all_clusters:
        fc = await _persist_cluster(session, cluster)
        if fc is not None:
            summary["new_clusters_persisted"] += 1
            tagged = await _tag_pending_claims(session, cluster["member_worker_ids"])
            summary["claims_tagged"] += tagged

    logger.info(
        "[graph] Analysis complete: device_clusters=%d  zone_clusters=%d  "
        "new=%d  claims_tagged=%d",
        summary["device_clusters_found"],
        summary["zone_clusters_found"],
        summary["new_clusters_persisted"],
        summary["claims_tagged"],
    )
    return summary
