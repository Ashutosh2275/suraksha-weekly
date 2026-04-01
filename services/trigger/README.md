# Trigger Ingestion Service

FastAPI service for ingesting and evaluating parametric insurance triggers.

## Features

- Ingest external trigger events (weather, traffic, disruptions)
- Evaluate against parametric thresholds
- Track affected policies
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
   uvicorn main:app --host 0.0.0.0 --port 8003 --reload
   ```

## API Endpoints

### POST /api/v1/triggers/ingest
Ingest a trigger event.

**Request:**
```json
{
  "event_type": "weather",
  "severity": "high",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "city": "Bangalore"
  },
  "metadata": {
    "rainfall_mm": 8.2,
    "temperature": 43.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event_id": "evt_001",
    "trigger_activated": true,
    "affected_policies": 125,
    "evaluation": {...}
  },
  "correlation_id": "..."
}
```

### GET /api/v1/triggers/recent
Get recent trigger events.

### GET /api/v1/triggers/stats
Get trigger statistics.

### GET /health
Health check endpoint.

## Environment Variables

See `.env.example` for all required and optional configuration variables.

## Background Poller

The legacy `services/trigger-poller` can run alongside this service to continuously
poll external APIs and push events to this ingestion endpoint.
