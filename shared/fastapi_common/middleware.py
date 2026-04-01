"""Correlation ID middleware for request tracing."""

import uuid
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from contextvars import ContextVar

# Context variable to store correlation ID for the current request
correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='')


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that generates or extracts correlation IDs for request tracing.
    
    - Checks for existing X-Correlation-ID header in incoming requests
    - Generates a new UUID if not present
    - Stores correlation ID in context variable for access anywhere in the request
    - Adds X-Correlation-ID header to all responses
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate correlation ID
        correlation_id = request.headers.get('X-Correlation-ID')
        
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        # Store in context variable
        correlation_id_var.set(correlation_id)
        
        # Add to request state for easy access in route handlers
        request.state.correlation_id = correlation_id
        
        # Process request
        response = await call_next(request)
        
        # Add correlation ID to response headers
        response.headers['X-Correlation-ID'] = correlation_id
        
        return response


def get_correlation_id() -> str:
    """
    Get the correlation ID for the current request context.
    
    Returns:
        The correlation ID string, or empty string if not in a request context
    """
    return correlation_id_var.get()
