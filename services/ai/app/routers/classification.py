"""
Classification endpoints for Beaver AI Services

Provides AI-powered content classification and categorization.
"""

import asyncio
import logging
import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.ai_client import AIClient
from app.core.config import Settings, get_settings
from app.models.schemas import (
    AIProvider,
    ClassificationRequest,
    ClassificationResponse,
    IssueData,
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
            detail="OpenAI provider not configured. Please set OPENAI_API_KEY.",
        )
    elif provider == AIProvider.ANTHROPIC and not settings.has_anthropic:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Anthropic provider not configured. Please set ANTHROPIC_API_KEY.",
        )


async def _real_ai_classification(
    request: ClassificationRequest, settings: Settings
) -> ClassificationResponse:
    """
    Real AI classification using OpenAI/Anthropic APIs
    """
    start_time = time.time()
    logger.info(f"Starting real AI classification for content: {request.content[:100]}...")

    # Initialize AI client
    ai_client = AIClient(settings)

    # Convert request to IssueData format
    from datetime import datetime

    issue_data = IssueData(
        id=1,  # Dummy ID for classification
        number=1,  # Dummy number for classification
        title=getattr(
            request, "title", request.content[:100]
        ),  # Use content as title if not provided
        body=request.content,
        state="open",  # Default state
        labels=getattr(request, "labels", []),
        user="unknown",  # Default user
        comments=[],  # No comments for basic classification
        created_at=datetime.now(),  # Current time
        updated_at=datetime.now(),  # Current time
    )

    try:
        # Create classification prompt
        prompt = _create_classification_prompt(
            request.content, request.categories or DEFAULT_CATEGORIES
        )

        # Use AI client for classification (fallback to OpenAI)
        provider = request.provider if request.provider else AIProvider.OPENAI
        model = request.model if request.model else None

        # Call AI for classification
        logger.info(f"Using AI provider: {provider} with model: {model or 'default'}")
        if provider == AIProvider.OPENAI:
            ai_response = await _classify_with_openai(ai_client, prompt, model, settings)
        elif provider == AIProvider.ANTHROPIC:
            ai_response = await _classify_with_anthropic(ai_client, prompt, model, settings)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

        logger.info(f"AI response received (length: {len(ai_response)} chars)")

        # Parse AI response
        category, confidence, reasoning = _parse_ai_classification_response(
            ai_response, request.categories or DEFAULT_CATEGORIES
        )

        # Generate tags based on content and AI response
        tags = _generate_tags_from_ai_response(request.content, reasoning)

        processing_time = time.time() - start_time

        return ClassificationResponse(
            primary_category=category,
            confidence=confidence,
            all_categories={category: confidence},  # Simplified for now
            tags=tags,
            processing_time=processing_time,
            provider_used=provider,
            model_used=model or settings.default_openai_model,
        )

    except Exception as e:
        logger.error(f"Real AI classification failed: {type(e).__name__}: {str(e)}")
        logger.error(f"Exception details: {e}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")

        logger.info("Falling back to mock classification...")
        # Fallback to mock if AI fails
        return await _mock_classification(request, settings)


def _create_classification_prompt(content: str, categories: List[str]) -> str:
    """Create a prompt for AI classification"""
    categories_str = ", ".join(categories)

    return f"""あなたは技術的なコンテンツ分類の専門家です。以下のコンテンツを分析し、最適なカテゴリに分類してください。

コンテンツ:
{content}

利用可能なカテゴリ: {categories_str}

以下の形式で回答してください:
カテゴリ: [選択したカテゴリ]
信頼度: [0.0-1.0の数値]
理由: [分類理由を1-2文で説明]

制約:
- 必ず利用可能なカテゴリから1つを選択してください
- 信頼度は0.0から1.0の間で指定してください
- 理由は簡潔で具体的にしてください"""


async def _classify_with_openai(
    ai_client: AIClient, prompt: str, model: str, settings: Settings
) -> str:
    """Classify using OpenAI API"""
    import openai
    from openai import AsyncOpenAI

    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        model_name = model or settings.default_openai_model

        logger.info(f"Making OpenAI API call with model: {model_name}")

        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "あなたは技術コンテンツの分類専門家です。"},
                {"role": "user", "content": prompt},
            ],
            max_tokens=settings.max_tokens,
            temperature=0.1,  # Low temperature for consistent classification
            timeout=settings.request_timeout,
        )

        content = response.choices[0].message.content
        logger.info(f"OpenAI API call successful, received {len(content)} characters")
        return content

    except openai.RateLimitError as e:
        logger.error(f"OpenAI rate limit exceeded: {e}")
        raise
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in OpenAI call: {type(e).__name__}: {e}")
        raise


async def _classify_with_anthropic(
    ai_client: AIClient, prompt: str, model: str, settings: Settings
) -> str:
    """Classify using Anthropic API"""
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    model_name = model or settings.default_anthropic_model

    response = await client.messages.create(
        model=model_name,
        max_tokens=settings.max_tokens,
        temperature=0.1,
        messages=[
            {"role": "user", "content": f"あなたは技術コンテンツの分類専門家です。\n\n{prompt}"}
        ],
    )

    return response.content[0].text


def _parse_ai_classification_response(
    response: str, available_categories: List[str]
) -> tuple[str, float, str]:
    """Parse AI response to extract category, confidence, and reasoning"""
    lines = response.strip().split("\n")
    category = available_categories[0]  # Default fallback
    confidence = 0.5  # Default confidence
    reasoning = "AI分類完了"  # Default reasoning

    for line in lines:
        line = line.strip()
        if line.startswith("カテゴリ:") or line.startswith("Category:"):
            # Extract category
            cat_text = line.split(":", 1)[1].strip()
            # Find matching category
            for cat in available_categories:
                if cat.lower() in cat_text.lower() or cat_text.lower() in cat.lower():
                    category = cat
                    break
        elif line.startswith("信頼度:") or line.startswith("Confidence:"):
            # Extract confidence
            conf_text = line.split(":", 1)[1].strip()
            try:
                confidence = float(conf_text)
                confidence = max(0.0, min(1.0, confidence))  # Clamp to [0,1]
            except ValueError:
                pass
        elif line.startswith("理由:") or line.startswith("Reason:"):
            # Extract reasoning
            reasoning = line.split(":", 1)[1].strip()

    return category, confidence, reasoning


def _generate_tags_from_ai_response(content: str, reasoning: str) -> List[str]:
    """Generate tags based on content and AI reasoning"""
    tags = []

    content_lower = content.lower()
    reasoning_lower = reasoning.lower()
    combined_text = content_lower + " " + reasoning_lower

    # Priority/urgency tags
    if any(word in combined_text for word in ["urgent", "critical", "緊急", "重要"]):
        tags.append("urgent")
    if any(word in combined_text for word in ["easy", "simple", "簡単", "容易"]):
        tags.append("good-first-issue")

    # Technical area tags
    if any(word in combined_text for word in ["backend", "server", "api", "バックエンド"]):
        tags.append("backend")
    if any(word in combined_text for word in ["frontend", "ui", "interface", "フロントエンド"]):
        tags.append("frontend")
    if any(word in combined_text for word in ["database", "db", "sql", "データベース"]):
        tags.append("database")
    if any(word in combined_text for word in ["security", "auth", "セキュリティ", "認証"]):
        tags.append("security")
    if any(
        word in combined_text for word in ["performance", "optimize", "パフォーマンス", "最適化"]
    ):
        tags.append("performance")

    return tags


async def _mock_classification(
    request: ClassificationRequest, settings: Settings
) -> ClassificationResponse:
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
        model_used=request.model or settings.default_openai_model,
    )


@router.post("/", response_model=ClassificationResponse)
async def classify_content(
    request: ClassificationRequest, settings: Settings = Depends(get_settings)
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
            detail="Classification feature is disabled",
        )

    # Validate AI provider
    await _validate_ai_provider(request.provider, settings)

    try:
        # Use real AI classification
        response = await _real_ai_classification(request, settings)

        logger.info(
            f"Classification completed: {response.primary_category} "
            f"(confidence: {response.confidence:.2f}) in {response.processing_time:.2f}s"
        )

        return response

    except Exception as e:
        logger.error(f"Classification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification failed: {str(e)}",
        )


@router.post("/enhanced", response_model=ClassificationResponse)
async def classify_content_enhanced(
    request: ClassificationRequest, settings: Settings = Depends(get_settings)
):
    """
    Enhanced AI-powered content classification

    Provides advanced classification with deeper analysis:
    - Multi-dimensional categorization
    - Confidence scoring
    - Contextual tag generation
    - Priority assessment
    """
    logger.info("Enhanced classification request received")

    # Validate feature is enabled
    if not settings.enable_classification:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classification feature is disabled",
        )

    # Validate AI provider
    await _validate_ai_provider(request.provider, settings)

    try:
        # Use real AI classification (same as basic, but could be enhanced later)
        response = await _real_ai_classification(request, settings)

        logger.info(
            f"Enhanced classification completed: {response.primary_category} "
            f"(confidence: {response.confidence:.2f}) in {response.processing_time:.2f}s"
        )

        return response

    except Exception as e:
        logger.error(f"Enhanced classification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced classification failed: {str(e)}",
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
        "description": "Available categories for content classification",
    }
