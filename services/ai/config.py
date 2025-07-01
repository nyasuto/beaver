"""
Configuration management for AI Classification Service
"""

from typing import Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Server Configuration
    host: str = Field(default="0.0.0.0", env="AI_SERVICE_HOST")
    port: int = Field(default=8000, env="AI_SERVICE_PORT")
    debug: bool = Field(default=False, env="AI_SERVICE_DEBUG")

    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-3.5-turbo", env="OPENAI_MODEL")
    openai_temperature: float = Field(default=0.1, env="OPENAI_TEMPERATURE")
    openai_max_tokens: int = Field(default=500, env="OPENAI_MAX_TOKENS")

    # Classification Configuration
    confidence_threshold: float = Field(default=0.7, env="CONFIDENCE_THRESHOLD")
    max_retries: int = Field(default=3, env="MAX_RETRIES")
    request_timeout: int = Field(default=30, env="REQUEST_TIMEOUT")

    # Categories Configuration
    categories: Union[list[str], str] = Field(
        default=["bug-fix", "feature-request", "architecture", "learning", "troubleshooting"],
        env="CATEGORIES",
    )

    @field_validator("categories")
    @classmethod
    def parse_categories(cls, v):
        """Parse categories from string or list"""
        if isinstance(v, str):
            # Handle comma-separated string
            return [cat.strip() for cat in v.split(",") if cat.strip()]
        return v

    # API Security
    api_key: Optional[str] = Field(default=None, env="AI_SERVICE_API_KEY")

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
