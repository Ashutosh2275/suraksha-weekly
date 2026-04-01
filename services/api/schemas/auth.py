"""
Pydantic schemas for authentication endpoints.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re


class OTPRequestSchema(BaseModel):
    """Request schema for OTP generation."""
    
    phone: str = Field(..., description="Indian mobile number")
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate Indian phone number format."""
        # Indian phone numbers: +91XXXXXXXXXX or XXXXXXXXXX (10 digits)
        pattern = r'^(\+91)?[6-9]\d{9}$'
        
        # Remove any spaces or dashes
        cleaned = re.sub(r'[\s-]', '', v)
        
        if not re.match(pattern, cleaned):
            raise ValueError(
                'Phone must be a valid Indian mobile number '
                '(10 digits starting with 6-9, optionally prefixed with +91)'
            )
        
        # Normalize to +91XXXXXXXXXX format
        if not cleaned.startswith('+91'):
            cleaned = f'+91{cleaned}'
        
        return cleaned
    
    class Config:
        schema_extra = {
            "example": {
                "phone": "+919876543210"
            }
        }


class OTPRequestResponse(BaseModel):
    """Response schema for OTP request."""
    
    message: str = "OTP sent successfully"
    expires_in: int = 300
    otp: Optional[str] = Field(None, description="OTP (only in development mode)")
    
    class Config:
        schema_extra = {
            "example": {
                "message": "OTP sent successfully",
                "expires_in": 300
            }
        }


class OTPVerifySchema(BaseModel):
    """Request schema for OTP verification."""
    
    phone: str = Field(..., description="Indian mobile number")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
    device_id: str = Field(..., description="Unique device identifier")
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate and normalize phone number."""
        pattern = r'^(\+91)?[6-9]\d{9}$'
        cleaned = re.sub(r'[\s-]', '', v)
        
        if not re.match(pattern, cleaned):
            raise ValueError('Invalid phone number format')
        
        if not cleaned.startswith('+91'):
            cleaned = f'+91{cleaned}'
        
        return cleaned
    
    @validator('otp')
    def validate_otp(cls, v):
        """Validate OTP format."""
        if not v.isdigit():
            raise ValueError('OTP must contain only digits')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "phone": "+919876543210",
                "otp": "123456",
                "device_id": "device_abc123xyz"
            }
        }


class OTPVerifyResponse(BaseModel):
    """Response schema for OTP verification."""
    
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes
    worker_id: str
    is_new_user: bool
    
    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "token_type": "bearer",
                "expires_in": 900,
                "worker_id": "550e8400-e29b-41d4-a716-446655440000",
                "is_new_user": False
            }
        }


class TokenRefreshSchema(BaseModel):
    """Request schema for token refresh."""
    
    refresh_token: str = Field(..., description="Valid refresh token")
    
    class Config:
        schema_extra = {
            "example": {
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
            }
        }


class TokenRefreshResponse(BaseModel):
    """Response schema for token refresh."""
    
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900
    
    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "token_type": "bearer",
                "expires_in": 900
            }
        }


class LogoutSchema(BaseModel):
    """Request schema for logout."""
    
    refresh_token: str = Field(..., description="Refresh token to invalidate")
    
    class Config:
        schema_extra = {
            "example": {
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
            }
        }


class LogoutResponse(BaseModel):
    """Response schema for logout."""
    
    message: str = "Logged out successfully"
    
    class Config:
        schema_extra = {
            "example": {
                "message": "Logged out successfully"
            }
        }
