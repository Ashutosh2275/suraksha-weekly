"""Fraud detection and assessment router."""
from fastapi import APIRouter

router = APIRouter()


@router.post("/assess")
async def assess_fraud():
    """Assess claim for fraud."""
    return {"message": "Fraud assessment endpoint"}
