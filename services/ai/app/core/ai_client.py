"""
AI Client for Beaver AI Services

Provides OpenAI and Anthropic API client implementations for summarization and classification.
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import anthropic
import httpx
import openai
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import Settings
from app.models.schemas import AIProvider, IssueData

logger = logging.getLogger(__name__)


@dataclass
class APIError:
    """Structured API error information"""

    error_type: str
    message: str
    retry_after: Optional[int] = None
    quota_exceeded: bool = False


class AIClient:
    """Unified AI client supporting OpenAI and Anthropic"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._openai_client = None
        self._anthropic_client = None

        # Initialize available clients
        if settings.has_openai:
            self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("OpenAI client initialized")

        if settings.has_anthropic:
            self._anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
            logger.info("Anthropic client initialized")

    def _get_client(self, provider: AIProvider):
        """Get the appropriate client for the provider"""
        if provider == AIProvider.OPENAI:
            if not self._openai_client:
                raise ValueError("OpenAI client not available")
            return self._openai_client
        elif provider == AIProvider.ANTHROPIC:
            if not self._anthropic_client:
                raise ValueError("Anthropic client not available")
            return self._anthropic_client
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def _get_model(self, provider: AIProvider, model: Optional[str]) -> str:
        """Get the model name for the provider"""
        if model:
            return model

        if provider == AIProvider.OPENAI:
            return self.settings.default_openai_model
        elif provider == AIProvider.ANTHROPIC:
            return self.settings.default_anthropic_model
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def _prepare_issue_content(
        self, issue: IssueData, include_comments: bool = True, max_length: int = 15000
    ) -> str:
        """Prepare issue content for AI processing"""
        content_parts = []

        # Add title and body
        content_parts.append(f"Title: {issue.title}")
        content_parts.append(f"Description:\n{issue.body}")

        # Add metadata
        content_parts.append(f"State: {issue.state}")
        if issue.labels:
            content_parts.append(f"Labels: {', '.join(issue.labels)}")
        content_parts.append(f"Author: {issue.user}")

        # Add comments if requested
        if include_comments and issue.comments:
            content_parts.append(f"\nComments ({len(issue.comments)}):")
            for i, comment in enumerate(issue.comments, 1):
                content_parts.append(f"Comment {i} by {comment.user}:\n{comment.body}")

        content = "\n\n".join(content_parts)

        # Truncate if too long
        if len(content) > max_length:
            logger.warning(f"Content truncated from {len(content)} to {max_length} characters")
            content = content[:max_length] + "\n\n[Content truncated...]"

        return content

    def _create_summarization_prompt(self, content: str, language: str = "ja") -> str:
        """Create prompt for issue summarization"""
        if language == "ja":
            return f"""以下のGitHub Issueを分析し、構造化された要約を作成してください。

{content}

以下の形式で回答してください：

## 要約
課題の概要を2-3文で簡潔に説明

## 重要なポイント
- 主要な問題点や要求
- 技術的な詳細
- 影響範囲

## カテゴリ
以下から最も適切なものを選択: bug-fix, feature-request, documentation, maintenance, question

## 複雑度
以下から選択: low, medium, high

## 推奨アクション
具体的な次のステップや解決策"""
        else:
            return f"""Analyze the following GitHub Issue and create a structured summary.

{content}

Please respond in the following format:

## Summary
Concise 2-3 sentence overview of the issue

## Key Points
- Main problems or requirements
- Technical details
- Impact scope

## Category
Choose the most appropriate: bug-fix, feature-request, documentation, maintenance, question

## Complexity
Choose: low, medium, high

## Recommended Actions
Specific next steps or solutions"""

    async def summarize_issue(
        self,
        issue: IssueData,
        provider: AIProvider = AIProvider.OPENAI,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        include_comments: bool = True,
        language: str = "ja",
    ) -> Dict[str, Any]:
        """Summarize a GitHub issue using AI"""
        start_time = time.time()

        # Prepare content
        content = self._prepare_issue_content(issue, include_comments)
        prompt = self._create_summarization_prompt(content, language)

        # Get model configuration
        model_name = self._get_model(provider, model)
        max_tokens = max_tokens or self.settings.max_tokens
        temperature = temperature or self.settings.temperature

        try:
            if provider == AIProvider.OPENAI:
                result = await self._summarize_with_openai(
                    prompt, model_name, max_tokens, temperature
                )
            elif provider == AIProvider.ANTHROPIC:
                result = await self._summarize_with_anthropic(
                    prompt, model_name, max_tokens, temperature
                )
            else:
                raise ValueError(f"Unsupported provider: {provider}")

            # Parse the structured response
            parsed_result = self._parse_summarization_response(result["content"])

            processing_time = time.time() - start_time

            return {
                "summary": parsed_result.get("summary", "Summary not available"),
                "key_points": parsed_result.get("key_points", []),
                "category": parsed_result.get("category", "general"),
                "complexity": parsed_result.get("complexity", "medium"),
                "recommended_actions": parsed_result.get("recommended_actions", []),
                "processing_time": processing_time,
                "provider_used": provider,
                "model_used": model_name,
                "token_usage": result.get("token_usage", {}),
            }

        except Exception as e:
            logger.error(f"AI summarization failed: {str(e)}")
            raise

    async def _summarize_with_openai(
        self, prompt: str, model: str, max_tokens: int, temperature: float
    ) -> Dict[str, Any]:
        """Summarize using OpenAI API with comprehensive error handling"""
        client = self._get_client(AIProvider.OPENAI)

        for attempt in range(3):  # Retry up to 3 times
            try:
                response = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert technical analyst specializing in GitHub issue analysis and summarization.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=self.settings.request_timeout,
                )

                return {
                    "content": response.choices[0].message.content,
                    "token_usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens,
                    },
                }

            except openai.RateLimitError as e:
                error_info = self._parse_openai_rate_limit_error(e)
                logger.warning(
                    f"OpenAI rate limit hit (attempt {attempt + 1}/3): {error_info.message}"
                )

                if error_info.quota_exceeded:
                    logger.error("OpenAI quota exceeded - cannot retry")
                    raise ValueError(f"OpenAI quota exceeded: {error_info.message}")

                if attempt < 2 and error_info.retry_after:
                    await asyncio.sleep(min(error_info.retry_after, 60))  # Cap at 60 seconds
                    continue
                else:
                    raise ValueError(f"OpenAI rate limit: {error_info.message}")

            except openai.APIConnectionError as e:
                logger.warning(f"OpenAI connection error (attempt {attempt + 1}/3): {str(e)}")
                if attempt < 2:
                    await asyncio.sleep(2**attempt)  # Exponential backoff
                    continue
                else:
                    raise ValueError(f"OpenAI connection failed after 3 attempts: {str(e)}")

            except openai.APIStatusError as e:
                if e.status_code >= 500:  # Server errors - retry
                    logger.warning(
                        f"OpenAI server error (attempt {attempt + 1}/3): {e.status_code} - {str(e)}"
                    )
                    if attempt < 2:
                        await asyncio.sleep(2**attempt)
                        continue
                else:  # Client errors - don't retry
                    logger.error(f"OpenAI client error: {e.status_code} - {str(e)}")
                    raise ValueError(f"OpenAI API error: {str(e)}")

            except (httpx.TimeoutException, asyncio.TimeoutError) as e:
                logger.warning(f"OpenAI timeout (attempt {attempt + 1}/3): {str(e)}")
                if attempt < 2:
                    await asyncio.sleep(2**attempt)
                    continue
                else:
                    raise ValueError("OpenAI request timeout after 3 attempts")

            except Exception as e:
                logger.error(f"Unexpected OpenAI error: {str(e)}")
                raise ValueError(f"OpenAI API error: {str(e)}")

        raise ValueError("OpenAI API failed after all retry attempts")

    async def _summarize_with_anthropic(
        self, prompt: str, model: str, max_tokens: int, temperature: float
    ) -> Dict[str, Any]:
        """Summarize using Anthropic API with comprehensive error handling"""
        client = self._get_client(AIProvider.ANTHROPIC)

        for attempt in range(3):  # Retry up to 3 times
            try:
                response = await client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[
                        {
                            "role": "user",
                            "content": f"You are an expert technical analyst. {prompt}",
                        }
                    ],
                )

                return {
                    "content": response.content[0].text,
                    "token_usage": {
                        "prompt_tokens": response.usage.input_tokens,
                        "completion_tokens": response.usage.output_tokens,
                        "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
                    },
                }

            except anthropic.RateLimitError as e:
                error_info = self._parse_anthropic_rate_limit_error(e)
                logger.warning(
                    f"Anthropic rate limit hit (attempt {attempt + 1}/3): {error_info.message}"
                )

                if error_info.quota_exceeded:
                    logger.error("Anthropic quota exceeded - cannot retry")
                    raise ValueError(f"Anthropic quota exceeded: {error_info.message}")

                if attempt < 2 and error_info.retry_after:
                    await asyncio.sleep(min(error_info.retry_after, 60))  # Cap at 60 seconds
                    continue
                else:
                    raise ValueError(f"Anthropic rate limit: {error_info.message}")

            except anthropic.APIConnectionError as e:
                logger.warning(f"Anthropic connection error (attempt {attempt + 1}/3): {str(e)}")
                if attempt < 2:
                    await asyncio.sleep(2**attempt)  # Exponential backoff
                    continue
                else:
                    raise ValueError(f"Anthropic connection failed after 3 attempts: {str(e)}")

            except anthropic.APIStatusError as e:
                if e.status_code >= 500:  # Server errors - retry
                    logger.warning(
                        f"Anthropic server error (attempt {attempt + 1}/3): {e.status_code} - {str(e)}"
                    )
                    if attempt < 2:
                        await asyncio.sleep(2**attempt)
                        continue
                else:  # Client errors - don't retry
                    logger.error(f"Anthropic client error: {e.status_code} - {str(e)}")
                    raise ValueError(f"Anthropic API error: {str(e)}")

            except (httpx.TimeoutException, asyncio.TimeoutError) as e:
                logger.warning(f"Anthropic timeout (attempt {attempt + 1}/3): {str(e)}")
                if attempt < 2:
                    await asyncio.sleep(2**attempt)
                    continue
                else:
                    raise ValueError("Anthropic request timeout after 3 attempts")

            except Exception as e:
                logger.error(f"Unexpected Anthropic error: {str(e)}")
                raise ValueError(f"Anthropic API error: {str(e)}")

        raise ValueError("Anthropic API failed after all retry attempts")

    def _parse_summarization_response(self, content: str) -> Dict[str, Any]:
        """Parse structured AI response into components"""
        result = {
            "summary": "",
            "key_points": [],
            "category": "general",
            "complexity": "medium",
            "recommended_actions": [],
        }

        try:
            lines = content.split("\n")
            current_section = None

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Detect sections
                if line.startswith("## 要約") or line.startswith("## Summary"):
                    current_section = "summary"
                    continue
                elif line.startswith("## 重要なポイント") or line.startswith("## Key Points"):
                    current_section = "key_points"
                    continue
                elif line.startswith("## カテゴリ") or line.startswith("## Category"):
                    current_section = "category"
                    continue
                elif line.startswith("## 複雑度") or line.startswith("## Complexity"):
                    current_section = "complexity"
                    continue
                elif line.startswith("## 推奨アクション") or line.startswith(
                    "## Recommended Actions"
                ):
                    current_section = "recommended_actions"
                    continue

                # Process content based on current section
                if current_section == "summary":
                    if result["summary"]:
                        result["summary"] += " " + line
                    else:
                        result["summary"] = line
                elif current_section == "key_points":
                    if line.startswith("- "):
                        result["key_points"].append(line[2:])
                elif current_section == "category":
                    # Extract category name
                    category_line = line.lower()
                    if "bug" in category_line:
                        result["category"] = "bug-fix"
                    elif "feature" in category_line:
                        result["category"] = "feature-request"
                    elif "doc" in category_line:
                        result["category"] = "documentation"
                    elif "maintenance" in category_line:
                        result["category"] = "maintenance"
                    elif "question" in category_line:
                        result["category"] = "question"
                elif current_section == "complexity":
                    complexity_line = line.lower()
                    if "low" in complexity_line:
                        result["complexity"] = "low"
                    elif "high" in complexity_line:
                        result["complexity"] = "high"
                    else:
                        result["complexity"] = "medium"
                elif current_section == "recommended_actions":
                    if line.startswith("- "):
                        result["recommended_actions"].append(line[2:])
                    elif line and not line.startswith("#"):
                        result["recommended_actions"].append(line)

        except Exception as e:
            logger.warning(f"Failed to parse AI response: {str(e)}")
            # Fallback to basic parsing
            result["summary"] = content[:500] + "..." if len(content) > 500 else content

        return result

    def _parse_openai_rate_limit_error(self, error: openai.RateLimitError) -> APIError:
        """Parse OpenAI rate limit error for retry logic"""
        error_message = str(error)

        # Check for quota exceeded
        quota_exceeded = any(
            phrase in error_message.lower()
            for phrase in ["quota exceeded", "insufficient quota", "billing", "usage limit"]
        )

        # Extract retry-after if available
        retry_after = None
        if hasattr(error, "response") and error.response:
            retry_after = error.response.headers.get("retry-after")
            if retry_after:
                try:
                    retry_after = int(retry_after)
                except ValueError:
                    retry_after = None

        return APIError(
            error_type="rate_limit",
            message=error_message,
            retry_after=retry_after,
            quota_exceeded=quota_exceeded,
        )

    def _parse_anthropic_rate_limit_error(self, error: anthropic.RateLimitError) -> APIError:
        """Parse Anthropic rate limit error for retry logic"""
        error_message = str(error)

        # Check for quota exceeded
        quota_exceeded = any(
            phrase in error_message.lower()
            for phrase in ["quota exceeded", "insufficient quota", "billing", "usage limit"]
        )

        # Extract retry-after if available
        retry_after = None
        if hasattr(error, "response") and error.response:
            retry_after = error.response.headers.get("retry-after")
            if retry_after:
                try:
                    retry_after = int(retry_after)
                except ValueError:
                    retry_after = None

        return APIError(
            error_type="rate_limit",
            message=error_message,
            retry_after=retry_after,
            quota_exceeded=quota_exceeded,
        )
