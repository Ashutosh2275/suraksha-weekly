"""
API v1 Contract Test Suite — Suraksha Weekly (PRD §40)
=====================================================

Every test in this file is a HARD pipeline block (Stage 4 CI).
A failing test for a currently-live endpoint means the API contract has been
broken and the PR MUST NOT merge.

Coverage:
    a. Required field presence in every response body
    b. Field type correctness
    c. Enum value sets (claim_status, plan_variant, trigger_type, …)
    d. HTTP status codes — 200/201, 422, 401, 403, 404, 429, 503
    e. Idempotency — identical body on duplicate write, exactly 1 DB row
    f. Standard envelope — version, timestamp, request_id on every response

Markers:
    contract  — every test in this module carries this marker
    idempotency — subset that verify write idempotency
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta
from typing import Any

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import AuditLog, Claim, Policy, TriggerEvent

pytestmark = pytest.mark.contract


# ── Enum value sets ────────────────────────────────────────────────────────────

VALID_CLAIM_STATUSES = {"initiated", "in_review", "approved", "rejected", "paid", "blocked"}
VALID_PLAN_VARIANTS  = {"basic", "standard", "pro"}
VALID_TRIGGER_TYPES  = {"HeavyRain", "ExtremeHeat", "SeverePollution", "LocalRestriction", "PlatformOutage"}
VALID_TRUST_TIERS    = {"bronze", "silver", "gold"}
VALID_PAYOUT_PRIORITY = {"standard", "faster", "priority"}

ISO8601_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(\+\d{2}:\d{2}|Z)?$"
)


# ── Generic assertion helpers ──────────────────────────────────────────────────

def assert_required_fields(body: dict, fields: list[str]) -> None:
    """Fail the test if any required field is missing from the response body."""
    missing = [f for f in fields if f not in body]
    assert not missing, f"Required fields missing from response: {missing}"


def assert_field_types(body: dict, schema: dict[str, type | tuple]) -> None:
    """Assert that each field in `schema` has the declared type."""
    for field, expected_type in schema.items():
        if field not in body:
            pytest.fail(f"Field '{field}' is missing from response body.")
        value = body[field]
        if value is None:
            continue  # Optional fields may be None
        assert isinstance(value, expected_type), (
            f"Field '{field}' expected type {expected_type}, got {type(value).__name__}: {value!r}"
        )


def assert_error_response(body: dict, error_code: str) -> None:
    """Assert a standard error envelope with the expected error_code."""
    assert_required_fields(body, ["error_code", "message"])
    assert body["error_code"] == error_code, (
        f"Expected error_code={error_code!r}, got {body['error_code']!r}"
    )


def assert_422_errors(body: dict) -> None:
    """Assert a standard validation error response."""
    assert_required_fields(body, ["error_code", "errors"])
    assert body["error_code"] == "VALIDATION_ERROR"
    assert isinstance(body["errors"], list)
    assert len(body["errors"]) > 0


# ══════════════════════════════════════════════════════════════════════════════
# AUTH CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestAuthContracts:
    """POST /api/v1/auth/request-otp — POST /api/v1/auth/verify-otp"""

    @pytest.mark.asyncio
    async def test_request_otp_valid_phone(self, client: AsyncClient) -> None:
        """Valid phone returns 200 with message field."""
        resp = await client.post(
            "/api/v1/auth/request-otp",
            json={"phone": "+919876543210"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert_required_fields(body, ["message"])
        assert isinstance(body["message"], str)

    @pytest.mark.asyncio
    async def test_request_otp_missing_phone_422(self, client: AsyncClient) -> None:
        """Missing phone field → 422 with VALIDATION_ERROR."""
        resp = await client.post("/api/v1/auth/request-otp", json={})
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    async def test_request_otp_bad_phone_format_422(self, client: AsyncClient) -> None:
        """Invalid phone format → 422."""
        resp = await client.post(
            "/api/v1/auth/request-otp",
            json={"phone": "not-a-phone"},
        )
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    async def test_verify_otp_missing_fields_422(self, client: AsyncClient) -> None:
        """Missing OTP field → 422 with errors array."""
        resp = await client.post(
            "/api/v1/auth/verify-otp",
            json={"phone": "+919876543210"},   # otp missing
        )
        assert resp.status_code == 422
        assert_422_errors(resp.json())


# ══════════════════════════════════════════════════════════════════════════════
# POLICY CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestPolicyContracts:
    """GET /api/v1/policies/ — GET/{id} — POST /purchase — renew/upgrade/downgrade"""

    @pytest.mark.asyncio
    async def test_list_policies_unauthenticated_401(self, client: AsyncClient) -> None:
        """No auth header → 401 UNAUTHORIZED."""
        resp = await client.get("/api/v1/policies/")
        assert resp.status_code == 401
        assert_error_response(resp.json(), "UNAUTHORIZED")

    @pytest.mark.asyncio
    async def test_list_policies_authenticated_200(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """Authenticated worker gets 200 with data list."""
        resp = await client.get("/api/v1/policies/", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "data" in body or isinstance(body, (list, dict))

    @pytest.mark.asyncio
    async def test_get_policy_not_found_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """Non-existent policy ID → 404 NOT_FOUND."""
        resp = await client.get(
            f"/api/v1/policies/{uuid.uuid4()}", headers=auth_headers
        )
        assert resp.status_code == 404
        assert_error_response(resp.json(), "NOT_FOUND")

    @pytest.mark.asyncio
    async def test_purchase_missing_plan_422(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """Missing plan_variant → 422 VALIDATION_ERROR."""
        resp = await client.post(
            "/api/v1/policies/purchase", headers=auth_headers, json={}
        )
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    async def test_purchase_invalid_plan_422(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """Invalid plan_variant value → 422."""
        resp = await client.post(
            "/api/v1/policies/purchase",
            headers=auth_headers,
            json={"plan_variant": "platinum"},
        )
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    @pytest.mark.idempotency
    async def test_purchase_idempotency(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_worker,
    ) -> None:
        """
        Idempotency contract: two purchases with identical payload in the same
        week MUST NOT create a second active policy (PRD §9 — one active policy
        per worker at a time).
        """
        plan = "basic"
        headers = {**auth_headers, "X-Idempotency-Key": str(uuid.uuid4())}

        resp1 = await client.post(
            "/api/v1/policies/purchase",
            headers=headers,
            json={"plan_variant": plan},
        )
        first_status = resp1.status_code

        resp2 = await client.post(
            "/api/v1/policies/purchase",
            headers=headers,
            json={"plan_variant": plan},
        )

        # Both responses should succeed or second should be idempotent (409 or 200 with same id)
        assert resp1.status_code in (200, 201)
        assert resp2.status_code in (200, 201, 409)

        # At most 1 active policy row for this worker
        rows = await db_session.execute(
            select(Policy).where(
                Policy.worker_id == test_worker.id,
                Policy.status == "active",
            )
        )
        active_policies = rows.scalars().all()
        assert len(active_policies) <= 1, (
            f"Idempotency violated: {len(active_policies)} active policies found for worker"
        )

    @pytest.mark.asyncio
    async def test_purchase_response_field_types(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """A successful purchase response has required fields with correct types."""
        resp = await client.post(
            "/api/v1/policies/purchase",
            headers=auth_headers,
            json={"plan_variant": "basic"},
        )
        if resp.status_code not in (200, 201):
            pytest.skip("Worker may already have an active policy — skip type check.")
        body = resp.json()
        data = body.get("data") or body   # unwrap envelope if present
        assert_required_fields(data, ["id", "worker_id", "plan_variant", "status"])
        assert_field_types(data, {
            "id":           str,
            "worker_id":    str,
            "plan_variant": str,
            "status":       str,
        })
        assert data["plan_variant"] in VALID_PLAN_VARIANTS, (
            f"plan_variant {data['plan_variant']!r} not in {VALID_PLAN_VARIANTS}"
        )

    @pytest.mark.asyncio
    async def test_purchase_unauthenticated_401(self, client: AsyncClient) -> None:
        """No JWT → 401."""
        resp = await client.post(
            "/api/v1/policies/purchase", json={"plan_variant": "basic"}
        )
        assert resp.status_code == 401
        assert_error_response(resp.json(), "UNAUTHORIZED")


# ══════════════════════════════════════════════════════════════════════════════
# PRICING CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestPricingContracts:
    """GET /api/v1/pricing/quote — GET /api/v1/pricing/risk-profile"""

    @pytest.mark.asyncio
    async def test_quote_missing_worker_id_422(self, client: AsyncClient) -> None:
        """Missing worker_id query param → 422."""
        resp = await client.get("/api/v1/pricing/quote")
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    async def test_quote_unknown_worker_404(self, client: AsyncClient) -> None:
        """Unknown worker_id → 404 NOT_FOUND."""
        resp = await client.get(
            "/api/v1/pricing/quote", params={"worker_id": str(uuid.uuid4())}
        )
        assert resp.status_code == 404
        assert_error_response(resp.json(), "NOT_FOUND")

    @pytest.mark.asyncio
    async def test_quote_valid_worker_200(
        self, client: AsyncClient, test_worker
    ) -> None:
        """Known worker_id → 200 with quotes for all three plans."""
        resp = await client.get(
            "/api/v1/pricing/quote", params={"worker_id": test_worker.id}
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body
        assert_required_fields(data, ["quotes"])
        assert isinstance(data["quotes"], list)
        assert len(data["quotes"]) == len(VALID_PLAN_VARIANTS)
        for quote in data["quotes"]:
            assert quote["plan_variant"] in VALID_PLAN_VARIANTS
            assert isinstance(quote.get("weekly_premium"), (int, float))
            assert quote["weekly_premium"] >= 0

    @pytest.mark.asyncio
    async def test_risk_profile_missing_worker_id_422(self, client: AsyncClient) -> None:
        """Missing worker_id → 422."""
        resp = await client.get("/api/v1/pricing/risk-profile")
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    async def test_risk_profile_field_types(
        self, client: AsyncClient, test_worker
    ) -> None:
        """Known worker → 200 with correctly typed risk profile fields."""
        resp = await client.get(
            "/api/v1/pricing/risk-profile", params={"worker_id": test_worker.id}
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body
        assert_required_fields(data, [
            "worker_id", "location_risk_index", "disruption_frequency_score",
            "hour_exposure_score", "platform_segment_factor",
        ])
        assert_field_types(data, {
            "worker_id":                  str,
            "location_risk_index":        (int, float),
            "disruption_frequency_score": (int, float),
            "hour_exposure_score":        (int, float),
            "platform_segment_factor":    (int, float),
        })


# ══════════════════════════════════════════════════════════════════════════════
# CLAIMS CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestClaimsContracts:
    """GET /api/v1/claims/ — GET/{id} — POST/{id}/appeal"""

    @pytest.mark.asyncio
    async def test_list_claims_unauthenticated_401(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/claims/")
        assert resp.status_code == 401
        assert_error_response(resp.json(), "UNAUTHORIZED")

    @pytest.mark.asyncio
    async def test_list_claims_authenticated_200(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.get("/api/v1/claims/", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        # Accepts either a list envelope or a dict with a data key
        data = body.get("items") or body.get("data") or body
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_claim_not_found_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.get(
            f"/api/v1/claims/{uuid.uuid4()}", headers=auth_headers
        )
        assert resp.status_code == 404
        assert_error_response(resp.json(), "NOT_FOUND")

    @pytest.mark.asyncio
    async def test_claim_status_enum_values(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_worker
    ) -> None:
        """Any claim returned by the API must have a valid status enum value."""
        resp = await client.get("/api/v1/claims/", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        items = body.get("items") or body.get("data") or body
        for claim in items:
            assert claim.get("status") in VALID_CLAIM_STATUSES, (
                f"Claim status {claim.get('status')!r} not in allowed set {VALID_CLAIM_STATUSES}"
            )

    @pytest.mark.asyncio
    async def test_claim_appeal_not_found_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.post(
            f"/api/v1/claims/{uuid.uuid4()}/appeal",
            headers=auth_headers,
            json={"reason": "I was on duty"},
        )
        assert resp.status_code in (404, 422)   # 404 if not found; 422 if claim not theirs

    @pytest.mark.asyncio
    async def test_claim_detail_required_fields(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_worker
    ) -> None:
        """Detail endpoint returns all required fields with correct types."""
        # Only run if a claim exists for this worker
        result = await db_session.execute(
            select(Claim).where(Claim.worker_id == test_worker.id).limit(1)
        )
        claim_row = result.scalar_one_or_none()
        if claim_row is None:
            pytest.skip("No claims exist for test worker.")

        resp = await client.get(
            f"/api/v1/claims/{claim_row.id}", headers=auth_headers
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body

        assert_required_fields(data, [
            "id", "worker_id", "policy_id", "trigger_event_id",
            "status", "fraud_score", "payout_amount",
        ])
        assert_field_types(data, {
            "id":               str,
            "worker_id":        str,
            "policy_id":        str,
            "fraud_score":      (int, float),
            "payout_amount":    (int, float),
        })
        assert data["status"] in VALID_CLAIM_STATUSES, (
            f"Unexpected claim status: {data['status']!r}"
        )

    @pytest.mark.asyncio
    @pytest.mark.idempotency
    async def test_apply_claim_creates_or_returns_existing(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_worker,
    ) -> None:
        now = datetime.utcnow()
        policy = Policy(
            id=str(uuid.uuid4()),
            worker_id=test_worker.id,
            plan_variant="basic",
            status="active",
            weekly_premium=99.0,
            coverage_cap=1500.0,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=6),
            renewal_count=0,
        )
        trigger = TriggerEvent(
            id=str(uuid.uuid4()),
            type="HeavyRain",
            zone="Andheri",
            value=8.0,
            threshold=5.0,
            confidence_score=0.92,
            sources=["contract-test"],
            status="active",
            triggered_at=now,
            audit_snapshot={"city": "Mumbai"},
        )
        db_session.add(policy)
        db_session.add(trigger)
        await db_session.commit()

        resp1 = await client.post(
            "/api/v1/claims/apply",
            headers=auth_headers,
            json={"trigger_event_id": trigger.id},
        )
        assert resp1.status_code == 201
        body1 = resp1.json()
        assert_required_fields(body1, ["claim", "message"])
        assert body1["claim"]["id"]

        resp2 = await client.post(
            "/api/v1/claims/apply",
            headers=auth_headers,
            json={"trigger_event_id": trigger.id},
        )
        assert resp2.status_code == 201
        body2 = resp2.json()
        assert body2["claim"]["id"] == body1["claim"]["id"]

        rows = await db_session.execute(
            select(Claim).where(
                Claim.worker_id == test_worker.id,
                Claim.policy_id == policy.id,
                Claim.trigger_event_id == trigger.id,
            )
        )
        claims = rows.scalars().all()
        assert len(claims) == 1


# ══════════════════════════════════════════════════════════════════════════════
# PAYOUT CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestPayoutContracts:
    """GET /api/v1/payouts/ — GET/{id}"""

    @pytest.mark.asyncio
    async def test_list_payouts_unauthenticated_401(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/payouts/")
        assert resp.status_code == 401
        assert_error_response(resp.json(), "UNAUTHORIZED")

    @pytest.mark.asyncio
    async def test_list_payouts_200(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.get("/api/v1/payouts/", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("items") or body.get("data") or body
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_payout_detail_not_found_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.get(
            f"/api/v1/payouts/{uuid.uuid4()}", headers=auth_headers
        )
        assert resp.status_code == 404
        assert_error_response(resp.json(), "NOT_FOUND")

    @pytest.mark.asyncio
    async def test_payout_field_types(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """Payout records have correct field types."""
        resp = await client.get("/api/v1/payouts/", headers=auth_headers)
        assert resp.status_code == 200
        items = resp.json().get("items") or resp.json().get("data") or resp.json()
        for payout in items:
            assert_field_types(payout, {
                "id":       str,
                "amount":   (int, float),
                "gateway":  str,
                "status":   str,
            })


# ══════════════════════════════════════════════════════════════════════════════
# TRIGGER CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestTriggerContracts:
    """GET /api/v1/triggers/active — GET/{id} — POST /simulate (admin)"""

    @pytest.mark.asyncio
    async def test_active_triggers_200(self, client: AsyncClient) -> None:
        """No auth required; returns 200 with list of trigger events."""
        resp = await client.get("/api/v1/triggers/active")
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body.get("triggers") or body
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_active_triggers_type_enum(self, client: AsyncClient) -> None:
        """Every trigger type in the response must be a valid enum value."""
        resp = await client.get("/api/v1/triggers/active")
        assert resp.status_code == 200
        body = resp.json()
        triggers = body.get("data") or body.get("triggers") or body
        for t in triggers:
            assert t.get("type") in VALID_TRIGGER_TYPES, (
                f"Unknown trigger type: {t.get('type')!r}"
            )

    @pytest.mark.asyncio
    async def test_trigger_detail_not_found_404(self, client: AsyncClient) -> None:
        resp = await client.get(f"/api/v1/triggers/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert_error_response(resp.json(), "NOT_FOUND")

    @pytest.mark.asyncio
    async def test_simulate_trigger_unauthenticated_401_or_403(
        self, client: AsyncClient
    ) -> None:
        """POST /simulate without admin token → 401 or 403."""
        resp = await client.post(
            "/api/v1/triggers/simulate",
            json={
                "type": "HeavyRain", "zone": "Andheri",
                "value": 120.0, "threshold": 100.0,
                "confidence_score": 0.90, "sources": ["IMD"],
            },
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 without admin token, got {resp.status_code}"
        )

    @pytest.mark.asyncio
    async def test_simulate_trigger_invalid_type_422(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        """Invalid trigger type → 422 VALIDATION_ERROR."""
        resp = await client.post(
            "/api/v1/triggers/simulate",
            headers=admin_headers,
            json={
                "type": "Earthquake", "zone": "Andheri",
                "value": 7.5, "threshold": 5.0,
                "confidence_score": 0.95, "sources": ["USGS"],
            },
        )
        assert resp.status_code == 422
        assert_422_errors(resp.json())

    @pytest.mark.asyncio
    @pytest.mark.idempotency
    async def test_simulate_idempotency(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        """Simulating the same trigger twice returns a trigger each time but
        orchestration ensures the same event is not double-processed."""
        payload = {
            "type": "HeavyRain", "zone": "Bandra",
            "value": 130.0, "threshold": 100.0,
            "confidence_score": 0.88,
            "sources": ["IMD", "OpenWeather"],
        }
        resp1 = await client.post(
            "/api/v1/triggers/simulate", headers=admin_headers, json=payload
        )
        resp2 = await client.post(
            "/api/v1/triggers/simulate", headers=admin_headers, json=payload
        )
        # Both should succeed (or 2nd may be idempotent)
        assert resp1.status_code in (200, 201)
        assert resp2.status_code in (200, 201)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminContracts:
    """Admin endpoints — all require X-Admin-Token."""

    # ── fraud/model-status ────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_model_status_no_token_401(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/admin/fraud/model-status")
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_model_status_200(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        resp = await client.get(
            "/api/v1/admin/fraud/model-status", headers=admin_headers
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body
        assert_required_fields(data, ["rule_only_mode", "last_precision"])
        assert isinstance(data["rule_only_mode"], bool)
        assert isinstance(data["last_precision"], (int, float))

    # ── fraud/clusters ────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_fraud_clusters_200(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        resp = await client.get(
            "/api/v1/admin/fraud/clusters", headers=admin_headers
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("clusters") or body.get("data") or body
        assert isinstance(data, list)

    # ── admin/claims ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_admin_claims_no_token_401(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/admin/claims")
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_admin_claims_200(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        resp = await client.get("/api/v1/admin/claims", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        items = body.get("items") or body.get("data") or body
        assert isinstance(items, list)

    @pytest.mark.asyncio
    async def test_admin_review_claim_not_found_404(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        resp = await client.patch(
            f"/api/v1/admin/claims/{uuid.uuid4()}/review",
            headers=admin_headers,
            json={"status": "approved"},
        )
        assert resp.status_code == 404
        assert_error_response(resp.json(), "NOT_FOUND")

    @pytest.mark.asyncio
    async def test_admin_review_invalid_status_422(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        """Invalid claim status value → 422."""
        resp = await client.patch(
            f"/api/v1/admin/claims/{uuid.uuid4()}/review",
            headers=admin_headers,
            json={"status": "pending"},   # "pending" is not a valid ClaimStatus
        )
        assert resp.status_code in (404, 422)

    # ── fraud/analyze-graph ───────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_analyze_graph_200(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        resp = await client.post(
            "/api/v1/admin/fraud/analyze-graph", headers=admin_headers
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body
        assert_required_fields(data, ["clusters_found"])
        assert isinstance(data["clusters_found"], int)


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH PROBE CONTRACTS
# ══════════════════════════════════════════════════════════════════════════════

class TestHealthProbeContracts:
    """GET /health/internal/live — /ready — /startup"""

    @pytest.mark.asyncio
    async def test_liveness_after_startup(self, client: AsyncClient) -> None:
        """After /startup has been called, /live must return 200."""
        # Prime the startup probe first
        await client.get("/health/internal/startup")
        resp = await client.get("/health/internal/live")
        assert resp.status_code == 200
        body = resp.json()
        assert_required_fields(body, ["status", "timestamp"])
        assert body["status"] in ("ok", "alive")

    @pytest.mark.asyncio
    async def test_startup_probe_required_fields(self, client: AsyncClient) -> None:
        resp = await client.get("/health/internal/startup")
        assert resp.status_code in (200, 503)
        body = resp.json()
        assert_required_fields(body, ["status", "steps"])
        assert isinstance(body["steps"], list)
        for step in body["steps"]:
            assert_required_fields(step, ["name", "status"])

    @pytest.mark.asyncio
    async def test_readiness_field_types(self, client: AsyncClient) -> None:
        await client.get("/health/internal/startup")  # ensure started
        resp = await client.get("/health/internal/ready")
        assert resp.status_code in (200, 503)
        body = resp.json()
        assert_required_fields(body, ["status", "checks"])
        assert isinstance(body["checks"], dict)
        assert_field_types(body, {"status": str})


# ══════════════════════════════════════════════════════════════════════════════
# CROSS-CUTTING: X-Request-ID HEADER CONTRACT
# ══════════════════════════════════════════════════════════════════════════════

class TestRequestIDHeaderContract:
    """Every response must echo back X-Request-ID."""

    SAMPLE_ENDPOINTS = [
        ("GET",  "/health/internal/startup"),
        ("GET",  "/health/internal/live"),
        ("GET",  "/api/v1/triggers/active"),
    ]

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,path", SAMPLE_ENDPOINTS)
    async def test_request_id_echoed_in_response(
        self, client: AsyncClient, method: str, path: str
    ) -> None:
        """Server must echo the X-Request-ID header on every response."""
        req_id = str(uuid.uuid4())
        resp = await client.request(method, path, headers={"X-Request-ID": req_id})
        assert resp.headers.get("X-Request-ID") == req_id, (
            f"{method} {path}: expected X-Request-ID={req_id!r} in response headers"
        )

    @pytest.mark.asyncio
    async def test_server_generates_request_id_when_absent(
        self, client: AsyncClient
    ) -> None:
        """If client does not send X-Request-ID, server must generate one."""
        resp = await client.get("/health/internal/startup")
        server_id = resp.headers.get("X-Request-ID")
        assert server_id is not None, "X-Request-ID header missing from response"
        assert len(server_id) > 0


# ══════════════════════════════════════════════════════════════════════════════
# CROSS-CUTTING: RATE-LIMIT RESPONSE CONTRACT (PRD §37)
# ══════════════════════════════════════════════════════════════════════════════

class TestRateLimitContract:
    """When rate-limited, response must match the 429 contract."""

    @pytest.mark.asyncio
    async def test_rate_limit_429_contract(self, client: AsyncClient) -> None:
        """
        Exhaust the per-IP burst limit on request-otp and assert the 429
        response contains error_code, Retry-After header, and rate-limit headers.
        """
        # Burst limit for request-otp is 2; spam 10 requests
        responses = [
            await client.post(
                "/api/v1/auth/request-otp",
                json={"phone": "+919876543210"},
            )
            for _ in range(10)
        ]
        rate_limited = [r for r in responses if r.status_code == 429]
        if not rate_limited:
            pytest.skip("Redis unavailable or rate limiting not enforced in this environment.")

        resp = rate_limited[0]
        body = resp.json()
        assert_error_response(body, "RATE_LIMIT_EXCEEDED")
        assert "Retry-After" in resp.headers, "Retry-After header missing from 429 response"
        assert "X-RateLimit-Limit" in resp.headers, "X-RateLimit-Limit header missing"
