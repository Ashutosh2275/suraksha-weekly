"""Payout gateway interface and provider adapters."""

from __future__ import annotations

import os
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Literal

import httpx


PayoutStatus = Literal["SUCCESS", "FAILED", "UNCERTAIN"]


@dataclass(slots=True)
class PayoutResult:
    status: PayoutStatus
    gateway_ref: str | None = None
    amount: float | None = None
    raw_response: dict[str, Any] | None = None
    error_message: str | None = None


class PayoutGateway(ABC):
    @abstractmethod
    async def initiate(self, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        raise NotImplementedError

    @abstractmethod
    async def check_status(self, gateway_reference: str) -> PayoutResult:
        raise NotImplementedError


class RazorpayTestAdapter(PayoutGateway):
    """Razorpay test-mode payout adapter."""

    def __init__(
        self,
        *,
        key_id: str | None = None,
        key_secret: str | None = None,
        base_url: str = "https://api.razorpay.com/v1/payouts",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.key_id = key_id or os.getenv("RAZORPAY_KEY_ID", "")
        self.key_secret = key_secret or os.getenv("RAZORPAY_KEY_SECRET", "")
        self.base_url = base_url.rstrip("/")
        self._http_client = http_client

    async def initiate(self, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        own_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=15.0)
        payload = {
            "amount": int(round(amount * 100)),
            "currency": "INR",
            "mode": "UPI",
            "purpose": "suraksha_weekly_claim",
            "fund_account": {
                "account_type": "vpa",
                "vpa": {"address": handle},
            },
            "queue_if_low_balance": True,
            "reference_id": idempotency_key,
            "notes": {"idempotency_key": idempotency_key},
        }
        try:
            response = await client.post(
                self.base_url,
                auth=(self.key_id, self.key_secret),
                json=payload,
                headers={"Idempotency-Key": idempotency_key},
            )
            response.raise_for_status()
            body = response.json()
            return PayoutResult(
                status="SUCCESS",
                gateway_ref=str(body.get("id") or body.get("reference_id") or body.get("payout_id") or idempotency_key),
                amount=float(body.get("amount") or amount),
                raw_response=body,
            )
        except httpx.TimeoutException as exc:
            return PayoutResult(status="UNCERTAIN", error_message=str(exc))
        except httpx.HTTPError as exc:
            return PayoutResult(status="FAILED", error_message=str(exc))
        finally:
            if own_client:
                await client.aclose()

    async def check_status(self, gateway_reference: str) -> PayoutResult:
        own_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=15.0)
        try:
            response = await client.get(
                f"{self.base_url}/{gateway_reference}",
                auth=(self.key_id, self.key_secret),
            )
            if response.status_code == 404:
                return PayoutResult(status="UNCERTAIN", gateway_ref=gateway_reference, error_message="Gateway reference not found.")
            response.raise_for_status()
            body = response.json()
            status = str(body.get("status") or "UNCERTAIN").upper()
            if status not in {"SUCCESS", "FAILED", "UNCERTAIN"}:
                status = "UNCERTAIN"
            return PayoutResult(
                status=status,  # type: ignore[arg-type]
                gateway_ref=str(body.get("id") or gateway_reference),
                amount=float(body.get("amount") or 0.0) if body.get("amount") is not None else None,
                raw_response=body,
            )
        except httpx.TimeoutException as exc:
            return PayoutResult(status="UNCERTAIN", gateway_ref=gateway_reference, error_message=str(exc))
        except httpx.HTTPError as exc:
            return PayoutResult(status="UNCERTAIN", gateway_ref=gateway_reference, error_message=str(exc))
        finally:
            if own_client:
                await client.aclose()


class MockPayoutAdapter(PayoutGateway):
    """Deterministic-ish mock adapter for tests and local development."""

    _shared_records: dict[str, PayoutResult] = {}

    def __init__(self, *, random_source: Any | None = None) -> None:
        self._random = random_source or random

    async def initiate(self, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        roll = float(self._random.random())
        if roll < 0.90:
            result = PayoutResult(
                status="SUCCESS",
                gateway_ref=f"mock_{idempotency_key[:12]}",
                amount=amount,
                raw_response={"amount": amount, "handle": handle},
            )
            self._shared_records[result.gateway_ref or idempotency_key] = result
            return result
        if roll < 0.95:
            result = PayoutResult(
                status="FAILED",
                gateway_ref=f"mock_fail_{idempotency_key[:12]}",
                amount=amount,
                raw_response={"amount": amount, "handle": handle},
                error_message="Mock gateway rejected the payout.",
            )
            self._shared_records[result.gateway_ref or idempotency_key] = result
            return result
        result = PayoutResult(
            status="UNCERTAIN",
            gateway_ref=f"mock_uncertain_{idempotency_key[:12]}",
            amount=amount,
            raw_response={"amount": amount, "handle": handle},
            error_message="Mock gateway timed out before confirmation.",
        )
        self._shared_records[result.gateway_ref or idempotency_key] = result
        return result

    async def check_status(self, gateway_reference: str) -> PayoutResult:
        return self._shared_records.get(
            gateway_reference,
            PayoutResult(status="UNCERTAIN", gateway_ref=gateway_reference, error_message="Mock gateway reference not found.")
        )


class PayoutGatewayFactory:
    @staticmethod
    def create(*, http_client: httpx.AsyncClient | None = None, random_source: Any | None = None) -> PayoutGateway:
        provider = os.getenv("PAYOUT_GATEWAY", "mock").strip().lower()
        if provider == "razorpay":
            return RazorpayTestAdapter(http_client=http_client)
        return MockPayoutAdapter(random_source=random_source)
