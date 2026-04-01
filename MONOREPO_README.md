# Suraksha Weekly - Monorepo

AI Parametric Income Shield for Gig Delivery Partners

[![Guidewire DEVTrails 2026](https://img.shields.io/badge/Guidewire-DEVTrails%202026-blue)](https://guidewire.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)](https://fastapi.tiangolo.com)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![Node 20](https://img.shields.io/badge/Node-20-green)](https://nodejs.org)

## 📁 Monorepo Structure

```
suraksha-weekly/
├── apps/
│   ├── worker-web/          → Next.js 14 worker frontend (port 3000)
│   └── admin-web/           → Next.js 14 admin dashboard (port 3001)
├── services/
│   ├── api/                 → FastAPI main backend (port 8000)
│   ├── fraud/               → FastAPI fraud scoring (port 8002)
│   └── trigger/             → FastAPI trigger ingestion (port 8003)
├── packages/
│   ├── shared-types/        → Shared TypeScript types
│   └── db-schema/           → Prisma database schema
├── shared/
│   └── fastapi_common/      → Common FastAPI utilities
├── infra/
│   └── docker/              → Docker infrastructure
└── tests/                   → Integration and load tests
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** and npm 10+
- **Python 3.11+**
- **Docker & Docker Compose** (optional, for containerized setup)
- **PostgreSQL 15+** (if not using Docker)
- **Redis** (if not using Docker)

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Install Python dependencies for services
cd services/api && pip install -r requirements.txt
cd services/fraud && pip install -r requirements.txt
cd services/trigger && pip install -r requirements.txt
```

### 2. Configure Environment Variables

Each service and app has an `.env.example` file. Copy and configure them:

```bash
# Services
cp services/api/.env.example services/api/.env
cp services/fraud/.env.example services/fraud/.env
cp services/trigger/.env.example services/trigger/.env

# Apps
cp apps/worker-web/.env.example apps/worker-web/.env.local
cp apps/admin-web/.env.example apps/admin-web/.env.local
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 4. Start Development Servers

#### Option A: Using npm scripts (manual)

```bash
# Start frontends
npm run dev:worker    # Worker web on port 3000
npm run dev:admin     # Admin web on port 3001

# Start backends (in separate terminals)
cd services/api && python main.py       # Port 8000
cd services/fraud && python main.py     # Port 8002
cd services/trigger && python main.py   # Port 8003
```

#### Option B: Using Docker Compose (recommended)

```bash
# Start all services
docker-compose -f infra/docker/docker-compose.yml up

# Or in background
docker-compose -f infra/docker/docker-compose.yml up -d
```

### 5. Access Applications

- **Worker Portal**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **API Documentation**: http://localhost:8000/docs
- **Fraud Service**: http://localhost:8002/docs
- **Trigger Service**: http://localhost:8003/docs

## 🏗️ Architecture

### Frontend Apps (Next.js 14)

- **Worker Web** (`apps/worker-web`)
  - Policy management
  - Claim submission and tracking
  - Earnings dashboard
  - Port: 3000

- **Admin Web** (`apps/admin-web`)
  - Claims review and approval
  - Policy oversight
  - Fraud monitoring
  - Analytics dashboard
  - Port: 3001

### Backend Services (FastAPI)

- **API Service** (`services/api`)
  - Main backend with authentication
  - Policy and claim management
  - Worker profiles
  - Request ID middleware (correlation tracking)
  - Port: 8000

- **Fraud Service** (`services/fraud`)
  - ML-based fraud detection
  - Risk scoring and assessment
  - Configurable thresholds
  - Correlation ID middleware
  - Port: 8002

- **Trigger Service** (`services/trigger`)
  - Parametric trigger ingestion
  - Weather/disruption event processing
  - Threshold evaluation
  - Correlation ID middleware
  - Port: 8003

### Shared Packages

- **@suraksha/shared-types** (`packages/shared-types`)
  - TypeScript types for API contracts
  - Shared interfaces across frontends

- **@suraksha/db-schema** (`packages/db-schema`)
  - Prisma schema definition
  - Database migrations

- **fastapi_common** (`shared/fastapi_common`)
  - Config validation with descriptive errors
  - Correlation ID middleware (UUID per request)
  - Centralized error response models
  - Exception handlers

## 📦 Available Scripts

### Root Level

```bash
npm run dev              # Start both frontends
npm run dev:worker       # Start worker frontend only
npm run dev:admin        # Start admin frontend only
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run type-check       # Type check all workspaces
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
```

### Docker Commands

```bash
npm run docker:build     # Build all Docker images
npm run docker:up        # Start all containers
npm run docker:down      # Stop all containers
npm run docker:logs      # View container logs
```

### Load Testing

```bash
npm run load:baseline    # Baseline load test
npm run load:peak        # Peak traffic test
npm run load:stress      # Stress test
npm run load:fraud       # Fraud scenario test
```

## 🔧 Configuration

### Environment Variables by Service

#### API Service
```env
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
OPENWEATHER_API_KEY=your-api-key
```

#### Fraud Service
```env
DATABASE_URL=postgresql://...
FRAUD_MODEL_PATH=/models/fraud_model.pkl
FRAUD_THRESHOLD_HIGH=0.6
FRAUD_THRESHOLD_CRITICAL=0.85
```

#### Trigger Service
```env
DATABASE_URL=postgresql://...
OPENWEATHER_API_KEY=your-api-key
TRIGGER_HEAVY_RAIN_MM=5.0
TRIGGER_EXTREME_HEAT_C=42.0
```

## 🧪 Testing

```bash
# Run Python tests
pytest

# Run load tests
npm run load:all

# Run specific load scenario
npm run load:baseline
```

## 🔐 Security Features

- **Config Validation**: All services validate environment variables at startup with descriptive error messages
- **Correlation ID**: Every request gets a UUID for end-to-end tracing (X-Correlation-ID header)
- **Centralized Error Handling**: Standardized error responses across all services
- **JWT Authentication**: Secure token-based auth in API service
- **Request ID Middleware**: Automatic request tracking

## 📚 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response
```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Resource not found",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 🐳 Docker Deployment

The complete stack can be deployed with Docker:

```bash
cd infra/docker
docker-compose up -d
```

Services included:
- PostgreSQL database
- Redis cache
- All FastAPI services
- Both Next.js frontends

## 📖 Documentation

- [API Service README](services/api/README.md)
- [Fraud Service README](services/fraud/README.md)
- [Trigger Service README](services/trigger/README.md)
- [Worker Web README](apps/worker-web/README.md)
- [Admin Web README](apps/admin-web/README.md)
- [Shared Types README](packages/shared-types/README.md)
- [DB Schema README](packages/db-schema/README.md)
- [FastAPI Common README](shared/fastapi_common/README.md)
- [Docker Infrastructure README](infra/docker/README.md)

## 🤝 Contributing

This is a Guidewire DEVTrails 2026 competition project.

## 📝 License

Proprietary - Guidewire DEVTrails 2026
