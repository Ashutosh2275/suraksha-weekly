"""
JWT token service for authentication.
"""
import jwt
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from uuid import UUID

logger = logging.getLogger(__name__)


class TokenService:
    """Service for managing JWT tokens."""
    
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 7
    ALGORITHM = "HS256"
    
    def __init__(self, redis_client: aioredis.Redis, jwt_secret: str):
        self.redis = redis_client
        self.jwt_secret = jwt_secret
    
    def _get_session_key(self, worker_id: str, device_id: str) -> str:
        """Get Redis key for storing refresh token hash."""
        return f"session:{worker_id}:{device_id}"
    
    def _hash_token(self, token: str) -> str:
        """Hash a token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def create_access_token(
        self,
        worker_id: str,
        phone: str,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create JWT access token.
        
        Args:
            worker_id: Worker UUID
            phone: Worker phone number
            additional_claims: Optional additional claims to include
            
        Returns:
            JWT access token
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            'sub': str(worker_id),
            'phone': phone,
            'type': 'access',
            'iat': now,
            'exp': expires_at
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        token = jwt.encode(payload, self.jwt_secret, algorithm=self.ALGORITHM)
        
        logger.info(f"Access token created for worker {worker_id}")
        return token
    
    def create_refresh_token(
        self,
        worker_id: str,
        phone: str,
        device_id: str
    ) -> str:
        """
        Create JWT refresh token.
        
        Args:
            worker_id: Worker UUID
            phone: Worker phone number
            device_id: Device identifier
            
        Returns:
            JWT refresh token
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            'sub': str(worker_id),
            'phone': phone,
            'device_id': device_id,
            'type': 'refresh',
            'iat': now,
            'exp': expires_at
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm=self.ALGORITHM)
        
        logger.info(f"Refresh token created for worker {worker_id} device {device_id}")
        return token
    
    def verify_token(self, token: str, expected_type: str = 'access') -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token to verify
            expected_type: Expected token type ('access' or 'refresh')
            
        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.ALGORITHM]
            )
            
            # Verify token type
            if payload.get('type') != expected_type:
                logger.warning(f"Token type mismatch: expected {expected_type}, got {payload.get('type')}")
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
    
    async def store_refresh_token(
        self,
        worker_id: str,
        device_id: str,
        refresh_token: str,
        ip_address: Optional[str] = None
    ) -> None:
        """
        Store refresh token hash in Redis.
        
        Args:
            worker_id: Worker UUID
            device_id: Device identifier
            refresh_token: Refresh token to store
            ip_address: Optional IP address for logging
        """
        key = self._get_session_key(worker_id, device_id)
        token_hash = self._hash_token(refresh_token)
        
        # Store session data
        session_data = {
            'token_hash': token_hash,
            'created_at': datetime.utcnow().isoformat(),
            'ip_address': ip_address or 'unknown'
        }
        
        # Store with TTL matching token expiry
        ttl_seconds = self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        
        # Convert dict to string for Redis
        import json
        await self.redis.setex(
            key,
            ttl_seconds,
            json.dumps(session_data)
        )
        
        logger.info(f"Refresh token stored for worker {worker_id} device {device_id}")
    
    async def verify_refresh_token_stored(
        self,
        worker_id: str,
        device_id: str,
        refresh_token: str
    ) -> bool:
        """
        Verify refresh token against stored hash.
        
        Args:
            worker_id: Worker UUID
            device_id: Device identifier
            refresh_token: Refresh token to verify
            
        Returns:
            True if token is valid and matches stored hash
        """
        key = self._get_session_key(worker_id, device_id)
        
        # Get stored session data
        stored_data = await self.redis.get(key)
        
        if not stored_data:
            logger.warning(f"No session found for worker {worker_id} device {device_id}")
            return False
        
        # Decode if bytes
        if isinstance(stored_data, bytes):
            stored_data = stored_data.decode('utf-8')
        
        import json
        session_data = json.loads(stored_data)
        stored_hash = session_data.get('token_hash')
        
        # Compare hashes
        token_hash = self._hash_token(refresh_token)
        
        if token_hash == stored_hash:
            return True
        else:
            logger.warning(f"Refresh token hash mismatch for worker {worker_id}")
            return False
    
    async def invalidate_refresh_token(
        self,
        worker_id: str,
        device_id: str
    ) -> bool:
        """
        Invalidate refresh token by deleting from Redis.
        
        Args:
            worker_id: Worker UUID
            device_id: Device identifier
            
        Returns:
            True if token was deleted, False if not found
        """
        key = self._get_session_key(worker_id, device_id)
        result = await self.redis.delete(key)
        
        if result > 0:
            logger.info(f"Refresh token invalidated for worker {worker_id} device {device_id}")
            return True
        else:
            logger.warning(f"No refresh token found to invalidate for worker {worker_id}")
            return False
    
    async def rotate_refresh_token(
        self,
        old_token: str,
        worker_id: str,
        phone: str,
        device_id: str,
        ip_address: Optional[str] = None
    ) -> Optional[str]:
        """
        Rotate refresh token (invalidate old, create new).
        
        Args:
            old_token: Current refresh token
            worker_id: Worker UUID
            phone: Worker phone number
            device_id: Device identifier
            ip_address: Optional IP address
            
        Returns:
            New refresh token if successful, None otherwise
        """
        # Verify old token is valid and stored
        if not await self.verify_refresh_token_stored(worker_id, device_id, old_token):
            return None
        
        # Invalidate old token
        await self.invalidate_refresh_token(worker_id, device_id)
        
        # Create new token
        new_token = self.create_refresh_token(worker_id, phone, device_id)
        
        # Store new token
        await self.store_refresh_token(worker_id, device_id, new_token, ip_address)
        
        logger.info(f"Refresh token rotated for worker {worker_id}")
        return new_token
