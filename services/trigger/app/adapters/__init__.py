"""Trigger ingestion adapters."""

from .base import TriggerAdapter, TriggerReading
from .factory import TriggerAdapterFactory
from .mock import MockAdapter
from .openaq import OpenAQAdapter
from .openweather import OpenWeatherAdapter

__all__ = [
    "TriggerAdapter",
    "TriggerReading",
    "TriggerAdapterFactory",
    "MockAdapter",
    "OpenAQAdapter",
    "OpenWeatherAdapter",
]
