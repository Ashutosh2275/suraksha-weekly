#!/usr/bin/env python3
"""High-throughput seed script for k6 load testing.

Targets:
- 10,000 workers
- 10,000 policies
- 50,000 audit_logs
- 5,000 claims
- 1,000 fraud_assessments

The script uses asyncpg COPY to keep runtime below 5 minutes on local SSD-backed Postgres.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

import asyncpg


@dataclass
class SeedConfig:
    dsn: str
    workers: int = 10_000
    policies: int = 10_000
    audit_logs: int = 50_000
    claims: int = 5_000
    fraud_assessments: int = 1_000


def _now() -> datetime:
    return datetime.utcnow().replace(microsecond=0)


def _chunked(rows: list[tuple], size: int) -> list[list[tuple]]:
    return [rows[i : i + size] for i in range(0, len(rows), size)]


def _build_workers(n: int, ts: datetime) -> tuple[list[str], list[tuple]]:
    cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune']
    zones = {
        'Mumbai': ['Andheri', 'Bandra', 'Powai'],
        'Delhi': ['Saket', 'Rohini', 'Connaught Place'],
        'Bengaluru': ['Whitefield', 'Koramangala', 'Indiranagar'],
        'Hyderabad': ['Banjara Hills', 'Hitech City', 'Gachibowli'],
        'Pune': ['Baner', 'Hinjewadi', 'Kharadi'],
    }

    worker_ids: list[str] = []
    rows: list[tuple] = []
    for i in range(n):
        worker_id = str(uuid.uuid4())
        city = cities[i % len(cities)]
        phone = f"{9000000000 + i}"
        worker_ids.append(worker_id)
        rows.append(
            (
                worker_id,
                phone,
                f'Load Worker {i}',
                city,
                zones[city],
                'Zomato' if i % 2 == 0 else 'Swiggy',
                round(random.uniform(5.0, 11.0), 2),
                round(random.uniform(2500.0, 9500.0), 2),
                f'device_{i % 4000}',
                round(random.uniform(15.0, 100.0), 2),
                'gold' if i % 10 == 0 else ('silver' if i % 3 == 0 else 'bronze'),
                ts,
                ts,
            )
        )
    return worker_ids, rows


def _build_policies(worker_ids: list[str], n: int, ts: datetime) -> tuple[list[str], list[tuple]]:
    policy_ids: list[str] = []
    rows: list[tuple] = []
    start_date = ts - timedelta(days=2)
    end_date = start_date + timedelta(days=7)

    for i in range(n):
        policy_id = str(uuid.uuid4())
        worker_id = worker_ids[i % len(worker_ids)]
        plan = ['basic', 'standard', 'pro'][i % 3]
        cap = 500.0 if plan == 'basic' else (1500.0 if plan == 'standard' else 3000.0)
        premium = 59.0 if plan == 'basic' else (109.0 if plan == 'standard' else 179.0)
        policy_ids.append(policy_id)
        rows.append(
            (
                policy_id,
                worker_id,
                plan,
                'active',
                premium,
                cap,
                start_date,
                end_date,
                0,
                start_date,
                ts,
                ts,
            )
        )
    return policy_ids, rows


def _build_triggers(n: int, ts: datetime) -> tuple[list[str], list[tuple]]:
    trigger_ids: list[str] = []
    zones = ['Andheri', 'Bandra', 'Powai', 'Saket', 'Whitefield', 'Hitech City']
    types = ['HeavyRain', 'SeverePollution', 'ExtremeHeat', 'LocalRestriction', 'PlatformOutage']
    rows: list[tuple] = []

    for i in range(n):
        trigger_id = str(uuid.uuid4())
        trigger_type = types[i % len(types)]
        zone = zones[i % len(zones)]
        trigger_ids.append(trigger_id)
        rows.append(
            (
                trigger_id,
                trigger_type,
                zone,
                round(random.uniform(50.0, 450.0), 2),
                round(random.uniform(40.0, 300.0), 2),
                round(random.uniform(0.7, 0.99), 3),
                ['weather_api', 'sensor_mesh'],
                'active',
                ts - timedelta(minutes=i % 180),
                json.dumps({'source': 'load_seed', 'batch': i // 1000}),
                ts,
            )
        )
    return trigger_ids, rows


def _build_claims(worker_ids: list[str], policy_ids: list[str], trigger_ids: list[str], n: int, ts: datetime) -> tuple[list[str], list[tuple]]:
    claim_ids: list[str] = []
    rows: list[tuple] = []

    for i in range(n):
        claim_id = str(uuid.uuid4())
        worker_id = worker_ids[i]
        policy_id = policy_ids[i]
        trigger_id = trigger_ids[i % len(trigger_ids)]
        claim_ids.append(claim_id)
        rows.append(
            (
                claim_id,
                worker_id,
                policy_id,
                trigger_id,
                random.choice(['initiated', 'approved', 'in_review', 'blocked']),
                round(random.uniform(0.0, 95.0), 2),
                ['velocity_anomaly'] if i % 5 == 0 else [],
                round(random.uniform(100.0, 1800.0), 2),
                f'{worker_id}:{policy_id}:{trigger_id}',
                ts - timedelta(minutes=i % 120),
                None,
                ts,
                ts,
            )
        )

    return claim_ids, rows


def _build_fraud_assessments(claim_ids: list[str], n: int, ts: datetime) -> list[tuple]:
    rows: list[tuple] = []
    for i in range(n):
        decision = 'auto_approve' if i % 3 == 0 else ('hold' if i % 3 == 1 else 'auto_block')
        rows.append(
            (
                str(uuid.uuid4()),
                claim_ids[i],
                round(random.uniform(0.0, 100.0), 2),
                decision,
                ['device_shared'] if decision != 'auto_approve' else [],
                None,
                None,
                ts,
                ts,
            )
        )
    return rows


def _build_audit_logs(worker_ids: list[str], n: int, ts: datetime) -> list[tuple]:
    rows: list[tuple] = []
    entity_types = ['Worker', 'Policy', 'Claim', 'TriggerEvent']
    actions = ['created', 'updated', 'reviewed', 'simulated']

    for i in range(n):
        rows.append(
            (
                str(uuid.uuid4()),
                entity_types[i % len(entity_types)],
                str(uuid.uuid4()),
                actions[i % len(actions)],
                'system',
                worker_ids[i % len(worker_ids)] if i % 4 == 0 else None,
                None,
                None,
                json.dumps({'seed_batch': i // 1000, 'source': 'tests/load/seed.py'}),
                ts - timedelta(seconds=i % 3600),
            )
        )
    return rows


async def _copy_rows(conn: asyncpg.Connection, table: str, columns: list[str], rows: list[tuple], batch_size: int = 10_000) -> None:
    for chunk in _chunked(rows, batch_size):
        await conn.copy_records_to_table(table, records=chunk, columns=columns)


async def run_seed(config: SeedConfig) -> float:
    started = time.perf_counter()
    ts = _now()

    conn = await asyncpg.connect(config.dsn)
    try:
        await conn.execute('SET synchronous_commit TO OFF;')
        await conn.execute(
            'TRUNCATE TABLE payout_transactions, fraud_assessments, claims, audit_logs, trigger_events, policies, workers RESTART IDENTITY CASCADE;'
        )

        worker_ids, worker_rows = _build_workers(config.workers, ts)
        policy_ids, policy_rows = _build_policies(worker_ids, config.policies, ts)
        trigger_ids, trigger_rows = _build_triggers(max(1_000, config.claims), ts)
        claim_ids, claim_rows = _build_claims(worker_ids, policy_ids, trigger_ids, config.claims, ts)
        fraud_rows = _build_fraud_assessments(claim_ids, config.fraud_assessments, ts)
        audit_rows = _build_audit_logs(worker_ids, config.audit_logs, ts)

        await _copy_rows(
            conn,
            'workers',
            [
                'id', 'phone', 'name', 'city', 'service_zones', 'platform_type', 'avg_daily_hours',
                'avg_weekly_earnings', 'device_fingerprint', 'trust_score', 'trust_tier', 'created_at', 'updated_at',
            ],
            worker_rows,
        )
        await _copy_rows(
            conn,
            'policies',
            [
                'id', 'worker_id', 'plan_variant', 'status', 'weekly_premium', 'coverage_cap',
                'start_date', 'end_date', 'renewal_count', 'waiting_period_until', 'created_at', 'updated_at',
            ],
            policy_rows,
        )
        await _copy_rows(
            conn,
            'trigger_events',
            [
                'id', 'type', 'zone', 'value', 'threshold', 'confidence_score', 'sources',
                'status', 'triggered_at', 'audit_snapshot', 'created_at',
            ],
            trigger_rows,
        )
        await _copy_rows(
            conn,
            'claims',
            [
                'id', 'worker_id', 'policy_id', 'trigger_event_id', 'status', 'fraud_score',
                'fraud_reason_tags', 'payout_amount', 'idempotency_key', 'initiated_at', 'resolved_at', 'created_at', 'updated_at',
            ],
            claim_rows,
        )
        await _copy_rows(
            conn,
            'fraud_assessments',
            [
                'id', 'claim_id', 'score', 'decision', 'reason_codes', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
            ],
            fraud_rows,
        )
        await _copy_rows(
            conn,
            'audit_logs',
            [
                'id', 'entity_type', 'entity_id', 'action', 'actor_role', 'actor_id', 'previous_state',
                'new_state', 'metadata', 'created_at',
            ],
            audit_rows,
        )

        elapsed = time.perf_counter() - started

        counts = {
            'workers': await conn.fetchval('SELECT COUNT(*) FROM workers;'),
            'policies': await conn.fetchval('SELECT COUNT(*) FROM policies;'),
            'audit_logs': await conn.fetchval('SELECT COUNT(*) FROM audit_logs;'),
            'claims': await conn.fetchval('SELECT COUNT(*) FROM claims;'),
            'fraud_assessments': await conn.fetchval('SELECT COUNT(*) FROM fraud_assessments;'),
        }

        print('Seed complete with counts:')
        for k, v in counts.items():
            print(f'  {k}: {v}')
        print(f'Runtime: {elapsed:.2f}s')

        return elapsed
    finally:
        await conn.close()


def parse_args() -> SeedConfig:
    parser = argparse.ArgumentParser(description='Seed load-test data with asyncpg COPY.')
    parser.add_argument('--dsn', default='postgresql://postgres:postgres@localhost:5432/suraksha', help='Postgres DSN')
    parser.add_argument('--workers', type=int, default=10_000)
    parser.add_argument('--policies', type=int, default=10_000)
    parser.add_argument('--audit-logs', type=int, default=50_000)
    parser.add_argument('--claims', type=int, default=5_000)
    parser.add_argument('--fraud-assessments', type=int, default=1_000)

    args = parser.parse_args()
    return SeedConfig(
        dsn=args.dsn,
        workers=args.workers,
        policies=args.policies,
        audit_logs=args.audit_logs,
        claims=args.claims,
        fraud_assessments=args.fraud_assessments,
    )


def main() -> None:
    config = parse_args()
    elapsed = asyncio.run(run_seed(config))
    if elapsed > 300:
        raise SystemExit(f'Seed runtime exceeded target: {elapsed:.2f}s > 300.00s')


if __name__ == '__main__':
    main()
