# Response Conventions Module

## Overview

A comprehensive response conventions module for standardized API responses across the Suraksha Weekly FastAPI backend. Provides consistent response formats, error handling, and correlation ID tracking.

---

## Components

### 1. Generic SuccessResponse[T]

**File:** `core/response.py`

**Purpose:** Generic success response wrapper with type safety.

**Structure:**
```python
class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True              # Always true for success
    data: T                           # Typed response payload
    correlation_id: str               # Request correlation ID
    timestamp: str                    # ISO 8601 timestamp
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Usage:**
```python
from core.response import SuccessResponse, get_correlation_id

@router.get("/user/{id}", response_model=SuccessResponse[UserData])
async def get_user(id: str, request: Request):
    correlation_id = get_correlation_id(request)
    
    user = UserData(id=id, name="John")
    
    return SuccessResponse[UserData](
        data=user,
        correlation_id=correlation_id
    )
```

---

### 2. ErrorResponse

**File:** `core/response.py`

**Purpose:** Standard error response model.

**Structure:**
```python
class ErrorResponse(BaseModel):
    success: bool = False             # Always false for errors
    error_code: str                   # Machine-readable error code
    message: str                      # Human-readable message
    details: Optional[dict] = None    # Additional context
    correlation_id: str               # Request correlation ID
```

**Example Response:**
```json
{
  "success": false,
  "error_code": "AUTH_FAILED",
  "message": "Invalid or expired token",
  "details": null,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Usage:**
```python
from core.response import ErrorResponse

@router.get("/protected", responses={401: {"model": ErrorResponse}})
async def protected_route():
    raise HTTPException(status_code=401, detail="Invalid token")
    # Automatically converted to ErrorResponse by exception handler
```

---

### 3. ErrorCode Enum

**File:** `core/response.py`

**Purpose:** Standard error codes for consistent API responses.

**Defined Codes:**
```python
class ErrorCode(str, Enum):
    # Authentication
    AUTH_FAILED = "AUTH_FAILED"
    OTP_EXPIRED = "OTP_EXPIRED"
    OTP_INVALID = "OTP_INVALID"
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Policy
    POLICY_NOT_FOUND = "POLICY_NOT_FOUND"
    POLICY_ALREADY_ACTIVE = "POLICY_ALREADY_ACTIVE"
    
    # Claim
    CLAIM_DUPLICATE = "CLAIM_DUPLICATE"
    CLAIM_INELIGIBLE = "CLAIM_INELIGIBLE"
    
    # Payout
    PAYOUT_FAILED = "PAYOUT_FAILED"
    
    # Fraud
    FRAUD_BLOCKED = "FRAUD_BLOCKED"
    
    # Generic
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
```

**Usage:**
```python
from core.response import ErrorCode

# In exception handling
error_code = ErrorCode.AUTH_FAILED

# In custom exceptions
raise CustomException(error_code=ErrorCode.POLICY_NOT_FOUND)
```

---

### 4. CorrelationMiddleware

**File:** `core/response.py`

**Purpose:** Handles X-Correlation-ID header for distributed tracing.

**Functionality:**
- Reads `X-Correlation-ID` from request header
- Generates new UUID if header is missing
- Stores in `request.state.correlation_id`
- Echoes back in response header

**Registration:**
```python
# In app.py
from core.response import CorrelationMiddleware

app.add_middleware(CorrelationMiddleware)
```

**Access in Handlers:**
```python
from core.response import get_correlation_id

@router.get("/endpoint")
async def handler(request: Request):
    correlation_id = get_correlation_id(request)
    # Use correlation_id in response
```

**Request/Response:**
```bash
# Request with correlation ID
curl -H "X-Correlation-ID: abc-123" http://localhost:8000/endpoint

# Response includes same ID
X-Correlation-ID: abc-123

# Request without correlation ID
curl http://localhost:8000/endpoint

# Response includes auto-generated ID
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

---

### 5. Global Exception Handler

**File:** `core/response.py`

**Function:** `application_exception_handler(request, exc)`

**Purpose:** Catches all application exceptions and returns standardized ErrorResponse.

**Handles:**
1. **HTTPException** - FastAPI HTTP exceptions
2. **Custom Exceptions** - Exceptions with `error_code` attribute
3. **Unexpected Exceptions** - Any other exceptions (logs and returns INTERNAL_ERROR)

**Registration:**
```python
# In app.py
from core.response import application_exception_handler

app.add_exception_handler(Exception, application_exception_handler)
```

**Behavior:**

#### HTTPException
```python
raise HTTPException(status_code=404, detail="User not found")

# Converted to:
{
  "success": false,
  "error_code": "NOT_FOUND",      # Mapped from status code
  "message": "User not found",
  "details": null,
  "correlation_id": "..."
}
```

#### Custom Exception with error_code
```python
class PolicyException(Exception):
    def __init__(self, message: str):
        self.error_code = "POLICY_NOT_FOUND"
        self.status_code = 404
        super().__init__(message)

raise PolicyException("Policy XYZ not found")

# Converted to:
{
  "success": false,
  "error_code": "POLICY_NOT_FOUND",
  "message": "Policy XYZ not found",
  "details": null,
  "correlation_id": "..."
}
```

#### Unexpected Exception
```python
# Any unexpected error
raise ValueError("Something went wrong")

# Converted to:
{
  "success": false,
  "error_code": "INTERNAL_ERROR",
  "message": "An internal error occurred",
  "details": {"exception_type": "ValueError"},
  "correlation_id": "..."
}
```

---

## Helper Functions

### success_response()

**Purpose:** Create success response dictionary without model instantiation.

**Signature:**
```python
def success_response(
    data: Any,
    correlation_id: Optional[str] = None
) -> dict
```

**Usage:**
```python
from core.response import success_response, get_correlation_id

@router.get("/endpoint")
async def handler(request: Request):
    correlation_id = get_correlation_id(request)
    
    return success_response(
        data={"id": "123", "status": "active"},
        correlation_id=correlation_id
    )
```

---

### error_response()

**Purpose:** Create error response dictionary without model instantiation.

**Signature:**
```python
def error_response(
    error_code: ErrorCode,
    message: str,
    correlation_id: Optional[str] = None,
    details: Optional[dict] = None
) -> dict
```

**Usage:**
```python
from core.response import error_response, ErrorCode, get_correlation_id

@router.get("/endpoint")
async def handler(request: Request):
    correlation_id = get_correlation_id(request)
    
    return error_response(
        error_code=ErrorCode.NOT_FOUND,
        message="Resource not found",
        correlation_id=correlation_id,
        details={"resource_id": "123"}
    )
```

---

### get_correlation_id()

**Purpose:** Extract correlation ID from request state.

**Signature:**
```python
def get_correlation_id(request: Request) -> str
```

**Usage:**
```python
from core.response import get_correlation_id

@router.get("/endpoint")
async def handler(request: Request):
    correlation_id = get_correlation_id(request)
    # Always returns a valid UUID string
```

---

## Integration Guide

### Step 1: Middleware Stack (Already Done)

The middleware and exception handler are registered in `app.py`:

```python
# Exception handlers
app.add_exception_handler(Exception, application_exception_handler)
app.add_exception_handler(HTTPException, _http_exception_handler)

# Middleware (order matters)
app.add_middleware(PerformanceLoggingMiddleware)
app.add_middleware(AdminActionLoggerMiddleware)
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(TrustedHostMiddleware, ...)
app.add_middleware(CorrelationMiddleware)
app.add_middleware(RequestIDMiddleware)
```

**Middleware Execution Order:**
1. RequestIDMiddleware (outermost)
2. CorrelationMiddleware
3. TrustedHostMiddleware
4. CORSMiddleware
5. AdminActionLoggerMiddleware
6. PerformanceLoggingMiddleware (innermost)

---

### Step 2: Update Existing Routes

#### Before:
```python
@router.get("/user/{id}")
async def get_user(id: str):
    user = get_user_from_db(id)
    return {"id": user.id, "name": user.name}
```

#### After:
```python
from core.response import SuccessResponse, get_correlation_id

@router.get("/user/{id}", response_model=SuccessResponse[UserData])
async def get_user(id: str, request: Request):
    correlation_id = get_correlation_id(request)
    
    user = get_user_from_db(id)
    user_data = UserData(id=user.id, name=user.name)
    
    return SuccessResponse[UserData](
        data=user_data,
        correlation_id=correlation_id
    )
```

---

### Step 3: Error Handling

#### Before:
```python
@router.get("/user/{id}")
async def get_user(id: str):
    user = get_user_from_db(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

#### After:
```python
from core.response import SuccessResponse, ErrorResponse, get_correlation_id

@router.get(
    "/user/{id}",
    response_model=SuccessResponse[UserData],
    responses={404: {"model": ErrorResponse}}
)
async def get_user(id: str, request: Request):
    correlation_id = get_correlation_id(request)
    
    user = get_user_from_db(id)
    if not user:
        # HTTPException automatically converted to ErrorResponse
        raise HTTPException(status_code=404, detail="User not found")
    
    return SuccessResponse[UserData](
        data=UserData.from_orm(user),
        correlation_id=correlation_id
    )
```

---

## Usage Patterns

### Pattern 1: Simple GET with Success Response

```python
@router.get("/policy/{id}", response_model=SuccessResponse[PolicyData])
async def get_policy(id: str, request: Request):
    correlation_id = get_correlation_id(request)
    
    policy = await get_policy_from_db(id)
    
    return SuccessResponse[PolicyData](
        data=PolicyData.from_orm(policy),
        correlation_id=correlation_id
    )
```

---

### Pattern 2: List Endpoint with Success Response

```python
@router.get("/policies", response_model=SuccessResponse[List[PolicyData]])
async def list_policies(request: Request):
    correlation_id = get_correlation_id(request)
    
    policies = await get_policies_from_db()
    policy_list = [PolicyData.from_orm(p) for p in policies]
    
    return SuccessResponse[List[PolicyData]](
        data=policy_list,
        correlation_id=correlation_id
    )
```

---

### Pattern 3: POST with 201 Created

```python
@router.post(
    "/policy",
    response_model=SuccessResponse[PolicyData],
    status_code=201
)
async def create_policy(
    body: CreatePolicyRequest,
    request: Request
):
    correlation_id = get_correlation_id(request)
    
    policy = await create_policy_in_db(body)
    
    return SuccessResponse[PolicyData](
        data=PolicyData.from_orm(policy),
        correlation_id=correlation_id
    )
```

---

### Pattern 4: Error Handling with Details

```python
@router.post(
    "/claim",
    response_model=SuccessResponse[ClaimData],
    responses={
        400: {"model": ErrorResponse},
        409: {"model": ErrorResponse}
    }
)
async def create_claim(
    body: CreateClaimRequest,
    request: Request
):
    correlation_id = get_correlation_id(request)
    
    # Check for duplicate
    if await claim_exists(body.policy_id, body.trigger_id):
        raise HTTPException(
            status_code=409,
            detail="Claim already exists for this trigger"
        )
    
    # Create claim
    claim = await create_claim_in_db(body)
    
    return SuccessResponse[ClaimData](
        data=ClaimData.from_orm(claim),
        correlation_id=correlation_id
    )
```

---

### Pattern 5: Custom Error Codes

```python
from core.response import ErrorCode

class ClaimException(Exception):
    """Custom claim exception with error code."""
    
    def __init__(self, message: str, error_code: ErrorCode, details: dict = None):
        self.error_code = error_code.value
        self.status_code = 400
        self.details = details
        super().__init__(message)


@router.post("/claim")
async def create_claim(body: CreateClaimRequest):
    # Validate claim eligibility
    if not is_claim_eligible(body):
        raise ClaimException(
            message="Claim is not eligible for payout",
            error_code=ErrorCode.CLAIM_INELIGIBLE,
            details={"reason": "trigger_type_excluded"}
        )
    
    # Exception automatically converted to ErrorResponse with
    # error_code: CLAIM_INELIGIBLE
```

---

## Testing

### Test Success Response

```python
import pytest
from fastapi.testclient import TestClient

def test_get_user_success(client: TestClient):
    response = client.get("/user/123")
    
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] == True
    assert "data" in data
    assert "correlation_id" in data
    assert "timestamp" in data
    
    # Check correlation_id in header
    assert "X-Correlation-ID" in response.headers
    assert response.headers["X-Correlation-ID"] == data["correlation_id"]
```

---

### Test Error Response

```python
def test_user_not_found(client: TestClient):
    response = client.get("/user/nonexistent")
    
    assert response.status_code == 404
    
    data = response.json()
    assert data["success"] == False
    assert data["error_code"] == "NOT_FOUND"
    assert "message" in data
    assert "correlation_id" in data
    
    # Check correlation_id in header
    assert "X-Correlation-ID" in response.headers
```

---

### Test Correlation ID

```python
def test_correlation_id_provided(client: TestClient):
    headers = {"X-Correlation-ID": "test-123"}
    response = client.get("/user/123", headers=headers)
    
    assert response.status_code == 200
    
    # Same correlation ID echoed back
    assert response.headers["X-Correlation-ID"] == "test-123"
    assert response.json()["correlation_id"] == "test-123"


def test_correlation_id_generated(client: TestClient):
    response = client.get("/user/123")
    
    assert response.status_code == 200
    
    # Correlation ID auto-generated
    correlation_id = response.headers["X-Correlation-ID"]
    assert correlation_id is not None
    assert len(correlation_id) > 0
    assert response.json()["correlation_id"] == correlation_id
```

---

## Example Router

A complete example router is available at:
**`routers/examples_response.py`**

Includes examples of:
- SuccessResponse with single object
- SuccessResponse with list
- POST with 201 Created
- Various error responses (404, 400, 401, 429, 500)
- Helper function usage
- Correlation ID access

**Test the examples:**
```bash
# Success response
curl http://localhost:8000/examples/user/123

# List response
curl http://localhost:8000/examples/users

# Error responses
curl http://localhost:8000/examples/error/not-found
curl http://localhost:8000/examples/error/validation
curl http://localhost:8000/examples/error/auth

# Correlation ID
curl http://localhost:8000/examples/correlation-id
curl -H "X-Correlation-ID: my-id-123" http://localhost:8000/examples/correlation-id
```

---

## Summary

### Files Created
1. ✅ `core/response.py` - Complete response conventions module
2. ✅ `routers/examples_response.py` - Example router with all patterns
3. ✅ `RESPONSE_CONVENTIONS.md` - This documentation

### Files Modified
1. ✅ `app.py` - Registered middleware and exception handler

### Features Delivered
✅ Generic `SuccessResponse[T]` with type safety
✅ `ErrorResponse` model for consistent errors
✅ `ErrorCode` enum with all requested codes
✅ `CorrelationMiddleware` for X-Correlation-ID handling
✅ Global exception handler for all exceptions
✅ Helper functions for easy response creation
✅ Complete documentation with examples
✅ Example router demonstrating all patterns

---

**Status:** ✅ **Complete and Ready to Use**

All components are implemented, integrated, and documented!

**Built for Suraksha Weekly** • **Guidewire DEVTrails 2026** 🚀
