# Authentication & Security

Suraksha Weekly uses OTP-based authentication with JWT tokens for API access.

## Overview

```
User Flow:
1. Worker enters phone number
2. System generates 6-digit OTP (stored in Redis, 5-min TTL)
3. Worker receives OTP via SMS (mocked in dev)
4. Worker submits phone + OTP
5. System verifies OTP and either:
   - Returns JWT for existing worker
   - Creates new worker and returns JWT
6. Worker uses JWT for API requests
```

## Authentication Endpoints

### POST `/api/v1/auth/request-otp`

Request OTP for phone number.

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response (200):**
```json
{
  "status": 200,
  "message": "OTP sent successfully",
  "otp": "123456"  // Only in dev mode
}
```

**Error Response (400):**
```json
{
  "detail": "Invalid phone format. Expected +91XXXXXXXXXX"
}
```

### POST `/api/v1/auth/verify-otp`

Verify OTP and authenticate worker.

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "name": "Ramesh Kumar",
  "city": "Bangalore",
  "service_zones": ["North Bangalore", "Whitefield"],
  "platform_type": "Zomato",
  "avg_daily_hours": 8.5,
  "avg_weekly_earnings": 6500.0
}
```

**Response (200 - Existing Worker):**
```json
{
  "status": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "worker": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "+919876543210",
      "name": "Ramesh Kumar",
      "city": "Bangalore",
      "service_zones": ["North Bangalore", "Whitefield"],
      "platform_type": "Zomato",
      "trust_score": 95.0,
      "trust_tier": "standard"
    }
  }
}
```

**Response (201 - New Worker):**
```json
{
  "status": 201,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "worker": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "phone": "+919876543210",
      "name": "Ramesh Kumar",
      "city": "Bangalore",
      "service_zones": ["North Bangalore", "Whitefield"],
      "platform_type": "Zomato",
      "trust_score": 100.0,
      "trust_tier": "standard"
    }
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid or expired OTP"
}
```

## JWT Token

The JWT token includes:
- `worker_id`: Unique worker identifier
- `phone`: Worker phone number
- `exp`: Expiration timestamp (default 24 hours)

**Token Usage:**
```bash
curl -H "Authorization: Bearer {token}" http://localhost:8000/api/v1/policies
```

## Security Modules

### OTPHandler (`core/security.py`)

Manages OTP generation and verification using Redis.

```python
from core.security import OTPHandler

# Generate OTP (auto-stored in Redis with 5-min TTL)
otp = OTPHandler.generate_otp(phone="+919876543210")

# Verify OTP (returns bool, auto-deletes on success)
is_valid = OTPHandler.verify_otp(phone="+919876543210", otp="123456")

# Revoke OTP
OTPHandler.revoke_otp(phone="+919876543210")
```

### JWTHandler (`core/security.py`)

Manages JWT token creation and verification.

```python
from core.security import JWTHandler
from datetime import timedelta

# Create token
token = JWTHandler.create_token(
    data={"worker_id": "123", "phone": "+919876543210"},
    expires_delta=timedelta(hours=24)
)

# Verify token
payload = JWTHandler.verify_token(token)
# Returns: {"worker_id": "123", "phone": "+919876543210", "exp": 1234567890}
```

### PasswordHandler (`core/security.py`)

Manages password hashing and verification (for future use).

```python
from core.security import PasswordHandler

# Hash password
hashed = PasswordHandler.hash_password("user_password")

# Verify password
is_valid = PasswordHandler.verify_password("user_password", hashed)
```

## Audit Trail

Every authentication event is logged to the `audit_logs` table:

```python
# Login event
{
  "entity_type": "Worker",
  "entity_id": "worker_id",
  "action": "login",
  "actor": "system",
  "payload": {"phone": "+919876543210"}
}

# Registration event
{
  "entity_type": "Worker",
  "entity_id": "worker_id",
  "action": "registered",
  "actor": "system",
  "payload": {"phone": "+919876543210", "platform_type": "Zomato"}
}

# OTP request event
{
  "entity_type": "OTP",
  "entity_id": "+919876543210",
  "action": "requested",
  "actor": "system",
  "payload": {"otp_generated": true}
}
```

## Redis Keys

OTP values are stored in Redis with keys:

```
otp:{phone}  // TTL: 300 seconds (5 minutes)
```

Example:
```
otp:+919876543210 = "123456"
```

## Configuration

Authentication settings in `core/config.py`:

```python
JWT_SECRET = "jwt-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
```

## Environment Variables

```bash
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
REDIS_URL=redis://localhost:6379/0
```

## Best Practices

1. **Never commit secrets** to version control
2. **Use strong JWT_SECRET** in production (at least 32 characters)
3. **Enable HTTPS** in production to protect tokens in transit
4. **Rotate tokens** periodically for long-lived sessions
5. **Revoke OTPs** after maximum attempts (future enhancement)
6. **Log all auth events** for security audits
7. **Use environment variables** for all secrets

## Testing

```bash
# Request OTP
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP (replace with actual OTP from response)
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456",
    "name": "Test Worker",
    "city": "Bangalore",
    "service_zones": ["North"],
    "platform_type": "Zomato"
  }'

# Use token
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/v1/policies
```

## Future Enhancements

- [ ] OTP rate limiting (max 3 attempts per phone per hour)
- [ ] SMS gateway integration (currently mocked)
- [ ] Biometric authentication for mobile app
- [ ] Device fingerprinting for fraud detection
- [ ] Session management (token refresh)
- [ ] Multi-factor authentication (MFA)
