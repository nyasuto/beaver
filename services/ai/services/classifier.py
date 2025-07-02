"""
Classification Service using LangChain + OpenAI

GitHub Issues自動分類エンジンの実装
Zero-shot分類とFew-shot学習をサポート
"""

import asyncio
import time
from typing import Optional

import psutil
import structlog
from langchain.schema import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from config import Settings
from models.classification import ClassificationConfig, ClassificationResult, Issue

logger = structlog.get_logger()


class ClassificationService:
    """AI Classification Service using LangChain + OpenAI"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.llm: Optional[ChatOpenAI] = None
        self.start_time = time.time()
        self._model_loaded = False
        self._api_accessible = False

        # Classification categories with descriptions
        self.categories = {
            "bug-fix": {
                "name": "バグ修正",
                "description": "バグ報告、エラー修正、動作不良の解決に関するIssue",
                "keywords": ["bug", "error", "crash", "fix", "broken", "fails", "exception"],
            },
            "feature-request": {
                "name": "機能要求",
                "description": "新機能の提案・要求、既存機能の改善・拡張に関するIssue",
                "keywords": ["feature", "enhancement", "add", "improve", "request", "new"],
            },
            "architecture": {
                "name": "アーキテクチャ",
                "description": "システム設計・構造の変更、リファクタリング、性能改善、テスト戦略に関するIssue",
                "keywords": [
                    "design",
                    "architecture",
                    "refactor",
                    "structure",
                    "performance",
                    "test",
                    "coverage",
                ],
            },
            "learning": {
                "name": "学習・調査",
                "description": "技術調査・研究、学習用Issue、実験、プロトタイプ開発に関するIssue",
                "keywords": [
                    "research",
                    "investigate",
                    "study",
                    "learn",
                    "experiment",
                    "prototype",
                ],
            },
            "troubleshooting": {
                "name": "トラブルシューティング",
                "description": "使い方の質問、設定・環境問題、サポート要求に関するIssue",
                "keywords": ["help", "support", "troubleshoot", "question", "how to", "setup"],
            },
        }

    async def initialize(self) -> None:
        """Initialize the classification service"""
        try:
            logger.info("Initializing ClassificationService...")

            # Validate OpenAI API key
            if not self.settings.openai_api_key:
                raise ValueError("OpenAI API key is required")

            # Initialize LangChain ChatOpenAI
            from pydantic import SecretStr

            self.llm = ChatOpenAI(
                model=self.settings.openai_model,
                temperature=self.settings.openai_temperature,
                model_kwargs={"max_tokens": self.settings.openai_max_tokens},
                api_key=SecretStr(self.settings.openai_api_key),
                timeout=self.settings.request_timeout,
            )

            # Test API connectivity
            await self._test_api_connection()

            self._model_loaded = True
            self._api_accessible = True

            logger.info(
                "ClassificationService initialized successfully",
                model=self.settings.openai_model,
                categories=list(self.categories.keys()),
            )

        except Exception as e:
            logger.error(f"Failed to initialize ClassificationService: {e}")
            raise

    async def _test_api_connection(self) -> None:
        """Test OpenAI API connection"""
        try:
            test_messages = [
                SystemMessage(content="You are a test assistant."),
                HumanMessage(content="Say 'Hello' if you can respond."),
            ]

            if self.llm is None:
                raise ValueError("LLM not initialized")
            await self.llm.ainvoke(test_messages)
            logger.info("OpenAI API connection test successful")

        except Exception as e:
            logger.error(f"OpenAI API connection test failed: {e}")
            raise

    def _create_classification_prompt(
        self, issue: Issue, config: Optional[ClassificationConfig] = None
    ) -> list[BaseMessage]:
        """Create classification prompt for the issue"""

        # Prepare categories description
        categories_desc = []
        for cat_id, cat_info in self.categories.items():
            categories_desc.append(
                f"- {cat_id}: {cat_info['description']}\n"
                f"  キーワード例: {', '.join(cat_info['keywords'])}"
            )

        categories_text = "\n".join(categories_desc)

        # System prompt for classification
        system_prompt = f"""あなたはGitHub Issuesを自動分類する専門AIです。

以下の5つのカテゴリのいずれかに分類してください：

{categories_text}

回答は以下のJSON形式で返してください：
{{
  "category": "分類されたカテゴリID",
  "confidence": 0.0から1.0の信頼度スコア,
  "reasoning": "分類理由の簡潔な説明（日本語）",
  "suggested_tags": ["関連するタグのリスト"]
}}

分類時の注意点：
- Issue のタイトル、本文、既存ラベルを総合的に判断
- 日本語と英語の両方に対応
- 信頼度は慎重に評価し、曖昧な場合は低めに設定
- タグは具体的で有用なものを3-5個程度提案"""

        # Human prompt with issue details
        issue_text = f"""Issue ID: {issue.id}
タイトル: {issue.title}
本文:
{issue.body}

既存ラベル: {", ".join(issue.labels) if issue.labels else "なし"}
リポジトリ: {issue.repository or "N/A"}"""

        return [SystemMessage(content=system_prompt), HumanMessage(content=issue_text)]

    async def classify_issue(
        self, issue: Issue, config: Optional[ClassificationConfig] = None
    ) -> ClassificationResult:
        """Classify a single GitHub Issue"""
        start_time = time.time()

        try:
            # Create classification prompt
            messages = self._create_classification_prompt(issue, config)

            # Call OpenAI API via LangChain
            logger.debug(f"Sending classification request for issue {issue.id}")
            if self.llm is None:
                raise ValueError("LLM not initialized")
            response = await self.llm.ainvoke(messages)

            # Parse response
            content_str = str(response.content) if hasattr(response, "content") else str(response)
            result = self._parse_classification_response(content_str, issue.id)

            processing_time = int((time.time() - start_time) * 1000)
            result.processing_time_ms = processing_time
            result.model_used = self.settings.openai_model

            # Validate confidence threshold
            if config and result.confidence < config.confidence_threshold:
                logger.warning(
                    f"Low confidence classification for issue {issue.id}",
                    confidence=result.confidence,
                    threshold=config.confidence_threshold,
                )

            return result

        except Exception as e:
            logger.error(f"Classification failed for issue {issue.id}: {e}")
            # Return fallback result
            return ClassificationResult(
                issue_id=issue.id,
                category="troubleshooting",  # Default fallback category
                confidence=0.0,
                reasoning=f"分類エラーが発生しました: {str(e)}",
                suggested_tags=["error"],
                processing_time_ms=int((time.time() - start_time) * 1000),
                model_used=self.settings.openai_model,
            )

    def _parse_classification_response(
        self, response_text: str, issue_id: int
    ) -> ClassificationResult:
        """Parse OpenAI response into ClassificationResult"""
        import json
        import re

        try:
            # Try to extract JSON from response
            json_match = re.search(r"\{[^}]*\}", response_text, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")

            json_str = json_match.group(0)
            response_data = json.loads(json_str)

            # Validate required fields
            category = response_data.get("category", "").lower()
            if category not in self.categories:
                logger.warning(
                    f"Invalid category '{category}' for issue {issue_id}, using 'troubleshooting'"
                )
                category = "troubleshooting"

            confidence = float(response_data.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))  # Clamp to [0, 1]

            reasoning = response_data.get("reasoning", "分類理由が取得できませんでした")
            suggested_tags = response_data.get("suggested_tags", [])

            if not isinstance(suggested_tags, list):
                suggested_tags = []

            return ClassificationResult(
                issue_id=issue_id,
                category=category,
                confidence=confidence,
                reasoning=reasoning,
                suggested_tags=suggested_tags[:5],  # Limit to 5 tags
                processing_time_ms=0,  # Will be set by caller
                model_used=self.settings.openai_model,
            )

        except Exception as e:
            logger.error(f"Failed to parse classification response for issue {issue_id}: {e}")
            logger.debug(f"Response text: {response_text}")

            # Return fallback result
            return ClassificationResult(
                issue_id=issue_id,
                category="troubleshooting",
                confidence=0.0,
                reasoning=f"レスポンス解析エラー: {str(e)}",
                suggested_tags=["parse-error"],
                processing_time_ms=0,
                model_used=self.settings.openai_model,
            )

    async def batch_classify_issues(
        self,
        issues: list[Issue],
        config: Optional[ClassificationConfig] = None,
        parallel: bool = True,
    ) -> list[Optional[ClassificationResult]]:
        """Classify multiple issues in batch"""

        if not issues:
            return []

        logger.info(f"Starting batch classification for {len(issues)} issues", parallel=parallel)

        if parallel:
            # Parallel processing
            semaphore = asyncio.Semaphore(5)  # Limit concurrent requests

            async def classify_with_semaphore(issue: Issue) -> ClassificationResult:
                async with semaphore:
                    return await self.classify_issue(issue, config)

            tasks = [classify_with_semaphore(issue) for issue in issues]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle exceptions
            processed_results: list[Optional[ClassificationResult]] = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to classify issue {issues[i].id}: {result}")
                    processed_results.append(None)
                else:
                    processed_results.append(result)  # type: ignore[arg-type]

            return processed_results
        else:
            # Sequential processing
            sequential_results: list[Optional[ClassificationResult]] = []
            for issue in issues:
                try:
                    result = await self.classify_issue(issue, config)
                    sequential_results.append(result)
                except Exception as e:
                    logger.error(f"Failed to classify issue {issue.id}: {e}")
                    sequential_results.append(None)

            return sequential_results

    async def health_check(self) -> bool:
        """Perform health check"""
        try:
            if not self.llm:
                return False

            # Simple API test
            test_messages = [HumanMessage(content="Health check")]
            await self.llm.ainvoke(test_messages)
            return True

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

    def is_model_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._model_loaded

    def is_api_accessible(self) -> bool:
        """Check if API is accessible"""
        return self._api_accessible

    def get_memory_usage(self) -> Optional[float]:
        """Get current memory usage in MB"""
        try:
            process = psutil.Process()
            memory_mb = float(process.memory_info().rss) / 1024 / 1024
            return round(memory_mb, 2)
        except Exception:
            return None

    async def cleanup(self) -> None:
        """Cleanup resources"""
        logger.info("Cleaning up ClassificationService...")
        self.llm = None
        self._model_loaded = False
        self._api_accessible = False
