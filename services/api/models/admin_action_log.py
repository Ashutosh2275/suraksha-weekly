"""
Admin action log model for immutable audit trail.
"""
from sqlalchemy import Column, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from models import Base


class AdminActionLog(Base):
    """
    Immutable audit log for all admin actions.
    
    Records all requests made by RISK_ADMIN and PLATFORM_ADMIN roles.
    This table is INSERT-only - no UPDATE or DELETE operations allowed.
    """
    
    __tablename__ = "admin_action_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False, index=True)
    action = Column(String(500), nullable=False)  # METHOD + PATH
    request_body_hash = Column(String(64), nullable=True)  # SHA256 hash
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Optional: store correlation ID for request tracing
    correlation_id = Column(String(100), nullable=True)
    
    # Optional: store response status for success/failure tracking
    response_status = Column(String(10), nullable=True)
    
    __table_args__ = (
        Index('idx_admin_action_logs_user_id', 'user_id'),
        Index('idx_admin_action_logs_role', 'role'),
        Index('idx_admin_action_logs_timestamp', 'timestamp'),
        Index('idx_admin_action_logs_user_timestamp', 'user_id', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<AdminActionLog {self.id} {self.user_id} {self.action}>"
