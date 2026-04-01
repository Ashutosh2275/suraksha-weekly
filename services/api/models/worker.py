"""
Worker database model.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from models import Base


class Worker(Base):
    """Worker model for authentication and profile."""
    
    __tablename__ = "workers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('idx_workers_phone', 'phone'),
        Index('idx_workers_is_active', 'is_active'),
    )
    
    def __repr__(self):
        return f"<Worker {self.id} {self.phone}>"


class WorkerSession(Base):
    """Worker session model for tracking logins and devices."""
    
    __tablename__ = "worker_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    worker_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    device_id = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_worker_sessions_worker_id', 'worker_id'),
        Index('idx_worker_sessions_device_id', 'device_id'),
        Index('idx_worker_sessions_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<WorkerSession {self.id} worker={self.worker_id} device={self.device_id}>"
