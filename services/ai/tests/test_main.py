"""
Tests for FastAPI application

メインアプリケーションのテスト
"""

import os
import sys
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from models.classification import ClassificationResult


@pytest.fixture
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def mock_classification_service():
    """Mock classification service"""
    service = Mock()
    service.health_check = AsyncMock(return_value=True)
    service.is_model_loaded = Mock(return_value=True)
    service.is_api_accessible = Mock(return_value=True)
    service.get_memory_usage = Mock(return_value=128.5)
    return service


class TestHealthEndpoint:
    """Test health check endpoint"""

    def test_health_check_success(self, client, mock_classification_service):
        """Test successful health check"""
        with patch("main.classification_service", mock_classification_service):
            response = client.get("/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "AI Classification Service"
            assert "timestamp" in data
            assert "uptime_seconds" in data
            assert data["model_loaded"] is True
            assert data["api_accessible"] is True
            assert data["memory_usage_mb"] == 128.5

    def test_health_check_unhealthy(self, client, mock_classification_service):
        """Test unhealthy service"""
        mock_classification_service.health_check.return_value = False
        mock_classification_service.is_model_loaded.return_value = False

        with patch("main.classification_service", mock_classification_service):
            response = client.get("/health")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "unhealthy"


class TestClassifyEndpoint:
    """Test classification endpoint"""

    def test_classify_success(self, client, mock_classification_service):
        """Test successful issue classification"""
        # Mock classification result
        mock_result = ClassificationResult(
            issue_id=123,
            category="bug-fix",
            confidence=0.9,
            reasoning="APIエラーが報告されています",
            suggested_tags=["api", "error"],
            processing_time_ms=250,
            model_used="gpt-3.5-turbo",
        )

        mock_classification_service.classify_issue = AsyncMock(return_value=mock_result)

        with patch("main.classification_service", mock_classification_service):
            response = client.post(
                "/classify",
                json={
                    "issue": {
                        "id": 123,
                        "title": "API Error",
                        "body": "API returns 500 error",
                        "labels": ["bug"],
                        "repository": "test/repo",
                    }
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["issue_id"] == 123
            assert data["category"] == "bug-fix"
            assert data["confidence"] == 0.9
            assert data["reasoning"] == "APIエラーが報告されています"

    def test_classify_invalid_request(self, client):
        """Test classification with invalid request"""
        response = client.post("/classify", json={"invalid": "data"})

        assert response.status_code == 422  # Validation error

    def test_classify_missing_fields(self, client):
        """Test classification with missing required fields"""
        response = client.post("/classify", json={"issue": {"title": "Missing ID"}})

        assert response.status_code == 422

    def test_classify_service_error(self, client, mock_classification_service):
        """Test classification with service error"""
        mock_classification_service.classify_issue = AsyncMock(
            side_effect=Exception("Service unavailable")
        )

        with patch("main.classification_service", mock_classification_service):
            response = client.post(
                "/classify",
                json={
                    "issue": {
                        "id": 123,
                        "title": "Test Issue",
                        "body": "Test body",
                        "labels": [],
                        "repository": "test/repo",
                    }
                },
            )

            assert response.status_code == 500
            data = response.json()
            assert "error" in data["detail"]


class TestBatchClassifyEndpoint:
    """Test batch classification endpoint"""

    def test_batch_classify_success(self, client, mock_classification_service):
        """Test successful batch classification"""
        # Mock batch results
        mock_results = [
            ClassificationResult(
                issue_id=1,
                category="bug-fix",
                confidence=0.9,
                reasoning="Bug report",
                suggested_tags=["bug"],
                processing_time_ms=200,
                model_used="gpt-3.5-turbo",
            ),
            ClassificationResult(
                issue_id=2,
                category="feature-request",
                confidence=0.8,
                reasoning="Feature request",
                suggested_tags=["feature"],
                processing_time_ms=180,
                model_used="gpt-3.5-turbo",
            ),
        ]

        mock_classification_service.batch_classify_issues = AsyncMock(return_value=mock_results)

        with patch("main.classification_service", mock_classification_service):
            response = client.post(
                "/batch-classify",
                json={
                    "issues": [
                        {
                            "id": 1,
                            "title": "Bug Report",
                            "body": "Found a bug",
                            "labels": [],
                            "repository": "test/repo",
                        },
                        {
                            "id": 2,
                            "title": "Feature Request",
                            "body": "Need new feature",
                            "labels": [],
                            "repository": "test/repo",
                        },
                    ],
                    "config": {"confidence_threshold": 0.7},
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data["results"]) == 2
            assert data["summary"]["total_issues"] == 2
            assert data["summary"]["successful_classifications"] == 2
            assert data["summary"]["failed_classifications"] == 0

    def test_batch_classify_empty_list(self, client, mock_classification_service):
        """Test batch classification with empty issue list"""
        mock_classification_service.batch_classify_issues = AsyncMock(return_value=[])

        with patch("main.classification_service", mock_classification_service):
            response = client.post("/batch-classify", json={"issues": []})

            assert response.status_code == 200
            data = response.json()
            assert data["results"] == []
            assert data["summary"]["total_issues"] == 0

    def test_batch_classify_with_failures(self, client, mock_classification_service):
        """Test batch classification with some failures"""
        mock_results = [
            ClassificationResult(
                issue_id=1,
                category="bug-fix",
                confidence=0.9,
                reasoning="Success",
                suggested_tags=[],
                processing_time_ms=200,
                model_used="gpt-3.5-turbo",
            ),
            None,  # Failed classification
        ]

        mock_classification_service.batch_classify_issues = AsyncMock(return_value=mock_results)

        with patch("main.classification_service", mock_classification_service):
            response = client.post(
                "/batch-classify",
                json={
                    "issues": [
                        {
                            "id": 1,
                            "title": "Success",
                            "body": "This works",
                            "labels": [],
                            "repository": "test/repo",
                        },
                        {
                            "id": 2,
                            "title": "Failure",
                            "body": "This fails",
                            "labels": [],
                            "repository": "test/repo",
                        },
                    ]
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["summary"]["total_issues"] == 2
            assert data["summary"]["successful_classifications"] == 1
            assert data["summary"]["failed_classifications"] == 1


class TestApplicationLifespan:
    """Test application lifespan management"""

    @pytest.mark.asyncio
    async def test_startup_event(self):
        """Test application startup"""
        with patch("main.classification_service") as mock_service:
            mock_service.initialize = AsyncMock()

            # Import after patching to trigger startup
            from main import lifespan

            # Test startup
            async with lifespan(app):
                mock_service.initialize.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_event(self):
        """Test application shutdown"""
        with patch("main.classification_service") as mock_service:
            mock_service.initialize = AsyncMock()
            mock_service.cleanup = AsyncMock()

            from main import lifespan

            # Test full lifespan
            async with lifespan(app):
                pass

            mock_service.cleanup.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__])
