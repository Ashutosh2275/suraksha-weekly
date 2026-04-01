"""Centralized error response models and utilities."""

from typing import Optional, Any, Dict
from pydantic import BaseModel, Field
from fastapi import HTTPException
from fastapi.responses import JSONResponse


class ErrorResponse(BaseModel):
    """Standardized error response model."""
    
    success: bool = Field(False, description="Always false for error responses")
    error_code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    correlation_id: str = Field(..., description="Correlation ID for request tracing")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class SuccessResponse(BaseModel):
    """Standardized success response model."""
    
    success: bool = Field(True, description="Always true for success responses")
    data: Any = Field(..., description="Response data")
    correlation_id: Optional[str] = Field(None, description="Correlation ID for request tracing")


class ServiceException(Exception):
    """Base exception for service errors."""
    
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationException(ServiceException):
    """Exception for validation errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="VALIDATION_ERROR",
            message=message,
            status_code=400,
            details=details
        )


class NotFoundException(ServiceException):
    """Exception for resource not found errors."""
    
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            error_code="NOT_FOUND",
            message=f"{resource} with id '{resource_id}' not found",
            status_code=404
        )


class UnauthorizedException(ServiceException):
    """Exception for authentication errors."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            error_code="UNAUTHORIZED",
            message=message,
            status_code=401
        )


class ForbiddenException(ServiceException):
    """Exception for authorization errors."""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            error_code="FORBIDDEN",
            message=message,
            status_code=403
        )


def create_error_response(
    error_code: str,
    message: str,
    correlation_id: str,
    details: Optional[Dict[str, Any]] = None
) -> ErrorResponse:
    """Create a standardized error response."""
    return ErrorResponse(
        error_code=error_code,
        message=message,
        correlation_id=correlation_id,
        details=details
    )


def create_success_response(data: Any, correlation_id: Optional[str] = None) -> SuccessResponse:
    """Create a standardized success response."""
    return SuccessResponse(
        data=data,
        correlation_id=correlation_id
    )


async def service_exception_handler(request, exc: ServiceException):
    """Exception handler for ServiceException and its subclasses."""
    from .middleware import get_correlation_id
    
    correlation_id = get_correlation_id()
    
    error_response = create_error_response(
        error_code=exc.error_code,
        message=exc.message,
        correlation_id=correlation_id,
        details=exc.details
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


async def generic_exception_handler(request, exc: Exception):
    """Handler for unexpected exceptions."""
    from .middleware import get_correlation_id
    
    correlation_id = get_correlation_id()
    
    error_response = create_error_response(
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred",
        correlation_id=correlation_id,
        details={"error": str(exc)} if hasattr(exc, '__str__') else None
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )
