"""
Admin action logging middleware.

Intercepts all requests from RISK_ADMIN and PLATFORM_ADMIN roles and writes
immutable audit entries to the admin_action_log table.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import logging
from typing import Callable

from core.database import DatabaseManager
from core.roles import Role
from core.security import JWTHandler
from models.admin_action_log import AdminActionLog

logger = logging.getLogger(__name__)


class AdminActionLoggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all admin actions to an immutable audit table.
    
    Intercepts requests from RISK_ADMIN and PLATFORM_ADMIN roles and writes
    audit entries with:
    - user_id, role
    - action (HTTP method + path)
    - request body hash (SHA256)
    - IP address
    - timestamp
    
    This is an INSERT-only table - no UPDATE or DELETE operations.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log if user is an admin.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
        
        Returns:
            Response from the application
        """
        # Extract user info from Authorization header
        user_id = None
        role = None
        
        authorization = request.headers.get("authorization", "")
        if authorization.startswith("Bearer "):
            token = authorization[7:]
            try:
                # Verify token and extract user info
                payload = JWTHandler.verify_token(token)
                user_id = payload.get("sub") or payload.get("worker_id") or payload.get("user_id")
                role_str = payload.get("role", Role.WORKER.value)
                
                try:
                    role = Role(role_str)
                except ValueError:
                    role = Role.WORKER
            except Exception as e:
                # Token verification failed - continue without logging
                logger.debug(f"Token verification failed in middleware: {e}")
        
        # Process the request
        response = await call_next(request)
        
        # Log only if user is RISK_ADMIN or PLATFORM_ADMIN
        if role in [Role.RISK_ADMIN, Role.PLATFORM_ADMIN] and user_id:
            try:
                await self._log_admin_action(
                    request=request,
                    response=response,
                    user_id=user_id,
                    role=role
                )
            except Exception as e:
                # Never fail the request due to logging errors
                logger.error(f"Failed to log admin action: {e}", exc_info=True)
        
        return response
    
    async def _log_admin_action(
        self,
        request: Request,
        response: Response,
        user_id: str,
        role: Role
    ) -> None:
        """
        Write audit log entry to database.
        
        Args:
            request: HTTP request
            response: HTTP response
            user_id: User identifier
            role: User role (RISK_ADMIN or PLATFORM_ADMIN)
        """
        # Build action string (METHOD + PATH)
        method = request.method
        path = request.url.path
        action = f"{method} {path}"
        
        # Hash request body if present
        request_body_hash = None
        if hasattr(request.state, "_body"):
            # Body was already read
            body = request.state._body
            if body:
                request_body_hash = hashlib.sha256(body).hexdigest()
        
        # Extract IP address
        ip_address = request.client.host if request.client else None
        
        # Extract correlation ID if present
        correlation_id = getattr(request.state, "request_id", None)
        
        # Get response status
        response_status = str(response.status_code)
        
        # Create audit log entry
        log_entry = AdminActionLog(
            user_id=user_id,
            role=role.value,
            action=action,
            request_body_hash=request_body_hash,
            ip_address=ip_address,
            correlation_id=correlation_id,
            response_status=response_status
        )
        
        # Write to database (INSERT only, never UPDATE/DELETE)
        try:
            async for session in DatabaseManager.get_session():
                session.add(log_entry)
                await session.commit()
                logger.info(
                    f"Admin action logged: {action} by {user_id} ({role.value}) "
                    f"- Status: {response_status}"
                )
                break  # Only need one iteration
        except Exception as e:
            logger.error(f"Failed to write admin action log to database: {e}", exc_info=True)
