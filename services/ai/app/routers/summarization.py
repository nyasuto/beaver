"""
Summarization endpoints for Beaver AI Services

Provides AI-powered summarization of GitHub Issues and content.
"""

import logging
import time
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi import status

from app.core.config import Settings, get_settings
from app.models.schemas import (
    SummarizationRequest,
    SummarizationResponse,
    BatchSummarizationRequest,
    BatchSummarizationResponse,
    ErrorResponse,
    AIProvider,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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


async def _mock_summarization(request: SummarizationRequest, settings: Settings) -> SummarizationResponse:
    """
    Mock summarization implementation
    
    TODO: Replace with actual LangChain + OpenAI/Anthropic implementation in Phase 1
    """
    start_time = time.time()
    
    # Simulate processing time
    await asyncio.sleep(0.5)
    
    # Mock response based on issue data
    issue = request.issue
    
    # Generate mock summary
    summary = f"Issue #{issue.number}: {issue.title}の要約\n\n"
    summary += f"この課題は{issue.user}によって作成され、{len(issue.comments)}件のコメントが付いています。"
    
    if issue.state == "closed":
        summary += " 課題は解決済みです。"
    else:
        summary += " 課題は現在オープンな状態です。"
    
    # Generate key points
    key_points = [
        f"作成者: {issue.user}",
        f"状態: {issue.state}",
        f"ラベル: {', '.join(issue.labels) if issue.labels else 'なし'}",
    ]
    
    if issue.comments:
        key_points.append(f"コメント数: {len(issue.comments)}件")
    
    # Determine complexity based on content length and comments
    content_length = len(issue.body) + sum(len(c.body) for c in issue.comments)
    if content_length < 500:
        complexity = "low"
    elif content_length < 2000:
        complexity = "medium"
    else:
        complexity = "high"
    
    # Determine category based on labels or content
    category = "general"
    if any("bug" in label.lower() for label in issue.labels):
        category = "bug-fix"
    elif any("feature" in label.lower() for label in issue.labels):
        category = "feature-request"
    elif any("doc" in label.lower() for label in issue.labels):
        category = "documentation"
    
    processing_time = time.time() - start_time
    
    return SummarizationResponse(
        summary=summary,
        key_points=key_points,
        category=category,
        complexity=complexity,
        processing_time=processing_time,
        provider_used=request.provider,
        model_used=request.model or settings.default_openai_model,
        token_usage={"prompt_tokens": 150, "completion_tokens": 80, "total_tokens": 230}
    )


@router.post("/", response_model=SummarizationResponse)
async def summarize_issue(
    request: SummarizationRequest,
    settings: Settings = Depends(get_settings)
):
    """
    Summarize a GitHub issue using AI
    
    Processes the issue title, body, and optionally comments to generate:
    - A concise summary
    - Key points extraction
    - Category classification
    - Complexity assessment
    """
    logger.info(f"Summarization request for issue #{request.issue.number}")
    
    # Validate feature is enabled
    if not settings.enable_summarization:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization feature is disabled"
        )
    
    # Validate AI provider
    await _validate_ai_provider(request.provider, settings)
    
    try:
        # TODO: Implement actual AI summarization in Phase 1
        # For now, return mock response
        response = await _mock_summarization(request, settings)
        
        logger.info(
            f"Summarization completed for issue #{request.issue.number} "
            f"in {response.processing_time:.2f}s using {response.provider_used}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Summarization failed for issue #{request.issue.number}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization failed: {str(e)}"
        )


@router.post("/batch", response_model=BatchSummarizationResponse)
async def summarize_issues_batch(
    request: BatchSummarizationRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings)
):
    """
    Batch summarization of multiple issues
    
    Processes multiple issues in parallel for efficiency.
    """
    logger.info(f"Batch summarization request for {len(request.issues)} issues")
    
    # Validate feature is enabled
    if not settings.enable_summarization:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization feature is disabled"
        )
    
    # Validate AI provider
    await _validate_ai_provider(request.provider, settings)
    
    start_time = time.time()
    results = []
    failed_issues = []
    
    # Process each issue (TODO: implement parallel processing)
    for issue_data in request.issues:
        try:
            single_request = SummarizationRequest(
                issue=issue_data,
                provider=request.provider,
                model=request.model,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                include_comments=request.include_comments,
                language=request.language
            )
            
            result = await _mock_summarization(single_request, settings)
            results.append(result)
            
        except Exception as e:
            logger.error(f"Failed to summarize issue #{issue_data.number}: {str(e)}")
            failed_issues.append({
                "issue_number": issue_data.number,
                "error": str(e)
            })
    
    total_time = time.time() - start_time
    
    response = BatchSummarizationResponse(
        results=results,
        total_processed=len(results),
        total_failed=len(failed_issues),
        processing_time=total_time,
        failed_issues=failed_issues
    )
    
    logger.info(
        f"Batch summarization completed: {response.total_processed} successful, "
        f"{response.total_failed} failed in {total_time:.2f}s"
    )
    
    return response


# Import asyncio at the top of the file
import asyncio