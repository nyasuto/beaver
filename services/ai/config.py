"""
Configuration management for AI Classification Service
"""

from typing import Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Server Configuration
    host: str = Field(default="0.0.0.0", description="AI service host")
    port: int = Field(default=8000, description="AI service port")
    debug: bool = False

    # OpenAI Configuration
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-3.5-turbo"
    openai_temperature: float = 0.1
    openai_max_tokens: int = 500

    # Classification Configuration
    confidence_threshold: float = 0.7
    max_retries: int = 3
    request_timeout: int = 30

    # Categories Configuration
    categories: Union[list[str], str] = [
        "bug-fix",
        "feature-request",
        "architecture",
        "learning",
        "troubleshooting",
    ]

    @field_validator("categories")
    @classmethod
    def parse_categories(cls, v: Union[str, list[str]]) -> list[str]:
        """Parse categories from string or list"""
        if isinstance(v, str):
            # Handle comma-separated string
            return [cat.strip() for cat in v.split(",") if cat.strip()]
        return v

    # API Security
    api_key: Optional[str] = None

    # Logging
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
