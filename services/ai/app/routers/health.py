"""
Health check endpoints for Beaver AI Services

Provides system health, status, and capability information.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.models.schemas import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=HealthResponse)
async def health_check(settings: Settings = Depends(get_settings)):
    """
    Health check endpoint

    Returns system status, available AI providers, and feature flags.
    """
    logger.debug("Health check requested")

    # Check AI provider availability
    ai_providers = {
        "openai": settings.has_openai,
        "anthropic": settings.has_anthropic,
    }

    # Check feature availability
    features = {
        "summarization": settings.enable_summarization,
        "classification": settings.enable_classification,
        "troubleshooting": settings.enable_troubleshooting,
    }

    response = HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        version=settings.api_version,
        environment=settings.environment,
        ai_providers=ai_providers,
        features=features,
    )

    logger.info(f"Health check completed - Status: {response.status}")
    return response


@router.get("/ready")
async def readiness_check(settings: Settings = Depends(get_settings)):
    """
    Readiness check endpoint

    Returns whether the service is ready to accept requests.
    """
    # Check if at least one AI provider is available
    ready = settings.has_openai or settings.has_anthropic

    status = "ready" if ready else "not_ready"

    return {
        "status": status,
        "timestamp": datetime.now(),
        "ai_providers_available": ready,
        "message": "Service is ready" if ready else "No AI providers configured",
    }


@router.get("/live")
async def liveness_check():
    """
    Liveness check endpoint

    Simple endpoint to verify the service is running.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(),
        "message": "🦫 Beaver AI Services is running",
    }
