# Fraud Scoring Microservice

FastAPI microservice for fraud risk assessment and scoring.

## Features

- ML-based fraud detection
- Rule-based risk scoring
- Configurable risk thresholds
- Correlation ID tracing
- Centralized error handling

## Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the service:
   ```bash
   python main.py
   ```

   Or with uvicorn:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   ```

## API Endpoints

### POST /api/v1/fraud/check
Check fraud risk for a claim or policy.

**Request:**
```json
{
  "worker_id": "uuid",
  "claim_id": "uuid",
  "policy_id": "uuid",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 0.75,
    "risk_level": "high",
    "factors": [...],
    "recommendation": "Manual review required"
  },
  "correlation_id": "..."
}
```

### GET /api/v1/fraud/stats
Get fraud detection statistics.

### GET /health
Health check endpoint.

## Environment Variables

See `.env.example` for all required and optional configuration variables.
