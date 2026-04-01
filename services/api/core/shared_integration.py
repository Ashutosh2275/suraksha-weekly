"""
Integration helpers to use shared fastapi_common utilities with existing API service.

This bridges the existing RequestIDMiddleware with the shared CorrelationIdMiddleware patterns.
"""
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from shared.fastapi_common.errors import (
    ErrorResponse,
    SuccessResponse,
    ServiceException,
    ValidationException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    create_error_response,
    create_success_response,
)

# The existing API already has RequestIDMiddleware which serves the same purpose
# as CorrelationIdMiddleware. We can use request.state.request_id to get the correlation ID.

def get_request_id_from_request(request) -> str:
    """Get correlation/request ID from the request state."""
    return getattr(request.state, 'request_id', '')


__all__ = [
    'ErrorResponse',
    'SuccessResponse',
    'ServiceException',
    'ValidationException',
    'NotFoundException',
    'UnauthorizedException',
    'ForbiddenException',
    'create_error_response',
    'create_success_response',
    'get_request_id_from_request',
]
