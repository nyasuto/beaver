"""
Configuration management for Beaver AI Services

Handles environment variables, settings validation, and configuration defaults.
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }
    
    # API Configuration
    api_version: str = Field(default="0.1.0", description="API version")
    environment: str = Field(default="development", description="Environment (development, staging, production)")
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    log_level: str = Field(default="INFO", description="Logging level")
    
    # CORS settings
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    
    # AI API Keys
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    
    # AI Model Configuration
    default_openai_model: str = Field(default="gpt-4", description="Default OpenAI model")
    default_anthropic_model: str = Field(default="claude-3-sonnet-20240229", description="Default Anthropic model")
    max_tokens: int = Field(default=4000, description="Maximum tokens for AI responses")
    temperature: float = Field(default=0.7, description="AI model temperature")
    
    # Processing limits
    max_content_length: int = Field(default=50000, description="Maximum content length for processing")
    request_timeout: int = Field(default=300, description="Request timeout in seconds")
    
    # Feature flags
    enable_summarization: bool = Field(default=True, description="Enable summarization features")
    enable_classification: bool = Field(default=True, description="Enable classification features")
    enable_troubleshooting: bool = Field(default=True, description="Enable troubleshooting features")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_ai_keys()
        
    def _validate_ai_keys(self):
        """Validate that at least one AI API key is provided"""
        if not self.openai_api_key and not self.anthropic_api_key:
            # Check environment variables directly as fallback
            openai_key = os.getenv("OPENAI_API_KEY")
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            
            if not openai_key and not anthropic_key:
                raise ValueError(
                    "At least one AI API key must be provided: "
                    "OPENAI_API_KEY or ANTHROPIC_API_KEY"
                )
            
            # Update settings with found keys
            if openai_key:
                self.openai_api_key = openai_key
            if anthropic_key:
                self.anthropic_api_key = anthropic_key
    
    @property
    def has_openai(self) -> bool:
        """Check if OpenAI API key is available"""
        return bool(self.openai_api_key)
    
    @property
    def has_anthropic(self) -> bool:
        """Check if Anthropic API key is available"""
        return bool(self.anthropic_api_key)
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()