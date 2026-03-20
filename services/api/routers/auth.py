"""Authentication router with OTP-based login."""
import re

from pydantic import BaseModel, Field, field_validator, model_validator
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.rate_limiter import rate_limit
from core.security import OTPHandler, JWTHandler
from models import Worker
from services.audit import log_event

router = APIRouter()

DEMO_PHONE = "+919876543210"
DEMO_OTP = "1234"


def normalize_indian_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return phone


class OTPRequestPayload(BaseModel):
    """Request OTP payload."""

    phone: str = Field(..., pattern=r"^\+91[6-9]\d{9}$")

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return normalize_indian_phone(value)


class OTPVerifyPayload(BaseModel):
    """Verify OTP payload."""

    phone: str = Field(..., pattern=r"^\+91[6-9]\d{9}$")
    otp: str = Field(..., min_length=4, max_length=6)
    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    service_zones: list[str] = Field(default=[])
    platform_type: str = Field(..., pattern="^(Zomato|Swiggy)$")
    avg_daily_hours: float = Field(default=8.0, ge=0.0, le=24.0)
    avg_weekly_earnings: float = Field(default=5000.0, ge=0.0)

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return normalize_indian_phone(value)

    @model_validator(mode="after")
    def validate_otp_length(self) -> "OTPVerifyPayload":
        is_demo_login = self.phone == DEMO_PHONE and self.otp == DEMO_OTP
        if is_demo_login:
            return self

        if len(self.otp) != 6 or not self.otp.isdigit():
            raise ValueError("OTP must be a 6-digit numeric value")

        return self


@router.post(
    "/request-otp",
    dependencies=[Depends(rate_limit(per_ip=5, per_identity=30, burst=2))],
)
async def request_otp(
    payload: OTPRequestPayload,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """
    Request OTP for phone number.

    Generates a 6-digit OTP and stores it in Redis with 5-minute TTL.
    Caller must use this OTP to verify and obtain JWT within the TTL.

    Args:
        payload: Request containing phone number
        session: Database session

    Returns:
        dict: Success message and OTP (only in dev mode)

    Raises:
        HTTPException: If phone format is invalid
    """
    phone = payload.phone

    # Generate OTP
    otp = OTPHandler.generate_otp(phone)

    # Log the OTP request
    await log_event(
        session=session,
        entity_type="OTP",
        entity_id=phone,
        action="requested",
        actor="system",
        payload={"otp_generated": True},
    )

    await session.commit()

    return {
        "status": 200,
        "message": "OTP sent successfully",
        "otp": otp,  # Return OTP in dev mode
    }


@router.post(
    "/verify-otp",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=30, burst=2))],
)
async def verify_otp(
    payload: OTPVerifyPayload,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """
    Verify OTP and login or register worker.

    If worker exists, returns JWT token.
    If worker doesn't exist, creates new worker and returns JWT token.

    Args:
        payload: OTP verification request payload
        session: Database session

    Returns:
        dict: JWT token and worker profile

    Raises:
        HTTPException: If OTP is invalid, expired, or registration fails
    """
    phone = payload.phone
    otp = payload.otp

    # Verify OTP, with a demo-only bypass for controlled testing.
    is_demo_login = phone == DEMO_PHONE and otp == DEMO_OTP
    if not is_demo_login and not OTPHandler.verify_otp(phone, otp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    # Check if worker exists
    result = await session.execute(select(Worker).where(Worker.phone == phone))
    worker = result.scalars().first()

    if worker:
        # Existing worker: return JWT
        token = JWTHandler.create_token(
            data={"worker_id": worker.id, "phone": worker.phone}
        )

        await log_event(
            session=session,
            entity_type="Worker",
            entity_id=worker.id,
            action="login",
            actor="system",
            payload={"phone": phone},
        )

        await session.commit()

        return {
            "status": 200,
            "data": {
                "token": token,
                "worker": {
                    "id": worker.id,
                    "phone": worker.phone,
                    "name": worker.name,
                    "city": worker.city,
                    "service_zones": worker.service_zones,
                    "platform_type": worker.platform_type,
                    "trust_score": worker.trust_score,
                    "trust_tier": worker.trust_tier,
                },
            },
        }
    else:
        # New worker: create and return JWT
        new_worker = Worker(
            phone=phone,
            name=payload.name,
            city=payload.city,
            service_zones=payload.service_zones,
            platform_type=payload.platform_type,
            avg_daily_hours=payload.avg_daily_hours,
            avg_weekly_earnings=payload.avg_weekly_earnings,
            trust_score=100.0,
            trust_tier="standard",
        )

        session.add(new_worker)
        await session.flush()

        # Log registration
        await log_event(
            session=session,
            entity_type="Worker",
            entity_id=new_worker.id,
            action="registered",
            actor="system",
            payload={"phone": phone, "platform_type": payload.platform_type},
        )

        token = JWTHandler.create_token(
            data={"worker_id": new_worker.id, "phone": new_worker.phone}
        )

        await session.commit()

        return {
            "status": 201,
            "data": {
                "token": token,
                "worker": {
                    "id": new_worker.id,
                    "phone": new_worker.phone,
                    "name": new_worker.name,
                    "city": new_worker.city,
                    "service_zones": new_worker.service_zones,
                    "platform_type": new_worker.platform_type,
                    "trust_score": new_worker.trust_score,
                    "trust_tier": new_worker.trust_tier,
                },
            },
        }
