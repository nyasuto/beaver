"""
Classification Accuracy Evaluation System

分類精度評価とベンチマークシステム
- F1スコア計算
- カテゴリ別性能分析
- ベンチマークテストケース管理
"""

import csv
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import structlog

from models.classification import ClassificationResult, Issue
from models.topic_model import ClassificationMetrics
from services.enhanced_classifier import EnhancedClassificationService

logger = structlog.get_logger()


class AccuracyEvaluator:
    """分類精度評価システム"""

    def __init__(self, classification_service: EnhancedClassificationService):
        self.classification_service = classification_service
        self.test_cases: list[tuple[Issue, str]] = []
        self.evaluation_history: list[ClassificationMetrics] = []

    def create_benchmark_test_cases(self) -> list[tuple[Issue, str]]:
        """ベンチマーク用テストケースの作成"""

        benchmark_cases = [
            # Bug Fix Cases
            (
                Issue(
                    id=9001,
                    title="NullPointerException when processing empty user list",
                    body="The application crashes with NullPointerException when UserProcessor.process() is called with an empty user list. Stack trace shows the error occurs at line 125 in UserProcessor.java. Steps to reproduce: 1. Create empty user list 2. Call process() method 3. Application crashes",
                    labels=["bug", "crash"],
                    repository="test/user-service",
                ),
                "bug-fix",
            ),
            (
                Issue(
                    id=9002,
                    title="ログイン時にセッションが正常に作成されない",
                    body="ユーザーがログインを試行した際、認証は成功するがセッションが作成されずにログイン画面に戻される問題が発生しています。ブラウザのDevToolsで確認したところ、Set-Cookieヘッダーが送信されていません。再現率：約30%",
                    labels=["認証", "セッション"],
                    repository="test/auth-service",
                ),
                "bug-fix",
            ),
            # Feature Request Cases
            (
                Issue(
                    id=9003,
                    title="Add support for multi-factor authentication (MFA)",
                    body="As a security-conscious user, I want to enable multi-factor authentication for my account so that I can protect my data even if my password is compromised. Acceptance criteria: - Support for TOTP (Google Authenticator, Authy) - Backup codes generation - Option to require MFA for sensitive operations",
                    labels=["enhancement", "security"],
                    repository="test/auth-service",
                ),
                "feature-request",
            ),
            (
                Issue(
                    id=9004,
                    title="データエクスポート機能の追加",
                    body="管理者が全ユーザーデータをCSV形式でエクスポートできる機能を追加してほしい。要件：1. フィルタリング機能（日付範囲、ユーザータイプ） 2. 大容量データの分割エクスポート 3. エクスポート進捗の表示 4. 日本語ファイル名対応",
                    labels=["機能追加", "管理者"],
                    repository="test/admin-service",
                ),
                "feature-request",
            ),
            # Architecture Cases
            (
                Issue(
                    id=9005,
                    title="Refactor database access layer for better performance",
                    body="Current database queries are inefficient and causing performance issues. Proposal: 1. Implement repository pattern 2. Add query optimization 3. Introduce connection pooling 4. Add caching layer. Expected improvements: 50% reduction in response time, better scalability.",
                    labels=["refactor", "performance"],
                    repository="test/data-service",
                ),
                "architecture",
            ),
            (
                Issue(
                    id=9006,
                    title="マイクロサービス間通信の最適化",
                    body="現在のサービス間通信でレスポンス時間が遅く、タイムアウトが頻発している。改善提案：1. gRPCの導入検討 2. サーキットブレーカーパターンの実装 3. 非同期通信の活用 4. リトライ機構の改善。目標：平均レスポンス時間を2秒から500ms以下に短縮",
                    labels=["アーキテクチャ", "性能"],
                    repository="test/gateway-service",
                ),
                "architecture",
            ),
            # Learning Cases
            (
                Issue(
                    id=9007,
                    title="Research: GraphQL vs REST API performance comparison",
                    body="We need to evaluate GraphQL adoption for our API layer. Research scope: 1. Performance benchmarking 2. Developer experience comparison 3. Client-side benefits analysis 4. Migration complexity assessment. Deliverable: Technical report with recommendation.",
                    labels=["research", "investigation"],
                    repository="test/api-service",
                ),
                "learning",
            ),
            (
                Issue(
                    id=9008,
                    title="Kubernetes導入の調査・検証",
                    body="現在のDocker Composeからの移行を検討中。調査項目：1. 既存システムとの互換性 2. 運用コスト比較 3. 学習コスト評価 4. 段階的移行計画。PoC環境を構築して実際の動作を確認したい。",
                    labels=["調査", "インフラ"],
                    repository="test/infra",
                ),
                "learning",
            ),
            # Troubleshooting Cases
            (
                Issue(
                    id=9009,
                    title="How to configure HTTPS for development environment?",
                    body="I'm trying to set up HTTPS for local development but encountering certificate issues. I've generated self-signed certificates but browsers show security warnings. What's the recommended approach for local HTTPS setup? Any documentation or step-by-step guide available?",
                    labels=["question", "development"],
                    repository="test/docs",
                ),
                "troubleshooting",
            ),
            (
                Issue(
                    id=9010,
                    title="Docker環境でのメモリ不足エラー",
                    body="開発環境でDockerコンテナを起動すると「insufficient memory」エラーが発生します。Docker Desktopの設定は8GBに設定済み。使用OS：macOS Big Sur。どのような対処方法がありますか？同様の問題を経験した方がいればアドバイスをお願いします。",
                    labels=["質問", "Docker"],
                    repository="test/dev-env",
                ),
                "troubleshooting",
            ),
            # Edge Cases - Mixed/Ambiguous
            (
                Issue(
                    id=9011,
                    title="API rate limiting implementation",
                    body="Implement rate limiting for API endpoints to prevent abuse. This requires both architectural changes and new feature development. Need to research best practices and implement a scalable solution.",
                    labels=["feature", "security", "architecture"],
                    repository="test/api-service",
                ),
                "feature-request",
            ),  # 主に新機能追加
            (
                Issue(
                    id=9012,
                    title="パフォーマンステストの自動化",
                    body="現在手動で行っているパフォーマンステストを自動化したい。CI/CDパイプラインに組み込み、性能回帰を早期発見する仕組みを構築。技術選定から実装まで段階的に進める。",
                    labels=["テスト", "自動化"],
                    repository="test/ci-cd",
                ),
                "architecture",
            ),  # システム改善・テスト戦略
        ]

        self.test_cases = benchmark_cases
        logger.info(f"Created {len(benchmark_cases)} benchmark test cases")

        return benchmark_cases

    async def run_comprehensive_evaluation(self) -> ClassificationMetrics:
        """包括的な分類精度評価の実行"""

        if not self.test_cases:
            self.create_benchmark_test_cases()

        logger.info("Starting comprehensive classification evaluation")

        test_issues = [case[0] for case in self.test_cases]
        expected_categories = [case[1] for case in self.test_cases]

        # 分類実行
        evaluation_start_time = time.time()
        results = await self.classification_service.batch_classify_issues_enhanced(
            test_issues, use_few_shot=True, parallel=True
        )
        evaluation_time = time.time() - evaluation_start_time

        # 精度計算
        metrics = await self._calculate_detailed_metrics(
            test_issues, expected_categories, results, evaluation_time
        )

        # 評価履歴に追加
        self.evaluation_history.append(metrics)

        # 結果レポート生成
        await self._generate_evaluation_report(metrics, results)

        logger.info(
            "Comprehensive evaluation completed",
            accuracy=metrics.accuracy,
            average_f1_score=metrics.average_f1_score,
            total_classified=metrics.total_classified,
            evaluation_time_seconds=evaluation_time,
        )

        return metrics

    async def _calculate_detailed_metrics(
        self,
        test_issues: list[Issue],
        expected_categories: list[str],
        results: list[Optional[ClassificationResult]],
        evaluation_time: float,
    ) -> ClassificationMetrics:
        """詳細メトリクスの計算"""

        # 成功した分類のみを対象
        valid_results = [
            (exp, res) for exp, res in zip(expected_categories, results) if res is not None
        ]

        if not valid_results:
            return ClassificationMetrics(
                accuracy=0.0,
                precision_per_category={},
                recall_per_category={},
                f1_score_per_category={},
                average_f1_score=0.0,
                average_response_time_ms=0.0,
                total_classified=0,
                timestamp=datetime.now(),
            )

        # カテゴリ別統計の初期化
        categories = set(expected_categories)
        category_stats = {cat: {"tp": 0, "fp": 0, "fn": 0} for cat in categories}

        correct_predictions = 0
        response_times = [res.processing_time_ms for _, res in valid_results]

        # 分類結果の評価
        for expected, result in valid_results:
            predicted = result.category

            if predicted == expected:
                correct_predictions += 1
                category_stats[expected]["tp"] += 1
            else:
                category_stats[expected]["fn"] += 1
                if predicted in category_stats:
                    category_stats[predicted]["fp"] += 1
                else:
                    # 予期しないカテゴリの場合
                    logger.warning(f"Unexpected category predicted: {predicted}")

        # メトリクス計算
        accuracy = correct_predictions / len(valid_results)

        precision_per_category = {}
        recall_per_category = {}
        f1_score_per_category = {}

        for category, stats in category_stats.items():
            tp, fp, fn = stats["tp"], stats["fp"], stats["fn"]

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (
                2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
            )

            precision_per_category[category] = round(precision, 3)
            recall_per_category[category] = round(recall, 3)
            f1_score_per_category[category] = round(f1, 3)

        average_f1_score = sum(f1_score_per_category.values()) / len(f1_score_per_category)
        average_response_time = sum(response_times) / len(response_times) if response_times else 0.0

        return ClassificationMetrics(
            accuracy=round(accuracy, 3),
            precision_per_category=precision_per_category,
            recall_per_category=recall_per_category,
            f1_score_per_category=f1_score_per_category,
            average_f1_score=round(average_f1_score, 3),
            average_response_time_ms=round(average_response_time, 1),
            total_classified=len(valid_results),
            timestamp=datetime.now(),
        )

    async def _generate_evaluation_report(
        self, metrics: ClassificationMetrics, results: list[Optional[ClassificationResult]]
    ) -> None:
        """評価レポートの生成"""

        # レポート作成
        report = {
            "evaluation_summary": {
                "timestamp": metrics.timestamp.isoformat(),
                "total_test_cases": len(self.test_cases),
                "successful_classifications": metrics.total_classified,
                "overall_accuracy": metrics.accuracy,
                "average_f1_score": metrics.average_f1_score,
                "average_response_time_ms": metrics.average_response_time_ms,
                "target_accuracy_met": metrics.accuracy >= 0.80,
                "target_f1_met": metrics.average_f1_score >= 0.75,
                "target_response_time_met": metrics.average_response_time_ms <= 3000,
            },
            "category_performance": {
                "precision": metrics.precision_per_category,
                "recall": metrics.recall_per_category,
                "f1_score": metrics.f1_score_per_category,
            },
            "detailed_results": [],
        }

        # 詳細結果の追加
        for i, (case, result) in enumerate(zip(self.test_cases, results)):
            issue, expected = case

            detail = {
                "test_case_id": i + 1,
                "issue_id": issue.id,
                "issue_title": issue.title,
                "expected_category": expected,
                "predicted_category": result.category if result else None,
                "confidence": result.confidence if result else 0.0,
                "correct": result.category == expected if result else False,
                "processing_time_ms": result.processing_time_ms if result else None,
                "reasoning": result.reasoning if result else "Classification failed",
            }

            report["detailed_results"].append(detail)

        # レポートを保存
        report_path = Path("evaluation_reports")
        report_path.mkdir(exist_ok=True)

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_path / f"classification_evaluation_{timestamp_str}.json"

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        logger.info(f"Evaluation report saved to {report_file}")

        # CSVレポートも作成
        await self._generate_csv_report(
            report, report_path / f"classification_evaluation_{timestamp_str}.csv"
        )

    async def _generate_csv_report(self, report: dict[str, Any], csv_path: Path) -> None:
        """CSV形式のレポート生成"""

        with open(csv_path, "w", newline="", encoding="utf-8") as csvfile:
            fieldnames = [
                "test_case_id",
                "issue_id",
                "issue_title",
                "expected_category",
                "predicted_category",
                "confidence",
                "correct",
                "processing_time_ms",
                "reasoning",
            ]

            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for detail in report["detailed_results"]:
                writer.writerow(detail)

        logger.info(f"CSV evaluation report saved to {csv_path}")

    def get_evaluation_trends(self) -> dict[str, Any]:
        """評価傾向の分析"""

        if len(self.evaluation_history) < 2:
            return {"status": "insufficient_data"}

        latest = self.evaluation_history[-1]
        previous = self.evaluation_history[-2]

        accuracy_trend = latest.accuracy - previous.accuracy
        f1_trend = latest.average_f1_score - previous.average_f1_score
        response_time_trend = latest.average_response_time_ms - previous.average_response_time_ms

        trends = {
            "accuracy": {
                "current": latest.accuracy,
                "previous": previous.accuracy,
                "change": round(accuracy_trend, 3),
                "trend": "improving"
                if accuracy_trend > 0
                else "declining"
                if accuracy_trend < 0
                else "stable",
            },
            "f1_score": {
                "current": latest.average_f1_score,
                "previous": previous.average_f1_score,
                "change": round(f1_trend, 3),
                "trend": "improving" if f1_trend > 0 else "declining" if f1_trend < 0 else "stable",
            },
            "response_time": {
                "current": latest.average_response_time_ms,
                "previous": previous.average_response_time_ms,
                "change": round(response_time_trend, 1),
                "trend": "improving"
                if response_time_trend < 0
                else "declining"
                if response_time_trend > 0
                else "stable",
            },
            "evaluation_count": len(self.evaluation_history),
            "last_evaluation": latest.timestamp.isoformat(),
        }

        return trends

    def export_test_cases(self, file_path: str) -> None:
        """テストケースのエクスポート"""

        export_data = []
        for case in self.test_cases:
            issue, expected_category = case
            export_data.append(
                {
                    "issue_id": issue.id,
                    "title": issue.title,
                    "body": issue.body,
                    "labels": issue.labels,
                    "repository": issue.repository,
                    "expected_category": expected_category,
                }
            )

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        logger.info(f"Test cases exported to {file_path}")

    def import_test_cases(self, file_path: str) -> None:
        """テストケースのインポート"""

        with open(file_path, encoding="utf-8") as f:
            import_data = json.load(f)

        imported_cases = []
        for data in import_data:
            issue = Issue(
                id=data["issue_id"],
                title=data["title"],
                body=data["body"],
                labels=data["labels"],
                repository=data["repository"],
            )
            imported_cases.append((issue, data["expected_category"]))

        self.test_cases.extend(imported_cases)
        logger.info(f"Imported {len(imported_cases)} test cases from {file_path}")


def create_accuracy_evaluator(
    classification_service: EnhancedClassificationService,
) -> AccuracyEvaluator:
    """精度評価システムのファクトリ関数"""
    return AccuracyEvaluator(classification_service)
