"""
Classification endpoints for Beaver AI Services

Provides AI-powered content classification and categorization.
"""

import asyncio
import logging
import time
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Depends
from fastapi import status

from app.core.config import Settings, get_settings
from app.models.schemas import (
    ClassificationRequest,
    ClassificationResponse,
    AIProvider,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Predefined categories for classification
DEFAULT_CATEGORIES = [
    "bug-fix",
    "feature-request", 
    "documentation",
    "enhancement",
    "question",
    "architecture",
    "performance",
    "security",
    "testing",
    "maintenance",
    "learning",
    "troubleshooting",
]


async def _validate_ai_provider(provider: AIProvider, settings: Settings) -> None:
    """Validate that the requested AI provider is available"""
    if provider == AIProvider.OPENAI and not settings.has_openai:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI provider not configured. Please set OPENAI_API_KEY."
        )
    elif provider == AIProvider.ANTHROPIC and not settings.has_anthropic:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Anthropic provider not configured. Please set ANTHROPIC_API_KEY."
        )


async def _mock_classification(request: ClassificationRequest, settings: Settings) -> ClassificationResponse:
    """
    Mock classification implementation
    
    TODO: Replace with actual LangChain + OpenAI/Anthropic implementation in Phase 2
    """
    start_time = time.time()
    
    # Simulate processing time
    await asyncio.sleep(0.3)
    
    content = request.content.lower()
    categories = request.categories or DEFAULT_CATEGORIES
    
    # Simple keyword-based classification for mock
    classification_scores = {}
    
    # Initialize all categories with low scores
    for category in categories:
        classification_scores[category] = 0.1
    
    # Keyword-based scoring
    if any(word in content for word in ["bug", "error", "fix", "broken", "issue"]):
        classification_scores["bug-fix"] = 0.85
        classification_scores["troubleshooting"] = 0.6
    elif any(word in content for word in ["feature", "add", "new", "implement"]):
        classification_scores["feature-request"] = 0.80
        classification_scores["enhancement"] = 0.5
    elif any(word in content for word in ["document", "docs", "readme", "guide"]):
        classification_scores["documentation"] = 0.75
    elif any(word in content for word in ["performance", "slow", "optimize", "speed"]):
        classification_scores["performance"] = 0.78
    elif any(word in content for word in ["security", "vulnerability", "auth", "permission"]):
        classification_scores["security"] = 0.82
    elif any(word in content for word in ["test", "testing", "unit test", "integration"]):
        classification_scores["testing"] = 0.77
    elif any(word in content for word in ["architecture", "design", "structure", "refactor"]):
        classification_scores["architecture"] = 0.73
    elif any(word in content for word in ["question", "how", "what", "why", "help"]):
        classification_scores["question"] = 0.70
    elif any(word in content for word in ["learn", "tutorial", "example", "study"]):
        classification_scores["learning"] = 0.68
    else:
        # Default to enhancement if no specific keywords found
        classification_scores["enhancement"] = 0.6
    
    # Sort by confidence and get primary category
    sorted_categories = sorted(classification_scores.items(), key=lambda x: x[1], reverse=True)
    primary_category = sorted_categories[0][0]
    confidence = sorted_categories[0][1]
    
    # Generate tags based on content
    tags = []
    if "urgent" in content or "critical" in content:
        tags.append("urgent")
    if "easy" in content or "simple" in content:
        tags.append("good-first-issue")
    if "complex" in content or "difficult" in content:
        tags.append("complex")
    if "backend" in content:
        tags.append("backend")
    if "frontend" in content:
        tags.append("frontend")
    if "api" in content:
        tags.append("api")
    
    processing_time = time.time() - start_time
    
    return ClassificationResponse(
        primary_category=primary_category,
        confidence=confidence,
        all_categories=dict(sorted_categories),
        tags=tags,
        processing_time=processing_time,
        provider_used=request.provider,
        model_used=request.model or settings.default_openai_model
    )


@router.post("/", response_model=ClassificationResponse)
async def classify_content(
    request: ClassificationRequest,
    settings: Settings = Depends(get_settings)
):
    """
    Classify content into predefined or custom categories
    
    Uses AI to analyze content and determine:
    - Primary category with confidence score
    - All categories with confidence scores
    - Relevant tags
    """
    logger.info("Content classification request received")
    
    # Validate feature is enabled
    if not settings.enable_classification:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classification feature is disabled"
        )
    
    # Validate AI provider
    await _validate_ai_provider(request.provider, settings)
    
    try:
        # TODO: Implement actual AI classification in Phase 2
        # For now, return mock response
        response = await _mock_classification(request, settings)
        
        logger.info(
            f"Classification completed: {response.primary_category} "
            f"(confidence: {response.confidence:.2f}) in {response.processing_time:.2f}s"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Classification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification failed: {str(e)}"
        )


@router.get("/categories")
async def get_available_categories():
    """
    Get list of available classification categories
    
    Returns the predefined categories that can be used for classification.
    """
    return {
        "categories": DEFAULT_CATEGORIES,
        "total": len(DEFAULT_CATEGORIES),
        "description": "Available categories for content classification"
    }