"""
OTP service for generating, storing, and validating OTPs.
"""
import random
import logging
from typing import Optional, Tuple
import redis.asyncio as aioredis
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class OTPService:
    """Service for managing OTP operations."""
    
    OTP_LENGTH = 6
    OTP_TTL = 300  # 5 minutes
    RATE_LIMIT_WINDOW = 600  # 10 minutes
    RATE_LIMIT_MAX_ATTEMPTS = 3
    
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
    
    def _generate_otp(self) -> str:
        """Generate a random 6-digit OTP."""
        return ''.join([str(random.randint(0, 9)) for _ in range(self.OTP_LENGTH)])
    
    def _get_otp_key(self, phone: str) -> str:
        """Get Redis key for storing OTP."""
        return f"otp:{phone}"
    
    def _get_rate_limit_key(self, phone: str) -> str:
        """Get Redis key for rate limiting."""
        return f"otp_rate_limit:{phone}"
    
    async def check_rate_limit(self, phone: str) -> Tuple[bool, int]:
        """
        Check if phone number has exceeded rate limit.
        
        Uses sliding window approach with Redis sorted sets.
        
        Args:
            phone: Phone number to check
            
        Returns:
            Tuple of (is_allowed, attempts_remaining)
        """
        key = self._get_rate_limit_key(phone)
        now = datetime.utcnow().timestamp()
        window_start = now - self.RATE_LIMIT_WINDOW
        
        # Remove old entries outside the window
        await self.redis.zremrangebyscore(key, 0, window_start)
        
        # Count attempts in current window
        attempt_count = await self.redis.zcard(key)
        
        if attempt_count >= self.RATE_LIMIT_MAX_ATTEMPTS:
            remaining = 0
            allowed = False
        else:
            remaining = self.RATE_LIMIT_MAX_ATTEMPTS - attempt_count
            allowed = True
        
        return allowed, remaining
    
    async def record_otp_request(self, phone: str) -> None:
        """Record an OTP request for rate limiting."""
        key = self._get_rate_limit_key(phone)
        now = datetime.utcnow().timestamp()
        
        # Add current timestamp to sorted set
        await self.redis.zadd(key, {str(now): now})
        
        # Set expiry on the key
        await self.redis.expire(key, self.RATE_LIMIT_WINDOW)
    
    async def generate_and_store_otp(self, phone: str) -> str:
        """
        Generate OTP and store in Redis.
        
        Args:
            phone: Phone number
            
        Returns:
            Generated OTP
        """
        otp = self._generate_otp()
        key = self._get_otp_key(phone)
        
        # Store OTP with TTL
        await self.redis.setex(key, self.OTP_TTL, otp)
        
        logger.info(f"OTP generated and stored for {phone}")
        return otp
    
    async def verify_otp(self, phone: str, otp: str) -> bool:
        """
        Verify OTP and delete if valid (one-time use).
        
        Args:
            phone: Phone number
            otp: OTP to verify
            
        Returns:
            True if OTP is valid, False otherwise
        """
        key = self._get_otp_key(phone)
        
        # Get stored OTP
        stored_otp = await self.redis.get(key)
        
        if not stored_otp:
            logger.warning(f"No OTP found for {phone} (expired or never generated)")
            return False
        
        # Decode if bytes
        if isinstance(stored_otp, bytes):
            stored_otp = stored_otp.decode('utf-8')
        
        # Verify OTP
        if stored_otp == otp:
            # Delete OTP after successful verification (one-time use)
            await self.redis.delete(key)
            logger.info(f"OTP verified successfully for {phone}")
            return True
        else:
            logger.warning(f"Invalid OTP provided for {phone}")
            return False
    
    async def get_remaining_ttl(self, phone: str) -> Optional[int]:
        """
        Get remaining TTL for OTP.
        
        Args:
            phone: Phone number
            
        Returns:
            Remaining seconds or None if OTP doesn't exist
        """
        key = self._get_otp_key(phone)
        ttl = await self.redis.ttl(key)
        
        if ttl > 0:
            return ttl
        return None
