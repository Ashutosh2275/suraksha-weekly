"""
Abstract SMS provider interface and implementations.
"""
from abc import ABC, abstractmethod
from typing import Optional
import logging
import httpx

logger = logging.getLogger(__name__)


class SMSProvider(ABC):
    """Abstract base class for SMS providers."""
    
    @abstractmethod
    async def send_otp(self, phone: str, otp: str) -> bool:
        """
        Send OTP via SMS.
        
        Args:
            phone: Phone number in +91XXXXXXXXXX format
            otp: 6-digit OTP
            
        Returns:
            True if SMS sent successfully, False otherwise
        """
        pass


class DevelopmentSMSProvider(SMSProvider):
    """Development SMS provider that logs OTP instead of sending."""
    
    async def send_otp(self, phone: str, otp: str) -> bool:
        """Log OTP instead of sending SMS in development."""
        logger.info(f"[DEV MODE] OTP for {phone}: {otp}")
        return True


class TwilioSMSProvider(SMSProvider):
    """Twilio SMS provider implementation."""
    
    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    
    async def send_otp(self, phone: str, otp: str) -> bool:
        """Send OTP via Twilio."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    auth=(self.account_sid, self.auth_token),
                    data={
                        'To': phone,
                        'From': self.from_number,
                        'Body': f'Your Suraksha Weekly OTP is: {otp}. Valid for 5 minutes. Do not share with anyone.'
                    }
                )
                
                if response.status_code == 201:
                    logger.info(f"OTP sent successfully to {phone} via Twilio")
                    return True
                else:
                    logger.error(f"Twilio API error: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send OTP via Twilio: {str(e)}")
            return False


class MSG91Provider(SMSProvider):
    """MSG91 SMS provider implementation (popular in India)."""
    
    def __init__(self, auth_key: str, sender_id: str, template_id: Optional[str] = None):
        self.auth_key = auth_key
        self.sender_id = sender_id
        self.template_id = template_id
        self.base_url = "https://api.msg91.com/api/v5/otp"
    
    async def send_otp(self, phone: str, otp: str) -> bool:
        """Send OTP via MSG91."""
        try:
            # Remove +91 prefix for MSG91
            phone_number = phone.replace('+91', '')
            
            async with httpx.AsyncClient() as client:
                payload = {
                    'mobile': phone_number,
                    'otp': otp,
                    'authkey': self.auth_key,
                    'sender': self.sender_id
                }
                
                if self.template_id:
                    payload['template_id'] = self.template_id
                
                response = await client.post(
                    self.base_url,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    logger.info(f"OTP sent successfully to {phone} via MSG91")
                    return True
                else:
                    logger.error(f"MSG91 API error: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send OTP via MSG91: {str(e)}")
            return False


class MockSMSProvider(SMSProvider):
    """Mock SMS provider for testing (always succeeds)."""
    
    async def send_otp(self, phone: str, otp: str) -> bool:
        """Mock SMS sending."""
        logger.info(f"[MOCK] OTP {otp} would be sent to {phone}")
        return True


def get_sms_provider(
    provider_type: str,
    config: dict,
    environment: str = "development"
) -> SMSProvider:
    """
    Factory function to get appropriate SMS provider.
    
    Args:
        provider_type: Type of provider ('twilio', 'msg91', 'mock', 'development')
        config: Configuration dictionary with provider credentials
        environment: Current environment (development/production)
        
    Returns:
        SMSProvider instance
    """
    if environment == "development" or provider_type == "development":
        return DevelopmentSMSProvider()
    
    if provider_type == "mock":
        return MockSMSProvider()
    
    if provider_type == "twilio":
        return TwilioSMSProvider(
            account_sid=config.get('TWILIO_ACCOUNT_SID'),
            auth_token=config.get('TWILIO_AUTH_TOKEN'),
            from_number=config.get('TWILIO_FROM_NUMBER')
        )
    
    if provider_type == "msg91":
        return MSG91Provider(
            auth_key=config.get('MSG91_AUTH_KEY'),
            sender_id=config.get('MSG91_SENDER_ID'),
            template_id=config.get('MSG91_TEMPLATE_ID')
        )
    
    # Default to development provider
    logger.warning(f"Unknown SMS provider '{provider_type}', using development provider")
    return DevelopmentSMSProvider()
