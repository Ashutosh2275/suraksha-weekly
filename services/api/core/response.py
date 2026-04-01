"""
Response conventions module for standardized API responses.

Provides:
- Generic SuccessResponse[T] for successful responses
- ErrorResponse for error responses
- ErrorCode enum for consistent error codes
- CorrelationMiddleware for correlation ID handling
- Custom exception handler for application exceptions
"""
from typing import TypeVar, Generic, Optional, Any
from datetime import datetime
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi import Request as FastAPIRequest, HTTPException
from fastapi.responses import JSONResponse as FastAPIJSONResponse


# ── Type variable for generic response ────────────────────────────────────────
T = TypeVar('T')


# ── Error codes enum ──────────────────────────────────────────────────────────
class ErrorCode(str, Enum):
    """Standard error codes for API responses."""
    
    # Authentication errors
    AUTH_FAILED = "AUTH_FAILED"
    OTP_EXPIRED = "OTP_EXPIRED"
    OTP_INVALID = "OTP_INVALID"
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Policy errors
    POLICY_NOT_FOUND = "POLICY_NOT_FOUND"
    POLICY_ALREADY_ACTIVE = "POLICY_ALREADY_ACTIVE"
    
    # Claim errors
    CLAIM_DUPLICATE = "CLAIM_DUPLICATE"
    CLAIM_INELIGIBLE = "CLAIM_INELIGIBLE"
    
    # Payout errors
    PAYOUT_FAILED = "PAYOUT_FAILED"
    
    # Fraud errors
    FRAUD_BLOCKED = "FRAUD_BLOCKED"
    
    # Generic errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"


# ── Response models ───────────────────────────────────────────────────────────
class SuccessResponse(BaseModel, Generic[T]):
    """
    Generic success response wrapper.
    
    Example:
        SuccessResponse[UserData](
            data=UserData(id="123", name="John"),
            correlation_id="abc-def-123"
        )
    
    Response:
        {
            "success": true,
            "data": {"id": "123", "name": "John"},
            "correlation_id": "abc-def-123",
            "timestamp": "2024-01-15T10:30:00.000Z"
        }
    """
    success: bool = Field(default=True, description="Always true for success responses")
    data: T = Field(..., description="Response payload")
    correlation_id: str = Field(..., description="Request correlation ID for tracing")
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z",
        description="ISO 8601 timestamp of the response"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"id": "123", "name": "Example"},
                "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
                "timestamp": "2024-01-15T10:30:00.000Z"
            }
        }


class ErrorResponse(BaseModel):
    """
    Standard error response model.
    
    Example:
        ErrorResponse(
            error_code=ErrorCode.AUTH_FAILED,
            message="Invalid or expired token",
            correlation_id="abc-def-123"
        )
    
    Response:
        {
            "success": false,
            "error_code": "AUTH_FAILED",
            "message": "Invalid or expired token",
            "details": null,
            "correlation_id": "abc-def-123"
        }
    """
    success: bool = Field(default=False, description="Always false for error responses")
    error_code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Additional error context")
    correlation_id: str = Field(..., description="Request correlation ID for tracing")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error_code": "AUTH_FAILED",
                "message": "Invalid or expired token",
                "details": None,
                "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


# ── Correlation middleware ────────────────────────────────────────────────────
class CorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that handles X-Correlation-ID for request tracing.
    
    Functionality:
    - Reads X-Correlation-ID from request header
    - Generates new UUID if header is missing
    - Stores in request.state.correlation_id
    - Echoes back in response header
    
    Usage:
        app.add_middleware(CorrelationMiddleware)
    
    Access in handlers:
        correlation_id = request.state.correlation_id
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and inject correlation ID."""
        
        # Read from header or generate new UUID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid4())
        
        # Store in request state for handlers to access
        request.state.correlation_id = correlation_id
        
        # Process request
        response = await call_next(request)
        
        # Echo back in response header
        response.headers["X-Correlation-ID"] = correlation_id
        
        return response


# ── Exception handler ─────────────────────────────────────────────────────────
def get_correlation_id(request: FastAPIRequest) -> str:
    """
    Extract correlation ID from request state.
    
    Args:
        request: FastAPI request object
    
    Returns:
        Correlation ID from request.state, or new UUID if not found
    """
    return getattr(request.state, "correlation_id", str(uuid4()))


async def application_exception_handler(
    request: FastAPIRequest,
    exc: Exception
) -> FastAPIJSONResponse:
    """
    Global exception handler that catches all application exceptions
    and returns standardized ErrorResponse.
    
    Handles:
    - HTTPException (FastAPI)
    - Custom application exceptions
    - Unexpected exceptions
    
    Args:
        request: FastAPI request object
        exc: Exception instance
    
    Returns:
        JSONResponse with ErrorResponse model
    """
    correlation_id = get_correlation_id(request)
    
    # Handle HTTPException
    if isinstance(exc, HTTPException):
        error_code = _map_status_to_error_code(exc.status_code)
        
        error_response = ErrorResponse(
            error_code=error_code,
            message=str(exc.detail),
            details=getattr(exc, "details", None),
            correlation_id=correlation_id
        )
        
        return FastAPIJSONResponse(
            status_code=exc.status_code,
            content=error_response.model_dump()
        )
    
    # Handle custom application exceptions with error_code attribute
    if hasattr(exc, "error_code"):
        status_code = getattr(exc, "status_code", 500)
        
        error_response = ErrorResponse(
            error_code=exc.error_code,
            message=str(exc),
            details=getattr(exc, "details", None),
            correlation_id=correlation_id
        )
        
        return FastAPIJSONResponse(
            status_code=status_code,
            content=error_response.model_dump()
        )
    
    # Handle unexpected exceptions
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Unexpected exception: {exc}", exc_info=True)
    
    error_response = ErrorResponse(
        error_code=ErrorCode.INTERNAL_ERROR,
        message="An internal error occurred",
        details={"exception_type": type(exc).__name__} if hasattr(exc, "__class__") else None,
        correlation_id=correlation_id
    )
    
    return FastAPIJSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )


def _map_status_to_error_code(status_code: int) -> str:
    """
    Map HTTP status code to ErrorCode enum value.
    
    Args:
        status_code: HTTP status code
    
    Returns:
        ErrorCode enum value as string
    """
    mapping = {
        400: ErrorCode.VALIDATION_ERROR,
        401: ErrorCode.UNAUTHORIZED,
        403: ErrorCode.FORBIDDEN,
        404: ErrorCode.NOT_FOUND,
        429: ErrorCode.RATE_LIMIT_EXCEEDED,
        500: ErrorCode.INTERNAL_ERROR,
    }
    
    return mapping.get(status_code, ErrorCode.INTERNAL_ERROR)


# ── Helper functions ──────────────────────────────────────────────────────────
def success_response(
    data: Any,
    correlation_id: Optional[str] = None
) -> dict:
    """
    Create a success response dictionary.
    
    Args:
        data: Response payload
        correlation_id: Optional correlation ID (will use current if not provided)
    
    Returns:
        Dictionary matching SuccessResponse structure
    
    Example:
        return success_response({"user_id": "123"}, correlation_id)
    """
    if correlation_id is None:
        correlation_id = str(uuid4())
    
    return {
        "success": True,
        "data": data,
        "correlation_id": correlation_id,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def error_response(
    error_code: ErrorCode,
    message: str,
    correlation_id: Optional[str] = None,
    details: Optional[dict] = None
) -> dict:
    """
    Create an error response dictionary.
    
    Args:
        error_code: ErrorCode enum value
        message: Human-readable error message
        correlation_id: Optional correlation ID (will use current if not provided)
        details: Optional additional error context
    
    Returns:
        Dictionary matching ErrorResponse structure
    
    Example:
        return error_response(
            ErrorCode.AUTH_FAILED,
            "Invalid token",
            correlation_id
        )
    """
    if correlation_id is None:
        correlation_id = str(uuid4())
    
    return {
        "success": False,
        "error_code": error_code.value if isinstance(error_code, ErrorCode) else error_code,
        "message": message,
        "details": details,
        "correlation_id": correlation_id
    }
