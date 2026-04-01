"""
Authentication and authorization dependencies.
"""
from pathlib import Path
import sys
from typing import Annotated, Optional
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
import logging

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from core.security import JWTHandler
from core.roles import Role
from shared.fastapi_common.errors import UnauthorizedException, ForbiddenException

logger = logging.getLogger(__name__)


class CurrentUser:
    """Current authenticated user with role."""
    
    def __init__(self, user_id: str, phone: str, role: Role):
        self.user_id = user_id
        self.phone = phone
        self.role = role
    
    def __str__(self) -> str:
        return f"User({self.user_id}, {self.role})"


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None
) -> CurrentUser:
    """
    Dependency that validates JWT token and returns current user with role.
    
    Reads Bearer token from Authorization header, validates JWT signature
    and expiry, and returns the current user with their role.
    
    Raises:
        UnauthorizedException: If token is missing, invalid, or expired (AUTH_FAILED)
    
    Returns:
        CurrentUser: Current authenticated user with role
    """
    # Check if Authorization header exists
    if not authorization:
        logger.warning("Missing Authorization header")
        raise UnauthorizedException(
            message="Authorization header required",
            error_code="AUTH_FAILED"
        )
    
    # Extract Bearer token
    if not authorization.startswith("Bearer "):
        logger.warning("Invalid Authorization header format")
        raise UnauthorizedException(
            message="Invalid Authorization header format. Expected 'Bearer <token>'",
            error_code="AUTH_FAILED"
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify JWT token
    try:
        payload = JWTHandler.verify_token(token)
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise UnauthorizedException(
            message="Invalid or expired token",
            error_code="AUTH_FAILED"
        )
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {e}")
        raise UnauthorizedException(
            message="Token verification failed",
            error_code="AUTH_FAILED"
        )
    
    # Extract user information from payload
    user_id = payload.get("sub") or payload.get("worker_id") or payload.get("user_id")
    if not user_id:
        logger.warning("Token missing user identifier")
        raise UnauthorizedException(
            message="Invalid token: missing user identifier",
            error_code="AUTH_FAILED"
        )
    
    phone = payload.get("phone", "")
    
    # Extract role from payload (default to WORKER if not specified)
    role_str = payload.get("role", Role.WORKER.value)
    try:
        role = Role(role_str)
    except ValueError:
        logger.warning(f"Invalid role in token: {role_str}")
        # Default to WORKER for invalid roles
        role = Role.WORKER
    
    logger.debug(f"Authenticated user: {user_id} with role: {role}")
    
    return CurrentUser(user_id=str(user_id), phone=phone, role=role)


def require_role(*allowed_roles: Role):
    """
    Dependency factory that creates a role-checking dependency.
    
    Wraps get_current_user and validates that the user's role is in the
    allowed roles list. Raises HTTP 403 FORBIDDEN if user role is not allowed.
    
    Args:
        *allowed_roles: Variable number of Role enum values that are allowed
    
    Returns:
        Callable dependency that returns CurrentUser if authorized
    
    Raises:
        ForbiddenException: If user role not in allowed_roles (FORBIDDEN)
    
    Example:
        @router.get("/admin/dashboard", dependencies=[Depends(require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN))])
        async def admin_dashboard():
            return {"message": "Admin dashboard"}
    """
    async def role_checker(
        current_user: Annotated[CurrentUser, Depends(get_current_user)]
    ) -> CurrentUser:
        """Check if current user has required role."""
        
        if current_user.role not in allowed_roles:
            logger.warning(
                f"Access denied for user {current_user.user_id} "
                f"with role {current_user.role}. Required: {allowed_roles}"
            )
            raise ForbiddenException(
                message=f"Access denied. Required role: {', '.join(r.value for r in allowed_roles)}",
                error_code="FORBIDDEN"
            )
        
        logger.debug(f"Role check passed for user {current_user.user_id}")
        return current_user
    
    return role_checker


# Convenience dependencies for common role combinations
require_admin = require_role(Role.RISK_ADMIN, Role.PLATFORM_ADMIN)
require_reviewer = require_role(Role.REVIEWER, Role.RISK_ADMIN, Role.PLATFORM_ADMIN)
require_platform_admin = require_role(Role.PLATFORM_ADMIN)
require_risk_admin = require_role(Role.RISK_ADMIN)
