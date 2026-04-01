"""Versioned v1 API router aggregation."""

from __future__ import annotations

from fastapi import APIRouter, Request

from .. import admin, auth, claims, demo, fraud, payouts, policies, pricing, review_queue, triggers

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(policies.router, prefix="/policies", tags=["policies"])
router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
router.include_router(claims.router, prefix="/claims", tags=["claims"])
router.include_router(payouts.router, prefix="/payouts", tags=["payouts"])
router.include_router(fraud.router, prefix="/fraud", tags=["fraud"])
router.include_router(triggers.router, prefix="/triggers", tags=["triggers"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(review_queue.router, prefix="/admin", tags=["admin"])
router.include_router(demo.router, prefix="/admin/demo", tags=["demo"])


@router.get("/openapi.json", include_in_schema=False)
async def openapi_v1_schema(request: Request) -> dict:
    """Expose OpenAPI schema for v1 routes used by contract checks."""
    schema = request.app.openapi()
    paths = {path: value for path, value in schema.get("paths", {}).items() if path.startswith("/api/v1/")}
    v1_schema = dict(schema)
    v1_schema["paths"] = paths
    return v1_schema
