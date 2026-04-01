"""
Example router demonstrating response conventions usage.

This router shows how to use:
- SuccessResponse[T] for typed success responses
- ErrorResponse for error responses
- ErrorCode enum for consistent error codes
- Correlation ID from request state
"""
from typing import List
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from core.response import (
    SuccessResponse,
    ErrorResponse,
    ErrorCode,
    get_correlation_id,
    success_response,
    error_response
)

router = APIRouter(prefix="/examples", tags=["Examples"])


# ── Example data models ───────────────────────────────────────────────────────
class UserData(BaseModel):
    """Example user data model."""
    id: str
    name: str
    email: str


class CreateUserRequest(BaseModel):
    """Example create user request."""
    name: str
    email: str


# ── Example endpoints ─────────────────────────────────────────────────────────

@router.get(
    "/user/{user_id}",
    response_model=SuccessResponse[UserData],
    summary="Get user by ID (success response example)",
    description="Demonstrates SuccessResponse[T] with typed data"
)
async def get_user(user_id: str, request: Request):
    """
    Get user by ID - demonstrates success response.
    
    Returns SuccessResponse[UserData] with:
    - success: true
    - data: UserData object
    - correlation_id: from request state
    - timestamp: ISO 8601
    """
    correlation_id = get_correlation_id(request)
    
    # Simulate user lookup
    user = UserData(
        id=user_id,
        name="John Doe",
        email="john@example.com"
    )
    
    return SuccessResponse[UserData](
        data=user,
        correlation_id=correlation_id
    )


@router.get(
    "/users",
    response_model=SuccessResponse[List[UserData]],
    summary="List users (success response with list)",
    description="Demonstrates SuccessResponse with list of items"
)
async def list_users(request: Request):
    """
    List users - demonstrates success response with list.
    
    Returns SuccessResponse[List[UserData]] with array of users.
    """
    correlation_id = get_correlation_id(request)
    
    # Simulate user list
    users = [
        UserData(id="1", name="John Doe", email="john@example.com"),
        UserData(id="2", name="Jane Smith", email="jane@example.com"),
    ]
    
    return SuccessResponse[List[UserData]](
        data=users,
        correlation_id=correlation_id
    )


@router.post(
    "/users",
    response_model=SuccessResponse[UserData],
    status_code=201,
    summary="Create user (success response example)",
    description="Demonstrates creating resource with SuccessResponse"
)
async def create_user(body: CreateUserRequest, request: Request):
    """
    Create user - demonstrates success response for POST.
    
    Returns 201 with SuccessResponse[UserData].
    """
    correlation_id = get_correlation_id(request)
    
    # Simulate user creation
    user = UserData(
        id="new-123",
        name=body.name,
        email=body.email
    )
    
    return SuccessResponse[UserData](
        data=user,
        correlation_id=correlation_id
    )


@router.get(
    "/error/not-found",
    responses={
        404: {"model": ErrorResponse}
    },
    summary="Not found error example",
    description="Demonstrates error response with HTTPException"
)
async def not_found_error(request: Request):
    """
    Trigger not found error - demonstrates HTTPException handling.
    
    The global exception handler will convert this to ErrorResponse:
    - success: false
    - error_code: NOT_FOUND
    - message: User not found
    - correlation_id: from request state
    """
    raise HTTPException(
        status_code=404,
        detail="User not found"
    )


@router.get(
    "/error/validation",
    responses={
        400: {"model": ErrorResponse}
    },
    summary="Validation error example",
    description="Demonstrates validation error response"
)
async def validation_error(request: Request):
    """
    Trigger validation error - demonstrates custom error.
    
    The global exception handler will convert this to ErrorResponse.
    """
    raise HTTPException(
        status_code=400,
        detail="Invalid email format"
    )


@router.get(
    "/error/auth",
    responses={
        401: {"model": ErrorResponse}
    },
    summary="Authentication error example",
    description="Demonstrates auth error response"
)
async def auth_error(request: Request):
    """
    Trigger auth error - demonstrates AUTH_FAILED error code.
    
    The global exception handler will convert this to ErrorResponse with
    error_code: AUTH_FAILED.
    """
    raise HTTPException(
        status_code=401,
        detail="Invalid or expired token"
    )


@router.get(
    "/error/rate-limit",
    responses={
        429: {"model": ErrorResponse}
    },
    summary="Rate limit error example",
    description="Demonstrates rate limit error response"
)
async def rate_limit_error(request: Request):
    """
    Trigger rate limit error - demonstrates RATE_LIMIT_EXCEEDED error code.
    
    The global exception handler will convert this to ErrorResponse with
    error_code: RATE_LIMIT_EXCEEDED.
    """
    raise HTTPException(
        status_code=429,
        detail="Too many requests"
    )


@router.get(
    "/error/internal",
    responses={
        500: {"model": ErrorResponse}
    },
    summary="Internal error example",
    description="Demonstrates internal error handling"
)
async def internal_error(request: Request):
    """
    Trigger internal error - demonstrates unexpected exception handling.
    
    The global exception handler will catch this and return ErrorResponse with
    error_code: INTERNAL_ERROR and log the exception.
    """
    # Simulate unexpected error
    raise ValueError("Something went wrong internally")


@router.get(
    "/correlation-id",
    summary="Get correlation ID",
    description="Returns the current request's correlation ID"
)
async def get_correlation(request: Request):
    """
    Get correlation ID - demonstrates accessing correlation_id from request state.
    
    Returns the correlation ID that was either:
    - Provided in X-Correlation-ID header
    - Auto-generated by CorrelationMiddleware
    """
    correlation_id = get_correlation_id(request)
    
    return {
        "correlation_id": correlation_id,
        "message": "Correlation ID successfully retrieved",
        "note": "This ID is also in the X-Correlation-ID response header"
    }


@router.get(
    "/helper/success",
    summary="Success helper example",
    description="Demonstrates success_response helper function"
)
async def success_helper(request: Request):
    """
    Success helper - demonstrates success_response() helper function.
    
    Uses the helper function instead of direct model instantiation.
    """
    correlation_id = get_correlation_id(request)
    
    data = {
        "id": "123",
        "status": "active",
        "count": 42
    }
    
    return success_response(data, correlation_id)


@router.get(
    "/helper/error",
    responses={
        404: {"model": ErrorResponse}
    },
    summary="Error helper example",
    description="Demonstrates error_response helper function"
)
async def error_helper(request: Request):
    """
    Error helper - demonstrates error_response() helper function.
    
    Uses the helper function to create error response dictionary.
    """
    correlation_id = get_correlation_id(request)
    
    # This would typically be raised as HTTPException,
    # but showing manual error response creation
    return error_response(
        error_code=ErrorCode.NOT_FOUND,
        message="Resource not found",
        correlation_id=correlation_id,
        details={"resource_id": "123", "resource_type": "user"}
    )
