# 🔐 OTP Authentication System - Complete!

A production-ready OTP-based authentication system for Suraksha Weekly FastAPI backend.

## ✅ What Was Built

### Core Components

1. **Pydantic Schemas** (`schemas/auth.py`)
   - `OTPRequestSchema` - Phone validation with regex
   - `OTPVerifySchema` - OTP + device ID validation
   - `TokenRefreshSchema` - Refresh token validation
   - `LogoutSchema` - Logout request
   - All response schemas with examples

2. **SMS Provider Interface** (`services/sms_provider.py`)
   - Abstract `SMSProvider` base class
   - `DevelopmentSMSProvider` - Logs OTP (dev mode)
   - `TwilioSMSProvider` - Twilio integration
   - `MSG91Provider` - MSG91 integration (India)
   - `MockSMSProvider` - Testing
   - Factory function for provider selection

3. **OTP Service** (`services/otp_service.py`)
   - 6-digit OTP generation
   - Redis storage with 300s TTL
   - Rate limiting with sliding window (3 per 10 min)
   - One-time use validation
   - Automatic cleanup

4. **Token Service** (`services/token_service.py`)
   - JWT access tokens (15 min TTL)
   - JWT refresh tokens (7 day TTL)
   - Token verification and validation
   - Refresh token hashing
   - Redis session storage
   - Token rotation
   - Session invalidation

5. **Database Models** (`models/worker.py`)
   - `Worker` model with phone, status, timestamps
   - `WorkerSession` model for fraud detection
   - Proper indexes for performance

6. **Authentication Router** (`routers/auth_otp.py`)
   - `POST /api/v1/auth/otp/request`
   - `POST /api/v1/auth/otp/verify`
   - `POST /api/v1/auth/token/refresh`
   - `POST /api/v1/auth/logout`
   - Full error handling
   - Dependency injection

## 🎯 Features Implemented

### OTP Request Endpoint
✅ Indian phone number validation (+91XXXXXXXXXX)
✅ 6-digit OTP generation
✅ Redis storage with 300-second TTL
✅ Rate limiting (3 requests per 10 minutes)
✅ SMS provider abstraction
✅ Development mode returns OTP
✅ Production mode sends SMS only

### OTP Verify Endpoint
✅ OTP validation against Redis
✅ One-time use (deleted after verification)
✅ Worker creation/retrieval by phone
✅ JWT access token generation (15 min)
✅ JWT refresh token generation (7 days)
✅ Refresh token hash in Redis
✅ Session logging (device_id, IP, user_agent)
✅ Returns is_new_user flag

### Token Refresh Endpoint
✅ Refresh token validation
✅ Token rotation (invalidate old, issue new)
✅ Redis session verification
✅ New token pair generation

### Logout Endpoint
✅ Refresh token invalidation
✅ Redis session cleanup
✅ Graceful handling of invalid tokens

## 🏗️ Architecture

```
Authentication Flow
├── OTP Request
│   ├── Phone validation (regex)
│   ├── Rate limit check (Redis sorted set)
│   ├── OTP generation (6 digits)
│   ├── Redis storage (otp:{phone}, 300s TTL)
│   ├── SMS sending (via provider)
│   └── Response (with OTP in dev mode)
│
├── OTP Verification
│   ├── OTP validation (Redis lookup)
│   ├── Worker lookup/creation (PostgreSQL)
│   ├── Session creation (device + IP logging)
│   ├── Access token generation (JWT, 15 min)
│   ├── Refresh token generation (JWT, 7 days)
│   ├── Token storage (Redis hash)
│   └── Response (tokens + worker_id)
│
├── Token Refresh
│   ├── Refresh token validation (JWT)
│   ├── Redis session check
│   ├── Token rotation (invalidate + create)
│   ├── New access token generation
│   └── Response (new token pair)
│
└── Logout
    ├── Refresh token validation
    ├── Redis session deletion
    └── Response (success)
```

## 📦 Files Created

```
services/api/
├── schemas/
│   └── auth.py                 # Pydantic schemas
├── services/
│   ├── sms_provider.py         # SMS provider interface
│   ├── otp_service.py          # OTP operations
│   └── token_service.py        # JWT operations
├── models/
│   └── worker.py               # Worker & WorkerSession models
├── routers/
│   └── auth_otp.py             # Authentication endpoints
├── AUTH_OTP_README.md          # Complete documentation
└── requirements.txt            # Updated with PyJWT & httpx
```

## 🚀 Quick Start

### 1. Update Environment Variables

Add to `services/api/.env`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_ALGORITHM=HS256

# Environment
ENVIRONMENT=development

# Redis
REDIS_URL=redis://localhost:6379/0

# SMS Provider
SMS_PROVIDER=development  # Options: development, twilio, msg91, mock

# Twilio (optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# MSG91 (optional)
MSG91_AUTH_KEY=your-auth-key
MSG91_SENDER_ID=your-sender-id
MSG91_TEMPLATE_ID=your-template-id
```

### 2. Create Database Migration

```bash
cd services/api

# Create migration
alembic revision --autogenerate -m "Add worker authentication models"

# Run migration
alembic upgrade head
```

### 3. Test the Endpoints

```bash
# 1. Request OTP
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Response (dev mode):
# {
#   "message": "OTP sent successfully",
#   "expires_in": 300,
#   "otp": "123456"
# }

# 2. Verify OTP
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456",
    "device_id": "my-device-123"
  }'

# Response:
# {
#   "access_token": "eyJ0eXAi...",
#   "refresh_token": "eyJ0eXAi...",
#   "token_type": "bearer",
#   "expires_in": 900,
#   "worker_id": "550e8400-...",
#   "is_new_user": true
# }

# 3. Refresh Token
curl -X POST http://localhost:8000/api/v1/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'

# 4. Logout
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

## 🔐 Security Features

✅ **Phone Validation**: Regex for Indian numbers, normalized to +91 format
✅ **Rate Limiting**: Sliding window, 3 requests per 10 minutes
✅ **OTP Security**: 6-digit random, 5-min expiration, one-time use
✅ **Token Security**: JWT with HS256, short-lived access, refresh rotation
✅ **Session Tracking**: Device ID + IP + User Agent logging
✅ **Hash Storage**: Refresh tokens hashed before Redis storage

## 📊 Redis Keys

```
otp:{phone}                        # OTP value, 300s TTL
otp_rate_limit:{phone}             # Sorted set of timestamps, 600s TTL
session:{worker_id}:{device_id}    # Refresh token hash + metadata, 7 days TTL
```

## 🔧 Configuration Options

### SMS Providers

| Provider | Description | Use Case |
|----------|-------------|----------|
| `development` | Logs OTP to console | Local development |
| `mock` | Logs OTP, always succeeds | Testing |
| `twilio` | Sends via Twilio API | International SMS |
| `msg91` | Sends via MSG91 API | India-focused |

### Environment Modes

| Mode | OTP in Response | SMS Sending | Best For |
|------|----------------|-------------|----------|
| `development` | ✅ Yes | Logs only | Local dev |
| `production` | ❌ No | Real SMS | Production |

## 🧪 Testing

### Manual Testing with cURL
See Quick Start section above

### Python Testing
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_complete_auth_flow(client: AsyncClient):
    # Request OTP
    response = await client.post(
        "/api/v1/auth/otp/request",
        json={"phone": "+919876543210"}
    )
    assert response.status_code == 200
    otp = response.json()["otp"]
    
    # Verify OTP
    response = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": "+919876543210",
            "otp": otp,
            "device_id": "test-device"
        }
    )
    assert response.status_code == 200
    tokens = response.json()
    
    # Refresh token
    response = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": tokens["refresh_token"]}
    )
    assert response.status_code == 200
    
    # Logout
    response = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]}
    )
    assert response.status_code == 200
```

## 📚 Documentation

Complete documentation available in:
- **AUTH_OTP_README.md** - Full guide with examples
- API docs at `/docs` endpoint when running

## 🎉 Ready to Use!

All endpoints are ready and fully functional:
- ✅ OTP request with rate limiting
- ✅ OTP verification with worker creation
- ✅ JWT token generation and management
- ✅ Token refresh with rotation
- ✅ Logout with session cleanup
- ✅ SMS provider abstraction
- ✅ Development and production modes
- ✅ Comprehensive error handling

**Start the API:** `cd services/api && uvicorn main:app --reload`

**Access Docs:** http://localhost:8000/docs

---

**Built for Suraksha Weekly** • Guidewire DEVTrails 2026 🚀
