"""Security utilities for JWT tokens, OTP, and password hashing."""
import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
import redis

from core.config import settings


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Redis client for OTP storage
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class JWTHandler:
    """JWT token operations."""

    @staticmethod
    def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT token.

        Args:
            data: Payload dictionary
            expires_delta: Token expiration delta (defaults to JWT_EXPIRATION_HOURS)

        Returns:
            str: Encoded JWT token
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                hours=settings.JWT_EXPIRATION_HOURS
            )

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode,
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )

        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> dict:
        """
        Verify and decode a JWT token.

        Args:
            token: JWT token string

        Returns:
            dict: Decoded token payload

        Raises:
            JWTError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except JWTError as e:
            raise JWTError(f"Invalid token: {e}")


class OTPHandler:
    """OTP generation and verification."""

    OTP_LENGTH = 6
    OTP_TTL_SECONDS = 300  # 5 minutes

    @staticmethod
    def generate_otp(phone: str) -> str:
        """
        Generate and store OTP for a phone number.

        Args:
            phone: Phone number (E.164 format)

        Returns:
            str: 6-digit OTP (mock-friendly)
        """
        # Generate OTP
        otp = "".join(random.choices(string.digits, k=OTPHandler.OTP_LENGTH))

        # Store in Redis with TTL
        redis_key = f"otp:{phone}"
        redis_client.setex(
            redis_key,
            OTPHandler.OTP_TTL_SECONDS,
            otp,
        )

        return otp

    @staticmethod
    def verify_otp(phone: str, otp: str) -> bool:
        """
        Verify OTP for a phone number.

        Args:
            phone: Phone number (E.164 format)
            otp: OTP to verify

        Returns:
            bool: True if OTP is valid and not expired
        """
        redis_key = f"otp:{phone}"
        stored_otp = redis_client.get(redis_key)

        if stored_otp is None:
            return False

        # Constant-time comparison
        is_valid = stored_otp == otp

        if is_valid:
            # Delete OTP after successful verification
            redis_client.delete(redis_key)

        return is_valid

    @staticmethod
    def revoke_otp(phone: str) -> None:
        """
        Revoke OTP for a phone number.

        Args:
            phone: Phone number (E.164 format)
        """
        redis_key = f"otp:{phone}"
        redis_client.delete(redis_key)


class PasswordHandler:
    """Password hashing and verification."""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password.

        Args:
            password: Plain text password

        Returns:
            str: Hashed password
        """
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.

        Args:
            plain_password: Plain text password
            hashed_password: Hashed password

        Returns:
            bool: True if password matches hash
        """
        return pwd_context.verify(plain_password, hashed_password)
