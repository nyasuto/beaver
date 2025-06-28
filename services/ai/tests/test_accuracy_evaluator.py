"""
Tests for Accuracy Evaluator

分類精度評価システムのテスト
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from evaluation.accuracy_evaluator import AccuracyEvaluator, create_accuracy_evaluator
from services.enhanced_classifier import EnhancedClassificationService
from models.classification import Issue, ClassificationResult
from models.topic_model import ClassificationMetrics
from config import Settings


@pytest.fixture
def mock_enhanced_service():
    """Mock enhanced classification service"""
    service = Mock(spec=EnhancedClassificationService)
    service.batch_classify_issues_enhanced = AsyncMock()
    return service


@pytest.fixture
def accuracy_evaluator(mock_enhanced_service):
    """Accuracy evaluator for testing"""
    return AccuracyEvaluator(mock_enhanced_service)


@pytest.fixture
def sample_test_cases():
    """Sample test cases for evaluation"""
    return [
        (Issue(
            id=1,
            title="NullPointerException in service",
            body="Application crashes with NPE",
            labels=["bug"],
            repository="test/service"
        ), "bug-fix"),
        (Issue(
            id=2,
            title="Add new API endpoint",
            body="Need to implement new REST endpoint",
            labels=["feature"],
            repository="test/api"
        ), "feature-request"),
        (Issue(
            id=3,
            title="Refactor database layer",
            body="Need to improve database performance",
            labels=["refactor"],
            repository="test/db"
        ), "architecture")
    ]


class TestAccuracyEvaluator:
    """Test AccuracyEvaluator class"""

    def test_init(self, mock_enhanced_service):
        """Test evaluator initialization"""
        evaluator = AccuracyEvaluator(mock_enhanced_service)
        
        assert evaluator.classification_service == mock_enhanced_service
        assert evaluator.test_cases == []
        assert evaluator.evaluation_history == []

    def test_create_benchmark_test_cases(self, accuracy_evaluator):
        """Test benchmark test cases creation"""
        test_cases = accuracy_evaluator.create_benchmark_test_cases()
        
        assert len(test_cases) >= 10  # Should have at least 10 cases
        assert accuracy_evaluator.test_cases == test_cases
        
        # Check test case structure
        for case in test_cases:
            issue, expected_category = case
            assert isinstance(issue, Issue)
            assert isinstance(expected_category, str)
            assert expected_category in ["bug-fix", "feature-request", "architecture", "learning", "troubleshooting"]

    def test_benchmark_test_cases_diversity(self, accuracy_evaluator):
        """Test benchmark test cases diversity"""
        test_cases = accuracy_evaluator.create_benchmark_test_cases()
        
        # Check category distribution
        categories = [case[1] for case in test_cases]
        unique_categories = set(categories)
        
        assert len(unique_categories) == 5  # All 5 categories should be represented
        
        # Check language diversity
        issues = [case[0] for case in test_cases]
        
        # Should have both Japanese and English issues
        japanese_issues = [issue for issue in issues if any('\u3040' <= char <= '\u309F' or '\u30A0' <= char <= '\u30FF' or '\u4E00' <= char <= '\u9FAF' for char in issue.title + issue.body)]
        english_issues = [issue for issue in issues if issue not in japanese_issues]
        
        assert len(japanese_issues) > 0
        assert len(english_issues) > 0

    @pytest.mark.asyncio
    async def test_run_comprehensive_evaluation(self, accuracy_evaluator, sample_test_cases):
        """Test comprehensive evaluation execution"""
        accuracy_evaluator.test_cases = sample_test_cases
        
        # Mock classification results
        mock_results = [
            ClassificationResult(
                issue_id=1, category="bug-fix", confidence=0.9,
                reasoning="Correct classification", suggested_tags=[], processing_time_ms=1000
            ),
            ClassificationResult(
                issue_id=2, category="feature-request", confidence=0.8,
                reasoning="Correct classification", suggested_tags=[], processing_time_ms=1200
            ),
            ClassificationResult(
                issue_id=3, category="architecture", confidence=0.85,
                reasoning="Correct classification", suggested_tags=[], processing_time_ms=1100
            )
        ]
        
        accuracy_evaluator.classification_service.batch_classify_issues_enhanced.return_value = mock_results
        
        with patch.object(accuracy_evaluator, '_generate_evaluation_report') as mock_report:
            mock_report.return_value = None
            
            metrics = await accuracy_evaluator.run_comprehensive_evaluation()
            
            assert isinstance(metrics, ClassificationMetrics)
            assert metrics.accuracy == 1.0  # All correct
            assert metrics.total_classified == 3
            assert len(accuracy_evaluator.evaluation_history) == 1

    @pytest.mark.asyncio
    async def test_calculate_detailed_metrics_perfect_accuracy(self, accuracy_evaluator, sample_test_cases):
        """Test metrics calculation with perfect accuracy"""
        test_issues = [case[0] for case in sample_test_cases]
        expected_categories = [case[1] for case in sample_test_cases]
        
        # Perfect classification results
        results = [
            ClassificationResult(
                issue_id=1, category="bug-fix", confidence=0.9,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1000
            ),
            ClassificationResult(
                issue_id=2, category="feature-request", confidence=0.8,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1200
            ),
            ClassificationResult(
                issue_id=3, category="architecture", confidence=0.85,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1100
            )
        ]
        
        metrics = await accuracy_evaluator._calculate_detailed_metrics(
            test_issues, expected_categories, results, 3.0
        )
        
        assert metrics.accuracy == 1.0
        assert metrics.total_classified == 3
        assert metrics.average_response_time_ms == 1100.0
        
        # All categories should have perfect precision and recall
        for category in expected_categories:
            assert metrics.precision_per_category[category] == 1.0
            assert metrics.recall_per_category[category] == 1.0
            assert metrics.f1_score_per_category[category] == 1.0

    @pytest.mark.asyncio
    async def test_calculate_detailed_metrics_with_errors(self, accuracy_evaluator, sample_test_cases):
        """Test metrics calculation with classification errors"""
        test_issues = [case[0] for case in sample_test_cases]
        expected_categories = [case[1] for case in sample_test_cases]
        
        # Mixed results with one error
        results = [
            ClassificationResult(
                issue_id=1, category="bug-fix", confidence=0.9,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1000
            ),
            ClassificationResult(
                issue_id=2, category="architecture", confidence=0.7,  # Wrong category
                reasoning="Incorrect", suggested_tags=[], processing_time_ms=1200
            ),
            ClassificationResult(
                issue_id=3, category="architecture", confidence=0.85,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1100
            )
        ]
        
        metrics = await accuracy_evaluator._calculate_detailed_metrics(
            test_issues, expected_categories, results, 3.0
        )
        
        assert metrics.accuracy == 2/3  # 2 out of 3 correct
        assert metrics.total_classified == 3
        
        # Check specific category metrics
        assert metrics.precision_per_category["bug-fix"] == 1.0  # 1 TP, 0 FP
        assert metrics.recall_per_category["bug-fix"] == 1.0     # 1 TP, 0 FN
        
        # feature-request was misclassified as architecture
        assert metrics.precision_per_category["feature-request"] == 0.0  # 0 TP, 0 FP (no predictions)
        assert metrics.recall_per_category["feature-request"] == 0.0     # 0 TP, 1 FN

    @pytest.mark.asyncio
    async def test_calculate_detailed_metrics_with_failures(self, accuracy_evaluator, sample_test_cases):
        """Test metrics calculation with some failed classifications"""
        test_issues = [case[0] for case in sample_test_cases]
        expected_categories = [case[1] for case in sample_test_cases]
        
        # Results with one failure (None)
        results = [
            ClassificationResult(
                issue_id=1, category="bug-fix", confidence=0.9,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1000
            ),
            None,  # Failed classification
            ClassificationResult(
                issue_id=3, category="architecture", confidence=0.85,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1100
            )
        ]
        
        metrics = await accuracy_evaluator._calculate_detailed_metrics(
            test_issues, expected_categories, results, 3.0
        )
        
        assert metrics.accuracy == 1.0  # 2 out of 2 valid results correct
        assert metrics.total_classified == 2  # Only 2 valid results
        assert metrics.average_response_time_ms == 1050.0  # Average of 1000 and 1100

    def test_get_evaluation_trends_insufficient_data(self, accuracy_evaluator):
        """Test evaluation trends with insufficient data"""
        trends = accuracy_evaluator.get_evaluation_trends()
        assert trends["status"] == "insufficient_data"

    def test_get_evaluation_trends_with_data(self, accuracy_evaluator):
        """Test evaluation trends with sufficient data"""
        # Add mock evaluation history
        accuracy_evaluator.evaluation_history = [
            ClassificationMetrics(
                accuracy=0.8, precision_per_category={}, recall_per_category={},
                f1_score_per_category={}, average_f1_score=0.75,
                average_response_time_ms=2000.0, total_classified=10,
                timestamp=datetime(2023, 1, 1)
            ),
            ClassificationMetrics(
                accuracy=0.85, precision_per_category={}, recall_per_category={},
                f1_score_per_category={}, average_f1_score=0.8,
                average_response_time_ms=1800.0, total_classified=10,
                timestamp=datetime(2023, 1, 2)
            )
        ]
        
        trends = accuracy_evaluator.get_evaluation_trends()
        
        assert "accuracy" in trends
        assert trends["accuracy"]["current"] == 0.85
        assert trends["accuracy"]["previous"] == 0.8
        assert trends["accuracy"]["change"] == 0.05
        assert trends["accuracy"]["trend"] == "improving"
        
        assert trends["response_time"]["trend"] == "improving"  # 2000 -> 1800 (lower is better)

    def test_export_import_test_cases(self, accuracy_evaluator, sample_test_cases):
        """Test test cases export and import"""
        accuracy_evaluator.test_cases = sample_test_cases
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_file = f.name
        
        try:
            # Export test cases
            accuracy_evaluator.export_test_cases(temp_file)
            
            # Verify export file
            with open(temp_file, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            assert len(exported_data) == len(sample_test_cases)
            
            # Clear and import
            accuracy_evaluator.test_cases = []
            accuracy_evaluator.import_test_cases(temp_file)
            
            assert len(accuracy_evaluator.test_cases) == len(sample_test_cases)
            
            # Verify imported data
            for original, imported in zip(sample_test_cases, accuracy_evaluator.test_cases):
                original_issue, original_category = original
                imported_issue, imported_category = imported
                
                assert imported_issue.id == original_issue.id
                assert imported_issue.title == original_issue.title
                assert imported_category == original_category
        
        finally:
            Path(temp_file).unlink()

    @pytest.mark.asyncio
    async def test_generate_evaluation_report(self, accuracy_evaluator, sample_test_cases):
        """Test evaluation report generation"""
        accuracy_evaluator.test_cases = sample_test_cases
        
        # Create mock metrics
        metrics = ClassificationMetrics(
            accuracy=0.9,
            precision_per_category={"bug-fix": 1.0, "feature-request": 0.8},
            recall_per_category={"bug-fix": 0.9, "feature-request": 1.0},
            f1_score_per_category={"bug-fix": 0.95, "feature-request": 0.89},
            average_f1_score=0.92,
            average_response_time_ms=1200.0,
            total_classified=3,
            timestamp=datetime.now()
        )
        
        mock_results = [
            ClassificationResult(
                issue_id=1, category="bug-fix", confidence=0.9,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1000
            ),
            ClassificationResult(
                issue_id=2, category="feature-request", confidence=0.8,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1200
            ),
            ClassificationResult(
                issue_id=3, category="architecture", confidence=0.85,
                reasoning="Correct", suggested_tags=[], processing_time_ms=1100
            )
        ]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            with patch('evaluation.accuracy_evaluator.Path') as mock_path:
                mock_path.return_value = temp_path / "evaluation_reports"
                mock_path.return_value.mkdir = Mock()
                
                # Mock file operations
                with patch('builtins.open', create=True) as mock_open:
                    mock_file = Mock()
                    mock_open.return_value.__enter__.return_value = mock_file
                    
                    await accuracy_evaluator._generate_evaluation_report(metrics, mock_results)
                    
                    # Verify file operations were called
                    assert mock_open.call_count >= 1  # JSON and CSV files

    def test_create_accuracy_evaluator_factory(self, mock_enhanced_service):
        """Test accuracy evaluator factory function"""
        evaluator = create_accuracy_evaluator(mock_enhanced_service)
        
        assert isinstance(evaluator, AccuracyEvaluator)
        assert evaluator.classification_service == mock_enhanced_service


class TestBenchmarkTestCases:
    """Test benchmark test cases quality"""

    def test_benchmark_categories_coverage(self, accuracy_evaluator):
        """Test that benchmark covers all categories"""
        test_cases = accuracy_evaluator.create_benchmark_test_cases()
        categories = [case[1] for case in test_cases]
        
        expected_categories = {"bug-fix", "feature-request", "architecture", "learning", "troubleshooting"}
        actual_categories = set(categories)
        
        assert actual_categories == expected_categories

    def test_benchmark_language_coverage(self, accuracy_evaluator):
        """Test that benchmark covers multiple languages"""
        test_cases = accuracy_evaluator.create_benchmark_test_cases()
        
        japanese_count = 0
        english_count = 0
        
        for case in test_cases:
            issue, _ = case
            text = f"{issue.title} {issue.body}"
            
            # Simple language detection
            has_japanese = any('\u3040' <= char <= '\u309F' or '\u30A0' <= char <= '\u30FF' or '\u4E00' <= char <= '\u9FAF' for char in text)
            
            if has_japanese:
                japanese_count += 1
            else:
                english_count += 1
        
        # Should have reasonable distribution
        assert japanese_count >= 2
        assert english_count >= 2

    def test_benchmark_complexity_levels(self, accuracy_evaluator):
        """Test that benchmark includes various complexity levels"""
        test_cases = accuracy_evaluator.create_benchmark_test_cases()
        
        short_issues = []
        long_issues = []
        mixed_label_issues = []
        
        for case in test_cases:
            issue, _ = case
            body_length = len(issue.body)
            
            if body_length < 200:
                short_issues.append(issue)
            elif body_length > 500:
                long_issues.append(issue)
            
            if len(issue.labels) > 1:
                mixed_label_issues.append(issue)
        
        # Should have variety in complexity
        assert len(short_issues) >= 2
        assert len(long_issues) >= 2
        assert len(mixed_label_issues) >= 2

    def test_benchmark_edge_cases(self, accuracy_evaluator):
        """Test that benchmark includes edge cases"""
        test_cases = accuracy_evaluator.create_benchmark_test_cases()
        
        # Look for potentially ambiguous cases
        ambiguous_cases = []
        
        for case in test_cases:
            issue, expected_category = case
            title_lower = issue.title.lower()
            body_lower = issue.body.lower()
            
            # Cases that might be ambiguous between categories
            if ("refactor" in title_lower or "improve" in title_lower) and expected_category != "architecture":
                ambiguous_cases.append(case)
            elif ("research" in title_lower or "investigate" in title_lower) and expected_category != "learning":
                ambiguous_cases.append(case)
        
        # Should have some ambiguous cases to test edge case handling
        assert len(ambiguous_cases) >= 1


@pytest.mark.asyncio
async def test_evaluator_integration():
    """Integration test for accuracy evaluator"""
    # Create mock service
    service = Mock(spec=EnhancedClassificationService)
    service.batch_classify_issues_enhanced = AsyncMock()
    
    evaluator = AccuracyEvaluator(service)
    
    # Create test cases
    test_cases = evaluator.create_benchmark_test_cases()
    assert len(test_cases) > 0
    
    # Test evaluation workflow (without actual API calls)
    test_issues = [case[0] for case in test_cases[:3]]
    expected_categories = [case[1] for case in test_cases[:3]]
    
    # Mock perfect results
    mock_results = [
        ClassificationResult(
            issue_id=issue.id, category=expected,
            confidence=0.9, reasoning="Test", suggested_tags=[],
            processing_time_ms=1000
        )
        for issue, expected in zip(test_issues, expected_categories)
    ]
    
    service.batch_classify_issues_enhanced.return_value = mock_results
    
    # Calculate metrics
    metrics = await evaluator._calculate_detailed_metrics(
        test_issues, expected_categories, mock_results, 3.0
    )
    
    assert metrics.accuracy == 1.0
    assert metrics.total_classified == 3


if __name__ == "__main__":
    pytest.main([__file__])