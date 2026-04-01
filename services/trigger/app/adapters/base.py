"""Base adapter contracts for trigger ingestion."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class TriggerReading(BaseModel):
    """Canonical adapter reading payload."""

    zone_id: str
    source: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_data: dict[str, Any]
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TriggerAdapter(ABC):
    """Abstract trigger adapter."""

    @abstractmethod
    async def fetch(self, zone_id: str) -> TriggerReading | None:
        """Fetch latest trigger reading for a zone."""
