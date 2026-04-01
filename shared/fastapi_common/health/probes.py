from __future__ import annotations

import asyncio
import time
from dataclasses import asdict, dataclass
from threading import Lock
from typing import Any, Awaitable, Callable

import httpx


@dataclass
class CheckResult:
    name: str
    status: str
    latency_ms: float | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        if self.latency_ms is None:
            payload.pop("latency_ms", None)
        return payload


class DegradedModeManager:
    _instance: "DegradedModeManager | None" = None
    _instance_lock: Lock = Lock()

    def __init__(self) -> None:
        self._reasons: set[str] = set()
        self._lock = Lock()

    @classmethod
    def get_instance(cls) -> "DegradedModeManager":
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def register_reason(self, reason: str) -> None:
        if not reason:
            return
        with self._lock:
            self._reasons.add(reason)

    def clear_reason(self, reason: str) -> None:
        with self._lock:
            self._reasons.discard(reason)

    def clear_all(self) -> None:
        with self._lock:
            self._reasons.clear()

    def list_reasons(self) -> list[str]:
        with self._lock:
            return sorted(self._reasons)


def get_degraded_mode_manager() -> DegradedModeManager:
    return DegradedModeManager.get_instance()


class HealthChecker:
    def __init__(
        self,
        *,
        database_probe: Callable[[], Awaitable[None]] | None = None,
        redis_client: Any | None = None,
        queue_probe: Callable[[], Awaitable[bool]] | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._database_probe = database_probe
        self._redis_client = redis_client
        self._queue_probe = queue_probe
        self._http_client = http_client

    async def check_database(self) -> CheckResult:
        start = time.perf_counter()
        if self._database_probe is None:
            return CheckResult(name="database", status="fail", latency_ms=0.0)
        try:
            await self._database_probe()
            latency = (time.perf_counter() - start) * 1000
            return CheckResult(name="database", status="ok", latency_ms=latency)
        except Exception:
            latency = (time.perf_counter() - start) * 1000
            return CheckResult(name="database", status="fail", latency_ms=latency)

    async def check_redis(self) -> CheckResult:
        start = time.perf_counter()
        if self._redis_client is None:
            return CheckResult(name="cache", status="fail", latency_ms=0.0)
        try:
            await self._redis_client.ping()
            latency = (time.perf_counter() - start) * 1000
            return CheckResult(name="cache", status="ok", latency_ms=latency)
        except Exception:
            latency = (time.perf_counter() - start) * 1000
            return CheckResult(name="cache", status="fail", latency_ms=latency)

    async def check_queue(self) -> CheckResult:
        if self._queue_probe is None and self._redis_client is None:
            return CheckResult(name="queue", status="fail")
        try:
            if self._queue_probe is not None:
                connected = await self._queue_probe()
                return CheckResult(name="queue", status="ok" if connected else "fail")
            await self._redis_client.ping()
            return CheckResult(name="queue", status="ok")
        except Exception:
            return CheckResult(name="queue", status="fail")

    async def check_downstream(self, service_name: str, url: str) -> CheckResult:
        target = url.rstrip("/")
        if not target.endswith("/internal/live"):
            target = f"{target}/internal/live"

        timeout = httpx.Timeout(2.0)
        client = self._http_client or httpx.AsyncClient(timeout=timeout)
        close_client = self._http_client is None
        try:
            response = await client.get(target)
            if 200 <= response.status_code < 300:
                return CheckResult(name=service_name, status="ok")
            if 500 <= response.status_code < 600:
                return CheckResult(name=service_name, status="degraded")
            return CheckResult(name=service_name, status="fail")
        except (httpx.TimeoutException, httpx.RequestError):
            return CheckResult(name=service_name, status="fail")
        finally:
            if close_client:
                await client.aclose()


async def run_checks_concurrently(*checks: Awaitable[CheckResult]) -> list[CheckResult]:
    results = await asyncio.gather(*checks, return_exceptions=True)
    parsed: list[CheckResult] = []
    for item in results:
        if isinstance(item, CheckResult):
            parsed.append(item)
            continue
        parsed.append(CheckResult(name="unknown", status="fail"))
    return parsed
