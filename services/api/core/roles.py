"""
Role-based authorization models and enums.
"""
from enum import Enum


class Role(str, Enum):
    """User roles for authorization."""
    
    WORKER = "worker"
    REVIEWER = "reviewer"
    RISK_ADMIN = "risk_admin"
    PLATFORM_ADMIN = "platform_admin"
    
    def __str__(self) -> str:
        return self.value
