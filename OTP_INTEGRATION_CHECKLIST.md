# OTP Authentication Integration Checklist

This checklist helps you integrate the OTP authentication system into your running FastAPI application.

## ✅ Phase 1: Files Created (DONE)

All authentication components have been created:

- [x] `services/api/schemas/auth.py` - Pydantic request/response models
- [x] `services/api/services/sms_provider.py` - SMS provider abstraction
- [x] `services/api/services/otp_service.py` - OTP generation and validation
- [x] `services/api/services/token_service.py` - JWT token management
- [x] `services/api/models/worker.py` - Worker and WorkerSession models
- [x] `services/api/routers/auth_otp.py` - Authentication endpoints
- [x] `services/api/requirements.txt` - Updated with PyJWT and httpx
- [x] `services/api/AUTH_OTP_README.md` - Complete documentation
- [x] `OTP_AUTH_COMPLETE.md` - Quick start guide

## 🔧 Phase 2: Integration (TODO)

Follow these steps to integrate the auth system into your running app:

### Step 1: Register Auth Router

**File:** `services/api/main.py` or `services/api/app.py`

```python
# Add import at top
from routers import auth_otp

# Register router with the app (add after other router registrations)
app.include_router(
    auth_otp.router,
    prefix="/api/v1/auth",
    tags=["authentication"]
)
```

**Verify:** Visit http://localhost:8000/docs and check that 4 new endpoints appear under "authentication" tag.

---

### Step 2: Update Environment Variables

**File:** `services/api/.env`

Add these variables (copy from `.env.example`):

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_ALGORITHM=HS256

# Environment Mode
ENVIRONMENT=development  # or production

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# SMS Provider Selection
SMS_PROVIDER=development  # Options: development, twilio, msg91, mock

# Twilio Configuration (if SMS_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# MSG91 Configuration (if SMS_PROVIDER=msg91)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID=
```

**Verify:** Ensure `JWT_SECRET` is at least 32 characters and Redis is accessible.

---

### Step 3: Update .env.example

**File:** `services/api/.env.example`

Add the same variables as above to document required configuration.

---

### Step 4: Install Dependencies

```bash
cd services/api
pip install -r requirements.txt
```

New dependencies:
- `PyJWT==2.8.0` - JWT token creation and verification
- `httpx==0.26.0` - HTTP client for SMS APIs

**Verify:** Run `pip list | grep -E "PyJWT|httpx"` to confirm installation.

---

### Step 5: Create Database Migration

```bash
cd services/api

# Generate migration for Worker and WorkerSession models
alembic revision --autogenerate -m "Add worker authentication models"

# Review the generated migration file in alembic/versions/

# Apply migration to database
alembic upgrade head
```

**Verify:** Check that `workers` and `worker_sessions` tables exist in PostgreSQL:

```sql
\dt workers
\dt worker_sessions
```

---

### Step 6: Verify Redis Connection

Ensure Redis is running and accessible:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Test connection with your REDIS_URL
redis-cli -u redis://localhost:6379/0 ping
```

**Verify:** Connection should succeed, or check your `REDIS_URL` setting.

---

### Step 7: Test Authentication Endpoints

#### 7.1 Request OTP

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

**Expected Response (development mode):**
```json
{
  "message": "OTP sent successfully",
  "expires_in": 300,
  "otp": "123456"
}
```

#### 7.2 Verify OTP

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456",
    "device_id": "test-device-001"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 900,
  "worker_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_new_user": true
}
```

#### 7.3 Refresh Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN_HERE"}'
```

#### 7.4 Logout

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN_HERE"}'
```

---

### Step 8: Test Rate Limiting

Request OTP 4 times rapidly for the same phone number:

```bash
# Request 1-3: Should succeed
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Request 4: Should fail with 429 Too Many Requests
```

**Expected 4th Response:**
```json
{
  "success": false,
  "error_code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many OTP requests. Please try again later.",
  "correlation_id": "..."
}
```

---

### Step 9: Create Protected Endpoint (Optional)

To use JWT authentication in your endpoints:

**File:** `services/api/dependencies/auth.py` (create if needed)

```python
from fastapi import Depends, HTTPException, Header
from services.token_service import TokenService

async def get_current_worker(
    authorization: str = Header(...),
    token_service: TokenService = Depends()
):
    """Dependency for protected routes - extracts and validates JWT."""
    
    # Extract token from Authorization header
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format"
        )
    
    # Verify token
    payload = token_service.verify_token(token, expected_type='access')
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    return {
        "worker_id": payload.get('sub'),
        "phone": payload.get('phone')
    }
```

**Usage in route:**

```python
from fastapi import Depends
from dependencies.auth import get_current_worker

@router.get("/protected-resource")
async def protected_route(
    current_worker = Depends(get_current_worker)
):
    return {
        "message": f"Hello, worker {current_worker['worker_id']}",
        "phone": current_worker['phone']
    }
```

**Test:**

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456", "device_id": "test"}' \
  | jq -r '.access_token')

# Use token
curl -X GET http://localhost:8000/protected-resource \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Quick Verification Checklist

- [ ] Auth router registered in main.py
- [ ] Environment variables configured in .env
- [ ] Dependencies installed (PyJWT, httpx)
- [ ] Database migration created and applied
- [ ] Redis connection verified
- [ ] OTP request endpoint works
- [ ] OTP verification endpoint works
- [ ] Tokens are generated correctly
- [ ] Token refresh works
- [ ] Logout works
- [ ] Rate limiting works (4th request fails)
- [ ] Protected routes can validate tokens (optional)

## 🔍 Troubleshooting

### Issue: Router not found

**Symptom:** `ImportError: cannot import name 'auth_otp' from 'routers'`

**Solution:** Ensure `routers/__init__.py` exists and/or use absolute import:
```python
from routers.auth_otp import router as auth_otp_router
```

---

### Issue: Redis connection failed

**Symptom:** `ConnectionError: Error connecting to Redis`

**Solution:**
1. Verify Redis is running: `redis-cli ping`
2. Check REDIS_URL in .env matches your Redis configuration
3. Ensure Redis port (default 6379) is not blocked by firewall

---

### Issue: JWT_SECRET error

**Symptom:** `JWT_SECRET environment variable not set`

**Solution:** Add to .env:
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

Generate secure secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

### Issue: Alembic migration fails

**Symptom:** `ImportError: No module named 'models.worker'`

**Solution:** Ensure `models/worker.py` is in the correct location and `models/__init__.py` imports it:
```python
from .worker import Worker, WorkerSession
```

---

### Issue: SMS not sending

**Symptom:** OTP not received on phone

**Solution:**
1. Check `SMS_PROVIDER` in .env is set correctly
2. For development: Use `SMS_PROVIDER=development` and check logs for OTP
3. For production: Verify SMS provider credentials (Twilio/MSG91)
4. Check SMS provider account balance and configuration

---

### Issue: OTP verification fails

**Symptom:** `401 Unauthorized: Invalid or expired OTP`

**Possible causes:**
1. OTP expired (5 minutes timeout) - request new OTP
2. Typo in phone number - ensure exact match including +91
3. OTP already used - OTPs are one-time use only
4. Redis cleared - restart Redis or request new OTP

---

## 📚 Additional Resources

- **Complete Documentation:** `services/api/AUTH_OTP_README.md`
- **Quick Start Guide:** `OTP_AUTH_COMPLETE.md`
- **API Documentation:** http://localhost:8000/docs (when running)
- **Redoc Documentation:** http://localhost:8000/redoc (when running)

## 🎉 Success Criteria

When all steps are complete, you should be able to:

✅ Request OTP with a valid Indian phone number
✅ Receive OTP (in response for dev mode)
✅ Verify OTP and get JWT tokens
✅ Use access token to access protected endpoints
✅ Refresh access token using refresh token
✅ Logout and invalidate refresh token
✅ See rate limiting in action after 3 requests

---

**Need Help?** Check the troubleshooting section or review the complete documentation.

**Built for Suraksha Weekly** • Guidewire DEVTrails 2026
