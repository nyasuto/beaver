"""
Tests for ClassificationService

GitHub Issues分類エンジンのテスト
"""

import os
import sys
from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain.schema import AIMessage

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Settings
from models.classification import ClassificationResult, Issue
from services.classifier import ClassificationService


@pytest.fixture
def mock_settings() -> Settings:
    """Mock settings for testing"""
    return Settings(
        openai_api_key="test-key",
        openai_model="gpt-3.5-turbo",
        openai_temperature=0.1,
        openai_max_tokens=500,
        confidence_threshold=0.7,
        max_retries=3,
        request_timeout=30,
    )


@pytest.fixture
def sample_issue() -> Issue:
    """Sample issue for testing"""
    return Issue(
        id=123,
        title="APIエンドポイントが500エラーを返す",
        body="ユーザー登録時にAPIエンドポイント /api/users が500エラーを返します。ログを確認したところ、データベース接続エラーが発生しているようです。",
        labels=["bug"],
        repository="test/repo",
    )


@pytest.fixture
def classification_service(mock_settings: Settings) -> ClassificationService:
    """Classification service for testing"""
    service = ClassificationService(mock_settings)
    return service


class TestClassificationService:
    """Test ClassificationService class"""

    def test_init(self, mock_settings: Settings) -> None:
        """Test service initialization"""
        service = ClassificationService(mock_settings)

        assert service.settings == mock_settings
        assert service.llm is None
        assert not service._model_loaded
        assert not service._api_accessible
        assert len(service.categories) == 5
        assert "bug-fix" in service.categories
        assert "feature-request" in service.categories

    @pytest.mark.asyncio
    async def test_initialize_success(
        self, classification_service: ClassificationService, mock_settings: Settings
    ) -> None:
        """Test successful initialization"""
        with patch.object(classification_service, "_test_api_connection") as mock_test:
            mock_test.return_value = None

            await classification_service.initialize()

            assert classification_service.llm is not None
            assert classification_service._model_loaded
            assert classification_service._api_accessible

    @pytest.mark.asyncio
    async def test_initialize_no_api_key(self, mock_settings: Settings) -> None:
        """Test initialization without API key"""
        mock_settings.openai_api_key = ""
        service = ClassificationService(mock_settings)

        with pytest.raises(ValueError, match="OpenAI API key is required"):
            await service.initialize()

    def test_create_classification_prompt(
        self, classification_service: ClassificationService, sample_issue: Issue
    ) -> None:
        """Test prompt creation"""
        messages = classification_service._create_classification_prompt(sample_issue)

        assert len(messages) == 2
        assert "GitHub Issuesを自動分類する" in messages[0].content
        assert sample_issue.title in messages[1].content
        assert sample_issue.body in messages[1].content

    @pytest.mark.asyncio
    async def test_classify_issue_success(
        self, classification_service: ClassificationService, sample_issue: Issue
    ) -> None:
        """Test successful issue classification"""
        # Mock LLM response
        mock_response = AIMessage(
            content="""
        {
            "category": "bug-fix",
            "confidence": 0.9,
            "reasoning": "APIエラーとデータベース接続問題が記載されているため",
            "suggested_tags": ["api", "database", "error-500"]
        }
        """
        )

        classification_service.llm = AsyncMock()
        classification_service.llm.ainvoke.return_value = mock_response

        result = await classification_service.classify_issue(sample_issue)

        assert isinstance(result, ClassificationResult)
        assert result.issue_id == sample_issue.id
        assert result.category == "bug-fix"
        assert result.confidence == 0.9
        assert "APIエラー" in result.reasoning
        assert "api" in result.suggested_tags

    @pytest.mark.asyncio
    async def test_classify_issue_api_error(
        self, classification_service: ClassificationService, sample_issue: Issue
    ) -> None:
        """Test classification with API error"""
        classification_service.llm = AsyncMock()
        classification_service.llm.ainvoke.side_effect = Exception("API Error")

        result = await classification_service.classify_issue(sample_issue)

        assert isinstance(result, ClassificationResult)
        assert result.issue_id == sample_issue.id
        assert result.category == "troubleshooting"  # Fallback
        assert result.confidence == 0.0
        assert "分類エラーが発生しました" in result.reasoning

    def test_parse_classification_response_success(
        self, classification_service: ClassificationService
    ) -> None:
        """Test successful response parsing"""
        response_text = """
        {
            "category": "feature-request",
            "confidence": 0.8,
            "reasoning": "新機能の提案です",
            "suggested_tags": ["enhancement", "ui"]
        }
        """

        result = classification_service._parse_classification_response(response_text, 123)

        assert result.issue_id == 123
        assert result.category == "feature-request"
        assert result.confidence == 0.8
        assert result.reasoning == "新機能の提案です"
        assert result.suggested_tags == ["enhancement", "ui"]

    def test_parse_classification_response_invalid_category(
        self, classification_service: ClassificationService
    ) -> None:
        """Test parsing with invalid category"""
        response_text = """
        {
            "category": "invalid-category",
            "confidence": 0.8,
            "reasoning": "テスト",
            "suggested_tags": []
        }
        """

        result = classification_service._parse_classification_response(response_text, 123)

        assert result.category == "troubleshooting"  # Fallback

    def test_parse_classification_response_invalid_json(
        self, classification_service: ClassificationService
    ) -> None:
        """Test parsing with invalid JSON"""
        response_text = "This is not JSON"

        result = classification_service._parse_classification_response(response_text, 123)

        assert result.issue_id == 123
        assert result.category == "troubleshooting"
        assert result.confidence == 0.0
        assert "レスポンス解析エラー" in result.reasoning

    @pytest.mark.asyncio
    async def test_batch_classify_parallel(
        self, classification_service: ClassificationService
    ) -> None:
        """Test parallel batch classification"""
        issues = [
            Issue(id=1, title="Bug", body="Error occurred", labels=[], repository="test"),
            Issue(id=2, title="Feature", body="Add new feature", labels=[], repository="test"),
        ]

        # Mock successful responses
        mock_results = [
            ClassificationResult(
                issue_id=1, category="bug-fix", confidence=0.9, reasoning="Bug", suggested_tags=[]
            ),
            ClassificationResult(
                issue_id=2,
                category="feature-request",
                confidence=0.8,
                reasoning="Feature",
                suggested_tags=[],
            ),
        ]

        with patch.object(classification_service, "classify_issue") as mock_classify:
            mock_classify.side_effect = mock_results

            results = await classification_service.batch_classify_issues(issues, parallel=True)

            assert len(results) == 2
            assert results[0] is not None and results[0].issue_id == 1
            assert results[1] is not None and results[1].issue_id == 2

    @pytest.mark.asyncio
    async def test_batch_classify_sequential(
        self, classification_service: ClassificationService
    ) -> None:
        """Test sequential batch classification"""
        issues = [Issue(id=1, title="Bug", body="Error", labels=[], repository="test")]

        mock_result = ClassificationResult(
            issue_id=1, category="bug-fix", confidence=0.9, reasoning="Bug", suggested_tags=[]
        )

        with patch.object(classification_service, "classify_issue") as mock_classify:
            mock_classify.return_value = mock_result

            results = await classification_service.batch_classify_issues(issues, parallel=False)

            assert len(results) == 1
            assert results[0] is not None and results[0].issue_id == 1

    @pytest.mark.asyncio
    async def test_health_check_success(
        self, classification_service: ClassificationService
    ) -> None:
        """Test successful health check"""
        classification_service.llm = AsyncMock()
        classification_service.llm.ainvoke.return_value = AIMessage(content="OK")

        result = await classification_service.health_check()

        assert result is True

    @pytest.mark.asyncio
    async def test_health_check_failure(
        self, classification_service: ClassificationService
    ) -> None:
        """Test health check failure"""
        classification_service.llm = AsyncMock()
        classification_service.llm.ainvoke.side_effect = Exception("Connection failed")

        result = await classification_service.health_check()

        assert result is False

    def test_is_model_loaded(self, classification_service: ClassificationService) -> None:
        """Test model loaded check"""
        assert not classification_service.is_model_loaded()

        classification_service._model_loaded = True
        assert classification_service.is_model_loaded()

    def test_is_api_accessible(self, classification_service: ClassificationService) -> None:
        """Test API accessible check"""
        assert not classification_service.is_api_accessible()

        classification_service._api_accessible = True
        assert classification_service.is_api_accessible()

    def test_get_memory_usage(self, classification_service: ClassificationService) -> None:
        """Test memory usage measurement"""
        memory = classification_service.get_memory_usage()

        # Should return a positive number or None
        assert memory is None or (isinstance(memory, float) and memory > 0)

    @pytest.mark.asyncio
    async def test_cleanup(self, classification_service: ClassificationService) -> None:
        """Test cleanup"""
        classification_service.llm = Mock()
        classification_service._model_loaded = True
        classification_service._api_accessible = True

        await classification_service.cleanup()

        assert classification_service.llm is None
        assert not classification_service._model_loaded
        assert not classification_service._api_accessible


@pytest.mark.asyncio
async def test_classification_integration() -> None:
    """Integration test for classification flow"""
    settings = Settings(openai_api_key="test-key", openai_model="gpt-3.5-turbo")

    service = ClassificationService(settings)

    # Test without actual API call
    issue = Issue(
        id=999,
        title="テスト用Issue",
        body="これはテスト用のIssueです",
        labels=["test"],
        repository="test/repo",
    )

    # Test prompt creation (no API call)
    messages = service._create_classification_prompt(issue)
    assert len(messages) == 2
    assert "テスト用Issue" in messages[1].content


if __name__ == "__main__":
    pytest.main([__file__])
