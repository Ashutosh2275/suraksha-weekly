# Suraksha Weekly

Parametric income protection for gig delivery workers.

Team: Byte Coders | Guidewire DEVTrails 2026

## What This Product Does

Suraksha Weekly automatically compensates delivery workers when verified disruptions impact work in their service zone.

Supported disruption categories:
- Heavy rain
- Extreme heat
- Severe pollution
- Local restrictions
- Platform outage

Core flow:
1. Worker has an active weekly policy.
2. Trigger event is detected for worker zone.
3. Claim is initiated automatically.
4. Fraud scoring runs.
5. Claim is routed to paid, review, or blocked.
6. Payout transaction is recorded.

## Monorepo Structure

- `apps/web`: Worker-facing Next.js app
- `apps/admin`: Admin Next.js app
- `services/api`: FastAPI backend
- `services/trigger-poller`: Feed polling service
- `infra/docker-compose.yml`: Local full-stack orchestration
- `scripts/demo_reset.py`: Deterministic demo data seed script (host-side)
- `docs/checklists`: Phase planning and traceability docs

## Product Plan and Requirements (Source of Truth)

- `PRD.md`
- `docs/checklists/implementation-phases.md`
- `docs/checklists/requirement-traceability-matrix.md`
- `PHASE2_CHECKLIST.md`
- `PHASE2_VERIFICATION.md`

## Local Development

### Prerequisites

- Docker Desktop
- Python 3.11+
- Node.js 18+

### Start Services

```bash
docker compose -f infra/docker-compose.yml up -d
```

Expected core services:
- postgres
- redis
- api
- web
- admin

### URLs

- Worker app: `http://localhost:3000`
- Admin app: `http://localhost:3001`
- API docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/health`

## Demo Data Seeding

Two valid ways are available.

### Recommended (same DB as running API)

```bash
# MOCK_MODE allows reset without admin token validation restrictions
curl -X POST http://localhost:8000/api/v1/admin/demo/reset
```

Returns:

```json
{ "message": "Demo environment ready. 10 workers, 10 policies, 3 claims seeded." }
```

### Host script method

```bash
python scripts/demo_reset.py
```

Use this when your host Python environment points to the same database used by API.

## Key API Endpoints for Phase 2 Demo

### Health and probes
- `GET /health/e2e`
- `GET /internal/live`
- `GET /internal/ready`
- `GET /internal/startup`

### Demo operations
- `POST /api/v1/admin/demo/reset`
- `POST /api/v1/admin/demo/simulate-disruption`
- `GET /api/v1/admin/demo/status`

Example simulate-disruption body:

```json
{
  "trigger_type": "HeavyRain",
  "zone": "Mumbai Zone 3",
  "intensity_level": "severe"
}
```

## Phase 2 Pre-Recording Verification (Quick Runbook)

1. Start stack:
```bash
docker compose -f infra/docker-compose.yml up -d
```

2. Verify health:
```bash
python -c "import json,urllib.request;print(json.dumps(json.loads(urllib.request.urlopen('http://localhost:8000/health/e2e').read().decode()),indent=2))"
```

3. Reset demo state:
```bash
python -c "import json,urllib.request;req=urllib.request.Request('http://localhost:8000/api/v1/admin/demo/reset',data=b'{}',headers={'Content-Type':'application/json','X-Admin-Token':'dev-admin-token-change-in-production'});print(urllib.request.urlopen(req).read().decode())"
```

4. Simulate disruption:
```bash
python -c "import json,urllib.request;d=json.dumps({'trigger_type':'HeavyRain','zone':'Mumbai Zone 3','intensity_level':'severe'}).encode();req=urllib.request.Request('http://localhost:8000/api/v1/admin/demo/simulate-disruption',data=d,headers={'Content-Type':'application/json','X-Admin-Token':'dev-admin-token-change-in-production'});print(urllib.request.urlopen(req).read().decode())"
```

5. Open UI:
- `http://localhost:3000/dashboard`
- `http://localhost:3001/dashboard`

## Tech Stack

- Frontend: Next.js + TypeScript
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Cache and queue: Redis
- ML components: scikit-learn based fraud and pricing services
- Infra: Docker Compose

## Notes

- This repository includes mock-mode behavior for offline demo reliability.
- Admin endpoints require `X-Admin-Token` except specific demo reset behavior in mock mode.
- For endpoint-level contracts and acceptance mapping, refer to `PHASE2_VERIFICATION.md` and `docs/checklists/requirement-traceability-matrix.md`.
- This README is manually written and maintained by the Byte Coders team.
