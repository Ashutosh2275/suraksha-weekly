# OTP-Based Authentication System

Complete OTP authentication system for Suraksha Weekly FastAPI backend.

## Features

✅ **OTP Request** (`POST /api/v1/auth/otp/request`)
- Indian mobile number validation (+91XXXXXXXXXX)
- 6-digit OTP generation
- Redis storage with 300-second TTL
- Rate limiting: 3 requests per 10 minutes (sliding window)
- SMS provider abstraction (Twilio, MSG91, Development)
- Development mode returns OTP in response

✅ **OTP Verification** (`POST /api/v1/auth/otp/verify`)
- One-time use OTP validation
- Worker creation/retrieval by phone
- JWT access token (15 min TTL)
- JWT refresh token (7 day TTL)
- Refresh token hash stored in Redis
- Session logging for fraud detection

✅ **Token Refresh** (`POST /api/v1/auth/token/refresh`)
- Refresh token validation
- Token rotation (invalidate old, issue new)
- Redis-based session management

✅ **Logout** (`POST /api/v1/auth/logout`)
- Refresh token invalidation
- Session cleanup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ FastAPI Router (routers/auth_otp.py)                        │
├─────────────────────────────────────────────────────────────┤
│ ├─ POST /api/v1/auth/otp/request                            │
│ ├─ POST /api/v1/auth/otp/verify                             │
│ ├─ POST /api/v1/auth/token/refresh                          │
│ └─ POST /api/v1/auth/logout                                 │
└─────────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
    ┌──────▼──────┐ ┌────▼────┐  ┌──────▼──────┐
    │ OTP Service │ │  Token  │  │SMS Provider │
    │             │ │ Service │  │  Interface  │
    └──────┬──────┘ └────┬────┘  └──────┬──────┘
           │             │              │
           │             │              │
    ┌──────▼─────────────▼──────┐      │
    │       Redis Cache          │      │
    │ ┌────────────────────────┐ │      │
    │ │ otp:{phone}            │ │      │
    │ │ otp_rate_limit:{phone} │ │      │
    │ │ session:{worker}:{dev} │ │      │
    └────────────────────────────┘      │
                                        │
                        ┌───────────────▼───────────────┐
                        │ SMS Providers                 │
                        │ ├─ DevelopmentSMSProvider     │
                        │ ├─ TwilioSMSProvider          │
                        │ ├─ MSG91Provider              │
                        │ └─ MockSMSProvider            │
                        └───────────────────────────────┘
```

## Database Models

### Worker Model
```python
class Worker(Base):
    id: UUID          # Primary key
    phone: str        # Unique, indexed
    full_name: str?
    email: str?
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime?
```

### WorkerSession Model
```python
class WorkerSession(Base):
    id: UUID
    worker_id: UUID      # Foreign key
    device_id: str       # Device identifier
    ip_address: str?     # Client IP
    user_agent: str?     # Browser/app info
    created_at: datetime
    last_used_at: datetime
```

## Redis Keys

```
otp:{phone}                        # OTP value (TTL: 300s)
otp_rate_limit:{phone}             # Sorted set of timestamps (TTL: 600s)
session:{worker_id}:{device_id}    # Refresh token hash + metadata (TTL: 7 days)
```

## API Endpoints

### 1. Request OTP

**POST** `/api/v1/auth/otp/request`

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response (Development):**
```json
{
  "message": "OTP sent successfully",
  "expires_in": 300,
  "otp": "123456"
}
```

**Response (Production):**
```json
{
  "message": "OTP sent successfully",
  "expires_in": 300
}
```

**Errors:**
- `400` - Invalid phone number format
- `429` - Rate limit exceeded

---

### 2. Verify OTP

**POST** `/api/v1/auth/otp/verify`

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "device_id": "device_abc123xyz"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 900,
  "worker_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_new_user": false
}
```

**Errors:**
- `400` - Invalid phone or OTP format
- `401` - Invalid or expired OTP

---

### 3. Refresh Token

**POST** `/api/v1/auth/token/refresh`

**Request:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

### 4. Logout

**POST** `/api/v1/auth/logout`

**Request:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_ALGORITHM=HS256

# Environment
ENVIRONMENT=development  # development or production

# Redis
REDIS_URL=redis://localhost:6379/0

# SMS Provider
SMS_PROVIDER=development  # Options: development, twilio, msg91, mock

# Twilio (if SMS_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# MSG91 (if SMS_PROVIDER=msg91)
MSG91_AUTH_KEY=your-auth-key
MSG91_SENDER_ID=your-sender-id
MSG91_TEMPLATE_ID=your-template-id  # Optional
```

## SMS Providers

### Development Provider
- Logs OTP to console
- Always succeeds
- Used automatically in development environment

### Twilio Provider
- Production-ready SMS via Twilio API
- Requires account SID, auth token, from number
- International support

### MSG91 Provider
- Popular in India
- Template-based SMS
- Requires auth key, sender ID

### Mock Provider
- For testing
- Logs OTP but doesn't send
- Always returns success

## Usage Examples

### 1. Complete Authentication Flow

```python
import httpx

async def login_flow():
    base_url = "http://localhost:8000"
    
    # Step 1: Request OTP
    response = await httpx.post(
        f"{base_url}/api/v1/auth/otp/request",
        json={"phone": "+919876543210"}
    )
    data = response.json()
    otp = data.get("otp")  # Only in development
    
    # Step 2: Verify OTP
    response = await httpx.post(
        f"{base_url}/api/v1/auth/otp/verify",
        json={
            "phone": "+919876543210",
            "otp": otp,
            "device_id": "my-device-123"
        }
    )
    tokens = response.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    
    # Step 3: Make authenticated requests
    response = await httpx.get(
        f"{base_url}/api/v1/protected-endpoint",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    # Step 4: Refresh token when expired
    response = await httpx.post(
        f"{base_url}/api/v1/auth/token/refresh",
        json={"refresh_token": refresh_token}
    )
    new_tokens = response.json()
    
    # Step 5: Logout
    response = await httpx.post(
        f"{base_url}/api/v1/auth/logout",
        json={"refresh_token": new_tokens["refresh_token"]}
    )
```

### 2. Using Access Token

```python
from fastapi import Depends, HTTPException
from services.token_service import TokenService

async def get_current_worker(
    authorization: str = Header(...),
    token_service: TokenService = Depends(get_token_service)
):
    """Dependency to get current authenticated worker."""
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    # Verify token
    payload = token_service.verify_token(token, expected_type='access')
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    worker_id = payload.get('sub')
    phone = payload.get('phone')
    
    return {"worker_id": worker_id, "phone": phone}


# Use in protected route
@router.get("/protected")
async def protected_route(
    current_worker = Depends(get_current_worker)
):
    return {"message": f"Hello {current_worker['phone']}"}
```

## Rate Limiting

Uses sliding window algorithm with Redis sorted sets:

1. Each OTP request adds timestamp to sorted set
2. Old timestamps (> 10 minutes) are removed
3. If set size >= 3, request is denied
4. Sorted set expires after 10 minutes

**Benefits:**
- Prevents OTP spam
- Accurate sliding window
- Efficient Redis operations
- Automatic cleanup

## Security Features

✅ **OTP Security**
- 6-digit random OTP
- 5-minute expiration
- One-time use (deleted after verification)
- Rate limiting prevents brute force

✅ **Token Security**
- JWT with HS256 algorithm
- Short-lived access tokens (15 min)
- Refresh token rotation
- Tokens hashed before Redis storage

✅ **Session Security**
- Device ID tracking
- IP address logging
- User agent capture
- Multi-device support

✅ **Phone Validation**
- Regex validation for Indian numbers
- Normalization to +91 format
- Prevents invalid submissions

## Testing

### Manual Testing

```bash
# 1. Request OTP
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# 2. Verify OTP (use OTP from response in dev mode)
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456",
    "device_id": "test-device"
  }'

# 3. Refresh Token
curl -X POST http://localhost:8000/api/v1/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'

# 4. Logout
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

### Python Tests

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_otp_flow(client: AsyncClient):
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
            "device_id": "test"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
```

## Migration

To add the Worker and WorkerSession tables:

```bash
# Create migration
cd services/api
alembic revision --autogenerate -m "Add worker authentication models"

# Run migration
alembic upgrade head
```

## Monitoring

Key metrics to monitor:
- OTP request rate
- OTP verification success rate
- Rate limit hits
- Token refresh frequency
- SMS delivery failures
- Failed login attempts

---

**Built for Suraksha Weekly** • Guidewire DEVTrails 2026
