# Role-Based Authorization System

## Overview

A production-ready role-based authorization system for Suraksha Weekly FastAPI backend with JWT token validation, role-based access control, and immutable admin action audit logging.

---

## Components Created

### 1. Role Enum (`core/roles.py`)

Defines four user roles:

```python
class Role(str, Enum):
    WORKER = "worker"              # Gig workers (default)
    REVIEWER = "reviewer"           # Claim reviewers
    RISK_ADMIN = "risk_admin"       # Risk/fraud administrators
    PLATFORM_ADMIN = "platform_admin"  # Platform administrators
```

---

### 2. Authentication Dependencies (`core/auth_dependencies.py`)

#### `get_current_user()` Dependency

**Purpose:** Validates JWT tokens and extracts user information.

**Functionality:**
- Reads Bearer token from `Authorization` header
- Validates JWT signature and expiry using `JWTHandler`
- Extracts user ID, phone, and role from token payload
- Returns `CurrentUser` object with user information
- Raises `UnauthorizedException` (error_code: `AUTH_FAILED`) on any invalid token

**Usage:**
```python
from core.auth_dependencies import get_current_user

@router.get("/protected")
async def protected_route(current_user: CurrentUser = Depends(get_current_user)):
    return {"user_id": current_user.user_id, "role": current_user.role}
```

**Token Payload Expected:**
```json
{
  "sub": "user-id-here",           // or "worker_id" or "user_id"
  "phone": "+919876543210",
  "role": "risk_admin",            // defaults to "worker" if missing
  "exp": 1234567890,
  "iat": 1234567890
}
```

#### `require_role(*roles)` Dependency Factory

**Purpose:** Role-based access control for endpoints.

**Functionality:**
- Wraps `get_current_user` dependency
- Validates that user's role is in the allowed roles list
- Raises `ForbiddenException` (error_code: `FORBIDDEN`, HTTP 403) if role not allowed
- Returns `CurrentUser` if authorized

**Usage:**
```python
from core.auth_dependencies import require_role
from core.roles import Role

@router.get(
    "/admin/dashboard",
    dependencies=[Depends(require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN))]
)
async def admin_dashboard():
    return {"message": "Admin dashboard"}
```

#### Convenience Dependencies

Pre-configured role combinations for common use cases:

```python
# Require any admin role (RISK_ADMIN or PLATFORM_ADMIN)
require_admin = require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN)

# Require reviewer or admin role
require_reviewer = require_role(Role.REVIEWER, Role.RISK_ADMIN, Role.PLATFORM_ADMIN)

# Require platform admin only
require_platform_admin = require_role(Role.PLATFORM_ADMIN)

# Require risk admin only (or platform admin)
require_risk_admin = require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN)
```

**Usage:**
```python
from core.auth_dependencies import require_admin, require_reviewer

@router.get("/admin/audit", dependencies=[Depends(require_admin)])
async def get_audit_logs():
    ...

@router.patch("/claims/{id}/review", dependencies=[Depends(require_reviewer)])
async def review_claim(claim_id: str, current_user: CurrentUser = Depends(require_reviewer)):
    # current_user contains user info
    ...
```

---

### 3. Admin Action Log Model (`models/admin_action_log.py`)

**Database Table:** `admin_action_logs`

**Purpose:** Immutable audit trail of all admin actions.

**Schema:**
```python
id: UUID                    # Primary key
user_id: String(255)        # User identifier (indexed)
role: String(50)            # User role (indexed)
action: String(500)         # HTTP method + path (e.g., "POST /admin/claims/123/review")
request_body_hash: String(64)  # SHA256 hash of request body (nullable)
ip_address: String(45)      # Client IP address (IPv6 compatible)
timestamp: DateTime         # Action timestamp (indexed, auto-generated)
correlation_id: String(100) # Request correlation ID (nullable)
response_status: String(10) # HTTP response status code (nullable)
```

**Indexes:**
- `idx_admin_action_logs_user_id` on `user_id`
- `idx_admin_action_logs_role` on `role`
- `idx_admin_action_logs_timestamp` on `timestamp`
- `idx_admin_action_logs_user_timestamp` on `(user_id, timestamp)`

**Important:** This table is **INSERT-ONLY**. Never UPDATE or DELETE records.

---

### 4. Admin Action Logger Middleware (`middleware/admin_logger.py`)

**Class:** `AdminActionLoggerMiddleware`

**Purpose:** Automatically logs all requests from RISK_ADMIN and PLATFORM_ADMIN users.

**Functionality:**
1. Intercepts all HTTP requests
2. Extracts JWT token from `Authorization` header
3. Verifies token and extracts user ID and role
4. If role is `RISK_ADMIN` or `PLATFORM_ADMIN`:
   - Logs action to `admin_action_logs` table
   - Records: user_id, role, action (method + path), request body hash, IP, timestamp
5. Never fails the request if logging fails (logs error and continues)

**Logged Information:**
- **user_id:** User identifier from JWT
- **role:** User role (risk_admin or platform_admin)
- **action:** HTTP method + path (e.g., "GET /admin/dashboard")
- **request_body_hash:** SHA256 hash of request body (if present)
- **ip_address:** Client IP address
- **correlation_id:** X-Request-ID from RequestIDMiddleware
- **response_status:** HTTP response status code
- **timestamp:** Auto-generated

**Middleware Order:**
```
RequestIDMiddleware (outermost)
  ↓
TrustedHostMiddleware
  ↓
CORSMiddleware
  ↓
AdminActionLoggerMiddleware  ← NEW
  ↓
PerformanceLoggingMiddleware (innermost)
```

---

## Integration

### Middleware Registration

The middleware is automatically registered in `app.py`:

```python
# In app.py
from middleware import AdminActionLoggerMiddleware

# Add after PerformanceLoggingMiddleware
app.add_middleware(AdminActionLoggerMiddleware)
```

### Router Updates

All admin endpoints have been updated to use role-based auth:

#### Admin Router (`routers/admin.py`)

**Endpoints Updated:**
- `GET /dashboard` - Requires `require_admin`
- `GET /audit-logs` - Requires `require_admin`
- `GET /fraud/model-status` - Requires `require_admin`
- `POST /fraud/analyze-graph` - Requires `require_admin`
- `GET /fraud/clusters` - Requires `require_admin`
- `POST /fraud/validate-model` - Requires `require_admin`
- `GET /simulation/run` - Requires `require_admin`

**Before:**
```python
dependencies=[Depends(_require_admin), ...]
```

**After:**
```python
dependencies=[Depends(require_admin), ...]
```

#### Claims Router (`routers/claims.py`)

**Endpoints Updated:**
- `GET /admin/claims` - Requires `require_reviewer`
- `PATCH /admin/claims/{id}/review` - Requires `require_reviewer`

**Benefits:**
- Reviewers can view and approve claims
- Risk/platform admins can also perform these actions
- Workers cannot access these endpoints

#### Payouts Router (`routers/payouts.py`)

**Endpoints Updated:**
- `POST /admin/payouts/{id}/retry` - Requires `require_risk_admin`

**Benefits:**
- Only risk admins and platform admins can retry failed payouts
- Actor is now logged as `role:user_id` instead of token prefix

---

## Usage Examples

### 1. Protecting an Endpoint with Roles

```python
from fastapi import APIRouter, Depends
from core.auth_dependencies import require_role, CurrentUser
from core.roles import Role

router = APIRouter()

@router.get(
    "/admin/dashboard",
    dependencies=[Depends(require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN))]
)
async def admin_dashboard(current_user: CurrentUser = Depends(require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN))):
    return {
        "message": "Admin dashboard",
        "user_id": current_user.user_id,
        "role": current_user.role.value
    }
```

### 2. Creating JWT Tokens with Roles

```python
from core.security import JWTHandler
from core.roles import Role
from datetime import timedelta

# Create token for risk admin
payload = {
    "sub": "user-123",
    "phone": "+919876543210",
    "role": Role.RISK_ADMIN.value  # Important: include role
}

token = JWTHandler.create_token(
    data=payload,
    expires_delta=timedelta(hours=24)
)
```

### 3. Accessing Current User in Handler

```python
from core.auth_dependencies import get_current_user, CurrentUser

@router.post("/admin/action")
async def perform_action(
    data: SomeModel,
    current_user: CurrentUser = Depends(get_current_user)
):
    # Access user information
    logger.info(f"Action by {current_user.user_id} ({current_user.role})")
    
    # Use in audit log
    actor = f"{current_user.role.value}:{current_user.user_id}"
    
    return {"status": "success"}
```

### 4. Querying Admin Action Logs

```python
from models.admin_action_log import AdminActionLog
from sqlalchemy import select, desc

# Get recent admin actions
query = select(AdminActionLog).order_by(desc(AdminActionLog.timestamp)).limit(100)
results = await session.execute(query)
logs = results.scalars().all()

# Get actions by specific user
query = select(AdminActionLog).where(AdminActionLog.user_id == "user-123")
results = await session.execute(query)
user_logs = results.scalars().all()

# Get actions by role
query = select(AdminActionLog).where(AdminActionLog.role == "platform_admin")
results = await session.execute(query)
admin_logs = results.scalars().all()
```

---

## Error Responses

### AUTH_FAILED (401 Unauthorized)

**Triggered When:**
- Authorization header is missing
- Authorization header format is invalid
- JWT token is invalid or expired
- JWT token missing user identifier

**Response:**
```json
{
  "success": false,
  "error_code": "AUTH_FAILED",
  "message": "Invalid or expired token",
  "correlation_id": "abc-123-def-456"
}
```

### FORBIDDEN (403 Forbidden)

**Triggered When:**
- User's role is not in the allowed roles for the endpoint

**Response:**
```json
{
  "success": false,
  "error_code": "FORBIDDEN",
  "message": "Access denied. Required role: risk_admin, platform_admin",
  "correlation_id": "abc-123-def-456"
}
```

---

## Database Migration

Create a migration for the new `admin_action_logs` table:

```bash
cd services/api

# Generate migration
alembic revision --autogenerate -m "Add admin action logs table"

# Review migration file in alembic/versions/

# Apply migration
alembic upgrade head
```

**Expected Migration:**
```python
def upgrade():
    op.create_table(
        'admin_action_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=500), nullable=False),
        sa.Column('request_body_hash', sa.String(length=64), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('correlation_id', sa.String(length=100), nullable=True),
        sa.Column('response_status', sa.String(length=10), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_admin_action_logs_user_id', 'admin_action_logs', ['user_id'])
    op.create_index('idx_admin_action_logs_role', 'admin_action_logs', ['role'])
    op.create_index('idx_admin_action_logs_timestamp', 'admin_action_logs', ['timestamp'])
    op.create_index('idx_admin_action_logs_user_timestamp', 'admin_action_logs', ['user_id', 'timestamp'])
```

---

## Testing

### Manual Testing with cURL

#### 1. Create JWT Token with Role

```python
# Python script to create test token
from core.security import JWTHandler
from datetime import timedelta

# Risk admin token
token = JWTHandler.create_token(
    data={
        "sub": "admin-123",
        "phone": "+919876543210",
        "role": "risk_admin"
    },
    expires_delta=timedelta(hours=24)
)
print(f"Token: {token}")
```

#### 2. Test Protected Endpoint

```bash
# Access admin endpoint with valid role
curl -X GET http://localhost:8000/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
```

#### 3. Test Role Restriction

```bash
# Try to access with worker role token
# (Create token with role="worker")
curl -X GET http://localhost:8000/admin/dashboard \
  -H "Authorization: Bearer WORKER_TOKEN_HERE"

# Expected: 403 Forbidden
# {
#   "success": false,
#   "error_code": "FORBIDDEN",
#   "message": "Access denied. Required role: risk_admin, platform_admin"
# }
```

#### 4. Test Missing Token

```bash
# Access without Authorization header
curl -X GET http://localhost:8000/admin/dashboard

# Expected: 401 Unauthorized
# {
#   "success": false,
#   "error_code": "AUTH_FAILED",
#   "message": "Authorization header required"
# }
```

#### 5. Verify Admin Action Log

```sql
-- Query admin_action_logs table
SELECT * FROM admin_action_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Expected: Entry for GET /admin/dashboard with user_id="admin-123", role="risk_admin"
```

---

## Security Features

### ✅ JWT Token Validation
- Signature verification using `JWT_SECRET`
- Expiration check
- Payload validation (user ID, role)
- Algorithm verification (HS256)

### ✅ Role-Based Access Control
- Fine-grained role requirements per endpoint
- Multiple roles can be allowed per endpoint
- Clear error messages on access denial
- Role validation happens before handler execution

### ✅ Immutable Audit Trail
- All admin actions logged to database
- INSERT-only table (no updates/deletes)
- SHA256 hash of request body for integrity
- Correlation ID for request tracing
- IP address logging for security analysis

### ✅ Defense in Depth
- Middleware logs actions even if handler fails
- Logging failures never impact request processing
- Token verification happens at dependency level
- Role check happens after authentication

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Failed Authentication Attempts**
   - Query: Count of 401 errors on admin endpoints
   - Alert: >10 failures in 5 minutes from same IP

2. **Forbidden Access Attempts**
   - Query: Count of 403 errors
   - Alert: User attempting access to higher privilege endpoints

3. **Admin Action Frequency**
   - Query: Count of admin_action_logs per hour
   - Alert: Unusual spike in admin actions

4. **High-Risk Actions**
   - Query: Actions like "PATCH /admin/claims/*/review" with status != 200
   - Alert: Failed claim review attempts

### Example Queries

```sql
-- Failed auth attempts in last hour
SELECT ip_address, COUNT(*) as attempts
FROM admin_action_logs
WHERE response_status = '401'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 10;

-- Most active admins today
SELECT user_id, role, COUNT(*) as actions
FROM admin_action_logs
WHERE timestamp > CURRENT_DATE
GROUP BY user_id, role
ORDER BY actions DESC;

-- Suspicious: Worker attempting admin endpoints
-- (Check application logs for 403 errors)
```

---

## Best Practices

### 1. Always Include Role in JWT
When creating tokens, always include the `role` field:
```python
payload = {
    "sub": user_id,
    "phone": phone,
    "role": user.role.value  # Don't forget this!
}
```

### 2. Use Convenience Dependencies
Prefer pre-configured dependencies:
```python
# Good
dependencies=[Depends(require_admin)]

# Also OK, but more verbose
dependencies=[Depends(require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN))]
```

### 3. Access Current User in Handler
When you need user info, inject as parameter:
```python
async def handler(current_user: CurrentUser = Depends(require_admin)):
    # Now you can use current_user.user_id, current_user.role
    ...
```

### 4. Never Modify admin_action_logs
This table is append-only for audit integrity:
```python
# ✅ Good
session.add(AdminActionLog(...))

# ❌ Bad - Never do this
log.status = "modified"  # Don't update
session.delete(log)       # Don't delete
```

### 5. Test Role Restrictions
Always test that:
- Workers cannot access admin endpoints (403)
- Reviewers can access review endpoints
- Admins can access all endpoints
- Invalid tokens are rejected (401)

---

## Files Created/Modified

### New Files
1. `core/roles.py` - Role enum definition
2. `core/auth_dependencies.py` - Auth dependencies
3. `models/admin_action_log.py` - Audit log model
4. `middleware/admin_logger.py` - Admin action logger middleware
5. `middleware/__init__.py` - Middleware package

### Modified Files
1. `app.py` - Added AdminActionLoggerMiddleware
2. `routers/admin.py` - Updated all endpoints to use `require_admin`
3. `routers/claims.py` - Updated admin endpoints to use `require_reviewer`
4. `routers/payouts.py` - Updated admin endpoint to use `require_risk_admin`

---

## Summary

✅ **Role-based authorization** fully implemented
✅ **JWT token validation** with role extraction
✅ **Fine-grained access control** per endpoint
✅ **Immutable audit trail** for all admin actions
✅ **Middleware logging** automatic and transparent
✅ **Comprehensive error handling** with clear messages
✅ **All admin endpoints protected** with appropriate roles

**Next Steps:**
1. Run database migration to create `admin_action_logs` table
2. Update auth endpoints to include `role` in JWT tokens
3. Test all admin endpoints with different roles
4. Monitor `admin_action_logs` table for audit trail

---

**Built for Suraksha Weekly** • **Guidewire DEVTrails 2026** 🚀
