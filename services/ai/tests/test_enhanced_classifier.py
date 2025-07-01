"""
Tests for Enhanced Classification Service

拡張分類サービスのテスト
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain.schema import AIMessage

from config import Settings
from models.classification import ClassificationResult, Issue
from models.topic_model import get_enhanced_topic_model
from services.enhanced_classifier import EnhancedClassificationService


@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    return Settings(
        openai_api_key="test-key",
        openai_model="gpt-3.5-turbo",
        openai_temperature=0.1,
        openai_max_tokens=800,
        confidence_threshold=0.7,
        max_retries=3,
        request_timeout=30,
    )


@pytest.fixture
def sample_issue():
    """Sample issue for testing"""
    return Issue(
        id=123,
        title="NullPointerException in authentication service",
        body="The authentication service throws NullPointerException when processing requests with empty username. Stack trace: at AuthService.authenticate(AuthService.java:45)",
        labels=["bug", "authentication"],
        repository="test/auth-service",
    )


@pytest.fixture
def enhanced_classification_service(mock_settings):
    """Enhanced classification service for testing"""
    service = EnhancedClassificationService(mock_settings)
    return service


class TestEnhancedClassificationService:
    """Test Enhanced ClassificationService class"""

    def test_init(self, mock_settings):
        """Test enhanced service initialization"""
        service = EnhancedClassificationService(mock_settings)

        assert service.settings == mock_settings
        assert service.llm is None
        assert not service._model_loaded
        assert not service._api_accessible
        assert service.topic_model is not None
        assert len(service.topic_model.few_shot_examples) > 0

    @pytest.mark.asyncio
    async def test_initialize_success(self, enhanced_classification_service):
        """Test successful enhanced initialization"""
        with patch.object(enhanced_classification_service, "_test_api_connection") as mock_test:
            mock_test.return_value = None

            await enhanced_classification_service.initialize()

            assert enhanced_classification_service.llm is not None
            assert enhanced_classification_service._model_loaded
            assert enhanced_classification_service._api_accessible

    @pytest.mark.asyncio
    async def test_classify_issue_enhanced_success(
        self, enhanced_classification_service, sample_issue
    ):
        """Test successful enhanced issue classification"""
        # Mock LLM response with enhanced format
        mock_response = AIMessage(
            content="""
        ```json
        {
            "category": "bug-fix",
            "confidence": 0.92,
            "reasoning": "スタックトレースと例外の詳細があり、明確なバグ報告",
            "suggested_tags": ["authentication", "exception", "null-pointer"],
            "detected_language": "en",
            "key_indicators": ["stack trace", "exception details", "reproducible issue"]
        }
        ```
        """
        )

        enhanced_classification_service.llm = AsyncMock()
        enhanced_classification_service.llm.ainvoke.return_value = mock_response

        result = await enhanced_classification_service.classify_issue_enhanced(
            sample_issue, use_few_shot=True
        )

        assert isinstance(result, ClassificationResult)
        assert result.issue_id == sample_issue.id
        assert result.category == "bug-fix"
        assert result.confidence == 0.92
        assert "スタックトレース" in result.reasoning
        assert "authentication" in result.suggested_tags

    @pytest.mark.asyncio
    async def test_classify_issue_enhanced_with_few_shot(
        self, enhanced_classification_service, sample_issue
    ):
        """Test enhanced classification with few-shot learning"""
        # Mock LLM response
        mock_response = AIMessage(
            content="""
        ```json
        {
            "category": "bug-fix",
            "confidence": 0.95,
            "reasoning": "Few-shot学習により高精度で分類",
            "suggested_tags": ["bug", "fix", "urgent"],
            "detected_language": "en",
            "key_indicators": ["error message", "stack trace"]
        }
        ```
        """
        )

        enhanced_classification_service.llm = AsyncMock()
        enhanced_classification_service.llm.ainvoke.return_value = mock_response

        result = await enhanced_classification_service.classify_issue_enhanced(
            sample_issue, use_few_shot=True
        )

        assert result.confidence >= 0.9  # Few-shot should improve confidence
        assert len(enhanced_classification_service.classification_history) == 1

    @pytest.mark.asyncio
    async def test_batch_classify_issues_enhanced(self, enhanced_classification_service):
        """Test enhanced batch classification"""
        issues = [
            Issue(id=1, title="Bug report", body="Error occurred", labels=[], repository="test"),
            Issue(
                id=2, title="Feature request", body="Add new feature", labels=[], repository="test"
            ),
        ]

        mock_results = [
            ClassificationResult(
                issue_id=1,
                category="bug-fix",
                confidence=0.9,
                reasoning="Bug",
                suggested_tags=[],
                processing_time_ms=200,
            ),
            ClassificationResult(
                issue_id=2,
                category="feature-request",
                confidence=0.8,
                reasoning="Feature",
                suggested_tags=[],
                processing_time_ms=180,
            ),
        ]

        with patch.object(
            enhanced_classification_service, "classify_issue_enhanced"
        ) as mock_classify:
            mock_classify.side_effect = mock_results

            results = await enhanced_classification_service.batch_classify_issues_enhanced(
                issues, parallel=True, use_few_shot=True
            )

            assert len(results) == 2
            assert results[0].issue_id == 1
            assert results[1].issue_id == 2

    def test_update_performance_metrics(self, enhanced_classification_service):
        """Test performance metrics update"""
        enhanced_classification_service._update_performance_metrics(1500, 0.85)
        enhanced_classification_service._update_performance_metrics(2000, 0.90)

        metrics = enhanced_classification_service.performance_metrics
        assert len(metrics["response_times"]) == 2
        assert len(metrics["confidences"]) == 2
        assert 1500 in metrics["response_times"]
        assert 0.85 in metrics["confidences"]

    def test_get_performance_summary(self, enhanced_classification_service):
        """Test performance summary generation"""
        # Add some test data
        enhanced_classification_service._update_performance_metrics(1000, 0.9)
        enhanced_classification_service._update_performance_metrics(1500, 0.8)
        enhanced_classification_service._update_performance_metrics(2000, 0.7)

        summary = enhanced_classification_service.get_performance_summary()

        assert summary["total_classifications"] == 3
        assert summary["average_response_time_ms"] == 1500.0
        assert summary["average_confidence"] == 0.8
        assert summary["high_confidence_ratio"] == 2 / 3  # 2 out of 3 >= 0.8

    @pytest.mark.asyncio
    async def test_health_check_enhanced(self, enhanced_classification_service):
        """Test enhanced health check"""
        enhanced_classification_service._model_loaded = True
        enhanced_classification_service._api_accessible = True

        # Mock basic health check
        with patch.object(enhanced_classification_service, "_basic_health_check") as mock_health:
            mock_health.return_value = True

            health_status = await enhanced_classification_service.health_check_enhanced()

            assert health_status["status"] == "healthy"
            assert health_status["api_accessible"] is True
            assert health_status["model_loaded"] is True
            assert "few_shot_examples" in health_status
            assert "performance" in health_status

    @pytest.mark.asyncio
    async def test_evaluate_classification_accuracy(self, enhanced_classification_service):
        """Test classification accuracy evaluation"""
        test_issues = [
            Issue(id=1, title="Bug", body="Error", labels=[], repository="test"),
            Issue(id=2, title="Feature", body="New feature", labels=[], repository="test"),
        ]
        expected_categories = ["bug-fix", "feature-request"]

        # Mock classification results
        mock_results = [
            ClassificationResult(
                issue_id=1,
                category="bug-fix",
                confidence=0.9,
                reasoning="Correct",
                suggested_tags=[],
                processing_time_ms=1000,
            ),
            ClassificationResult(
                issue_id=2,
                category="feature-request",
                confidence=0.8,
                reasoning="Correct",
                suggested_tags=[],
                processing_time_ms=1200,
            ),
        ]

        with patch.object(
            enhanced_classification_service, "batch_classify_issues_enhanced"
        ) as mock_batch:
            mock_batch.return_value = mock_results

            metrics = await enhanced_classification_service.evaluate_classification_accuracy(
                test_issues, expected_categories
            )

            assert metrics.accuracy == 1.0  # 100% correct
            assert metrics.total_classified == 2
            assert metrics.average_response_time_ms == 1100.0

    @pytest.mark.asyncio
    async def test_cleanup(self, enhanced_classification_service):
        """Test enhanced cleanup"""
        enhanced_classification_service.llm = Mock()
        enhanced_classification_service._model_loaded = True
        enhanced_classification_service._api_accessible = True
        enhanced_classification_service.classification_history.append(("test", "result"))
        enhanced_classification_service.performance_metrics["test"] = "data"

        await enhanced_classification_service.cleanup()

        assert enhanced_classification_service.llm is None
        assert not enhanced_classification_service._model_loaded
        assert not enhanced_classification_service._api_accessible
        assert len(enhanced_classification_service.classification_history) == 0
        assert len(enhanced_classification_service.performance_metrics) == 0


class TestTopicModelIntegration:
    """Test topic model integration"""

    def test_topic_model_categories(self):
        """Test enhanced categories structure"""
        topic_model = get_enhanced_topic_model()

        assert len(topic_model.enhanced_categories) == 5

        for _cat_id, cat_info in topic_model.enhanced_categories.items():
            assert "name_ja" in cat_info
            assert "name_en" in cat_info
            assert "description_ja" in cat_info
            assert "description_en" in cat_info
            assert "keywords_ja" in cat_info
            assert "keywords_en" in cat_info
            assert "indicators" in cat_info

    def test_language_detection(self):
        """Test language detection functionality"""
        topic_model = get_enhanced_topic_model()

        # Japanese text
        ja_text = "これは日本語のテストです"
        assert topic_model.detect_language(ja_text).value == "ja"

        # English text
        en_text = "This is an English test"
        assert topic_model.detect_language(en_text).value == "en"

        # Mixed text with Japanese characters
        mixed_text = "This is テスト mixed text"
        assert topic_model.detect_language(mixed_text).value == "ja"

    def test_few_shot_examples_creation(self):
        """Test few-shot examples creation"""
        topic_model = get_enhanced_topic_model()
        examples = topic_model.create_few_shot_examples()

        assert len(examples) >= 10  # Should have at least 10 examples

        # Check example structure
        for example in examples:
            assert hasattr(example, "issue")
            assert hasattr(example, "expected_category")
            assert hasattr(example, "expected_confidence")
            assert hasattr(example, "reasoning")
            assert hasattr(example, "language")

    def test_enhanced_prompt_creation(self, sample_issue):
        """Test enhanced prompt creation"""
        topic_model = get_enhanced_topic_model()
        topic_model.create_few_shot_examples()

        messages = topic_model.create_enhanced_prompt(sample_issue, use_few_shot=True)

        assert len(messages) >= 3  # System + examples + user
        assert any("GitHub Issues" in str(msg.content) for msg in messages)

        # Test without few-shot
        messages_no_fs = topic_model.create_enhanced_prompt(sample_issue, use_few_shot=False)
        assert len(messages_no_fs) == 2  # System + user only

    def test_optimization_recommendations(self):
        """Test optimization recommendations"""
        topic_model = get_enhanced_topic_model()
        recommendations = topic_model.get_optimization_recommendations()

        assert "prompt_optimization" in recommendations
        assert "model_configuration" in recommendations
        assert "evaluation_strategy" in recommendations

        # Check model configuration
        config = recommendations["model_configuration"]
        assert "temperature" in config
        assert "max_tokens" in config
        assert config["temperature"] <= 0.2  # Should be low for consistency


@pytest.mark.asyncio
async def test_enhanced_integration():
    """Integration test for enhanced classification"""
    settings = Settings(openai_api_key="test-key", openai_model="gpt-3.5-turbo")

    service = EnhancedClassificationService(settings)

    # Test issue
    issue = Issue(
        id=999,
        title="Enhanced integration test",
        body="This is a test issue for enhanced classification",
        labels=["test"],
        repository="test/integration",
    )

    # Test prompt creation (no API call)
    messages = service.topic_model.create_enhanced_prompt(issue, use_few_shot=True)
    assert len(messages) >= 3

    # Test language detection
    language = service.topic_model.detect_language(f"{issue.title} {issue.body}")
    assert language.value in ["ja", "en"]


if __name__ == "__main__":
    pytest.main([__file__])
