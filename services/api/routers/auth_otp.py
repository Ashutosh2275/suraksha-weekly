"""
Authentication router for OTP-based authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis
import logging
import os

from schemas.auth import (
    OTPRequestSchema,
    OTPRequestResponse,
    OTPVerifySchema,
    OTPVerifyResponse,
    TokenRefreshSchema,
    TokenRefreshResponse,
    LogoutSchema,
    LogoutResponse
)
from models.worker import Worker, WorkerSession
from services.otp_service import OTPService
from services.token_service import TokenService
from services.sms_provider import get_sms_provider
from core.database import get_db
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


# Dependency to get Redis client
async def get_redis() -> aioredis.Redis:
    """Get Redis client dependency."""
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=False,
        encoding="utf-8"
    )
    try:
        yield redis_client
    finally:
        await redis_client.close()


# Dependency to get OTP service
async def get_otp_service(redis: aioredis.Redis = Depends(get_redis)) -> OTPService:
    """Get OTP service dependency."""
    return OTPService(redis)


# Dependency to get Token service
async def get_token_service(redis: aioredis.Redis = Depends(get_redis)) -> TokenService:
    """Get Token service dependency."""
    jwt_secret = os.getenv('JWT_SECRET', 'dev-jwt-secret-change-in-production')
    return TokenService(redis, jwt_secret)


@router.post("/otp/request", response_model=OTPRequestResponse, status_code=status.HTTP_200_OK)
async def request_otp(
    payload: OTPRequestSchema,
    request: Request,
    otp_service: OTPService = Depends(get_otp_service)
):
    """
    Request OTP for phone number.
    
    - Validates Indian phone number format
    - Enforces rate limiting (3 requests per 10 minutes)
    - Generates 6-digit OTP
    - Stores in Redis with 300-second TTL
    - Sends OTP via configured SMS provider
    - In development mode: returns OTP in response
    """
    phone = payload.phone
    
    # Check rate limit
    is_allowed, remaining = await otp_service.check_rate_limit(phone)
    
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for {phone}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again later."
        )
    
    # Generate and store OTP
    otp = await otp_service.generate_and_store_otp(phone)
    
    # Record request for rate limiting
    await otp_service.record_otp_request(phone)
    
    # Get SMS provider
    environment = os.getenv('ENVIRONMENT', 'development')
    sms_provider_type = os.getenv('SMS_PROVIDER', 'development')
    
    sms_config = {
        'TWILIO_ACCOUNT_SID': os.getenv('TWILIO_ACCOUNT_SID'),
        'TWILIO_AUTH_TOKEN': os.getenv('TWILIO_AUTH_TOKEN'),
        'TWILIO_FROM_NUMBER': os.getenv('TWILIO_FROM_NUMBER'),
        'MSG91_AUTH_KEY': os.getenv('MSG91_AUTH_KEY'),
        'MSG91_SENDER_ID': os.getenv('MSG91_SENDER_ID'),
        'MSG91_TEMPLATE_ID': os.getenv('MSG91_TEMPLATE_ID'),
    }
    
    sms_provider = get_sms_provider(sms_provider_type, sms_config, environment)
    
    # Send OTP
    sms_sent = await sms_provider.send_otp(phone, otp)
    
    if not sms_sent:
        logger.error(f"Failed to send OTP to {phone}")
        # In production, you might want to handle this differently
        # For now, we'll still return success if OTP is stored
    
    # Build response
    response = OTPRequestResponse(
        message="OTP sent successfully",
        expires_in=OTPService.OTP_TTL
    )
    
    # Include OTP in response only in development mode
    if environment == 'development':
        response.otp = otp
        logger.info(f"[DEV MODE] OTP included in response for {phone}")
    
    return response


@router.post("/otp/verify", response_model=OTPVerifyResponse, status_code=status.HTTP_200_OK)
async def verify_otp(
    payload: OTPVerifySchema,
    request: Request,
    db: AsyncSession = Depends(get_db),
    otp_service: OTPService = Depends(get_otp_service),
    token_service: TokenService = Depends(get_token_service)
):
    """
    Verify OTP and issue JWT tokens.
    
    - Validates OTP against Redis
    - Deletes OTP on successful match (one-time use)
    - Creates or retrieves worker record by phone
    - Issues JWT access token (15 min) and refresh token (7 days)
    - Stores refresh token hash in Redis
    - Logs device and IP for fraud detection
    """
    phone = payload.phone
    otp = payload.otp
    device_id = payload.device_id
    
    # Verify OTP
    is_valid = await otp_service.verify_otp(phone, otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP"
        )
    
    # Get or create worker
    result = await db.execute(
        select(Worker).where(Worker.phone == phone)
    )
    worker = result.scalar_one_or_none()
    
    is_new_user = False
    
    if not worker:
        # Create new worker
        worker = Worker(phone=phone)
        db.add(worker)
        await db.commit()
        await db.refresh(worker)
        is_new_user = True
        logger.info(f"New worker created: {worker.id}")
    else:
        # Update last login
        from datetime import datetime
        worker.last_login_at = datetime.utcnow()
        await db.commit()
        logger.info(f"Existing worker logged in: {worker.id}")
    
    # Get client IP
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get('user-agent', '')
    
    # Create session record for fraud detection
    session = WorkerSession(
        worker_id=worker.id,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(session)
    await db.commit()
    
    # Generate tokens
    access_token = token_service.create_access_token(
        worker_id=str(worker.id),
        phone=worker.phone
    )
    
    refresh_token = token_service.create_refresh_token(
        worker_id=str(worker.id),
        phone=worker.phone,
        device_id=device_id
    )
    
    # Store refresh token in Redis
    await token_service.store_refresh_token(
        worker_id=str(worker.id),
        device_id=device_id,
        refresh_token=refresh_token,
        ip_address=ip_address
    )
    
    logger.info(f"Tokens issued for worker {worker.id}")
    
    return OTPVerifyResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=TokenService.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        worker_id=str(worker.id),
        is_new_user=is_new_user
    )


@router.post("/token/refresh", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
async def refresh_token(
    payload: TokenRefreshSchema,
    request: Request,
    token_service: TokenService = Depends(get_token_service)
):
    """
    Refresh access token using refresh token.
    
    - Validates refresh token
    - Implements refresh token rotation (invalidate old, issue new)
    - Returns new access token and refresh token
    """
    refresh_token = payload.refresh_token
    
    # Verify refresh token
    token_payload = token_service.verify_token(refresh_token, expected_type='refresh')
    
    if not token_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    worker_id = token_payload.get('sub')
    phone = token_payload.get('phone')
    device_id = token_payload.get('device_id')
    
    # Verify token is stored in Redis
    is_stored = await token_service.verify_refresh_token_stored(
        worker_id, device_id, refresh_token
    )
    
    if not is_stored:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or invalid"
        )
    
    # Get client IP
    ip_address = request.client.host if request.client else None
    
    # Rotate refresh token
    new_refresh_token = await token_service.rotate_refresh_token(
        old_token=refresh_token,
        worker_id=worker_id,
        phone=phone,
        device_id=device_id,
        ip_address=ip_address
    )
    
    if not new_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to rotate refresh token"
        )
    
    # Create new access token
    new_access_token = token_service.create_access_token(
        worker_id=worker_id,
        phone=phone
    )
    
    logger.info(f"Tokens refreshed for worker {worker_id}")
    
    return TokenRefreshResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=TokenService.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
async def logout(
    payload: LogoutSchema,
    token_service: TokenService = Depends(get_token_service)
):
    """
    Logout by invalidating refresh token.
    
    - Validates refresh token
    - Deletes refresh token from Redis
    """
    refresh_token = payload.refresh_token
    
    # Verify refresh token
    token_payload = token_service.verify_token(refresh_token, expected_type='refresh')
    
    if not token_payload:
        # Even if token is invalid, consider logout successful
        logger.warning("Logout attempted with invalid token")
        return LogoutResponse(message="Logged out successfully")
    
    worker_id = token_payload.get('sub')
    device_id = token_payload.get('device_id')
    
    # Invalidate refresh token
    await token_service.invalidate_refresh_token(worker_id, device_id)
    
    logger.info(f"Worker {worker_id} logged out from device {device_id}")
    
    return LogoutResponse(message="Logged out successfully")
