"""Configuration validation utilities for FastAPI services."""

import os
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class EnvVarSpec:
    """Specification for an environment variable."""
    
    name: str
    description: str
    required: bool = True
    default: Optional[str] = None


class ConfigValidator:
    """Validates environment variables at service startup."""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.env_specs: List[EnvVarSpec] = []
        self.errors: List[str] = []
    
    def add_required(self, name: str, description: str) -> 'ConfigValidator':
        """Add a required environment variable."""
        self.env_specs.append(EnvVarSpec(name, description, required=True))
        return self
    
    def add_optional(self, name: str, description: str, default: str = None) -> 'ConfigValidator':
        """Add an optional environment variable."""
        self.env_specs.append(EnvVarSpec(name, description, required=False, default=default))
        return self
    
    def validate(self) -> Dict[str, str]:
        """
        Validate all environment variables.
        
        Returns:
            Dict of environment variable names to values
            
        Raises:
            RuntimeError: If any required variables are missing
        """
        config = {}
        self.errors = []
        
        for spec in self.env_specs:
            value = os.getenv(spec.name)
            
            if value is None:
                if spec.required:
                    self.errors.append(
                        f"  ❌ {spec.name}: MISSING (required)\n"
                        f"     Description: {spec.description}"
                    )
                else:
                    # Use default for optional variables
                    config[spec.name] = spec.default
            else:
                config[spec.name] = value
        
        if self.errors:
            error_message = self._build_error_message()
            raise RuntimeError(error_message)
        
        return config
    
    def _build_error_message(self) -> str:
        """Build a descriptive error message for missing variables."""
        lines = [
            f"\n{'='*70}",
            f"❌ CONFIGURATION ERROR: {self.service_name}",
            f"{'='*70}",
            "",
            "The following required environment variables are missing:",
            "",
            *self.errors,
            "",
            f"{'='*70}",
            "How to fix:",
            f"  1. Copy .env.example to .env in the service directory",
            f"  2. Fill in the required values",
            f"  3. Restart the service",
            f"{'='*70}",
            ""
        ]
        return "\n".join(lines)
    
    def get_config_summary(self, config: Dict[str, str]) -> str:
        """Generate a summary of loaded configuration (masks sensitive values)."""
        lines = [
            f"✅ {self.service_name} Configuration Loaded",
            "=" * 50
        ]
        
        sensitive_keys = {'password', 'secret', 'key', 'token', 'api_key'}
        
        for spec in self.env_specs:
            value = config.get(spec.name, spec.default)
            
            # Mask sensitive values
            if any(key in spec.name.lower() for key in sensitive_keys):
                display_value = "***MASKED***" if value else "NOT SET"
            else:
                display_value = value if value else "NOT SET"
            
            status = "✓" if value else "○"
            lines.append(f"  {status} {spec.name}: {display_value}")
        
        lines.append("=" * 50)
        return "\n".join(lines)


def create_config_validator(service_name: str) -> ConfigValidator:
    """Factory function to create a ConfigValidator instance."""
    return ConfigValidator(service_name)
