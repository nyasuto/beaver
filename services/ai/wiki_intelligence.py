"""
Wiki Intelligence Engine for Issue #367

開発者ワークフロー重視のWiki改善のための知的分析エンジン
- Issue重要度自動判定
- カテゴリ別統計生成  
- 優先度付きIssue選出
- 開発者向けメトリクス計算
"""

from datetime import datetime, timedelta
from typing import Any, Optional

import structlog
from models.classification import ClassificationResult, Issue

logger = structlog.get_logger()


class WikiIntelligenceEngine:
    """Wiki生成のための知的分析エンジン"""

    def __init__(self):
        self.logger = structlog.get_logger()

        # Issue重要度計算の重み
        self.importance_weights = {
            "recency": 0.3,  # 最近の更新度
            "category_priority": 0.25,  # カテゴリ別優先度
            "label_priority": 0.25,  # ラベル重要度
            "activity_level": 0.2,  # 活動レベル
        }

        # カテゴリ別基準重要度
        self.category_importance = {
            "bug-fix": 0.9,  # バグ修正は高優先度
            "architecture": 0.8,  # アーキテクチャも重要
            "feature-request": 0.7,  # 新機能は中優先度
            "learning": 0.5,  # 学習・調査は低め
            "troubleshooting": 0.6,  # トラブルシューティングは中程度
        }

        # ラベル重要度マッピング
        self.label_importance = {
            "critical": 1.0,
            "high": 0.8,
            "medium": 0.6,
            "low": 0.4,
            "bug": 0.8,
            "security": 1.0,
            "performance": 0.7,
            "feature": 0.6,
            "documentation": 0.4,
            "enhancement": 0.5,
        }

    async def analyze_issues_for_wiki(
        self,
        issues: list[Issue],
        classification_results: list[ClassificationResult],
    ) -> dict[str, Any]:
        """Wiki生成用のIssue分析"""

        self.logger.info(f"Analyzing {len(issues)} issues for wiki generation")

        # Issue重要度スコア計算
        issue_scores = await self._calculate_issue_importance_scores(issues, classification_results)

        # 重要Issue TOP3選出
        important_issues = self._select_top_important_issues(issues, issue_scores, classification_results)

        # カテゴリ別統計
        category_stats = self._calculate_category_statistics(issues, classification_results)

        # 週次統計
        weekly_stats = self._calculate_weekly_statistics(issues)

        # 健康指標
        health_metrics = self._calculate_health_metrics(issues, classification_results)

        return {
            "important_issues": important_issues,
            "category_stats": category_stats,
            "weekly_stats": weekly_stats,
            "health_metrics": health_metrics,
            "ai_confidence": self._calculate_ai_confidence(classification_results),
        }

    async def _calculate_issue_importance_scores(
        self,
        issues: list[Issue],
        classification_results: list[ClassificationResult],
    ) -> dict[int, float]:
        """Issue重要度スコアを計算"""

        scores = {}
        classification_map = {result.issue_id: result for result in classification_results}

        for issue in issues:
            if issue.state != "open":  # クローズ済みは除外
                continue

            classification = classification_map.get(issue.id)
            if not classification:
                continue

            # 各要素のスコア計算
            recency_score = self._calculate_recency_score(issue)
            category_score = self._calculate_category_score(classification)
            label_score = self._calculate_label_score(issue)
            activity_score = self._calculate_activity_score(issue)

            # 重み付き総合スコア
            total_score = (
                recency_score * self.importance_weights["recency"]
                + category_score * self.importance_weights["category_priority"]
                + label_score * self.importance_weights["label_priority"]
                + activity_score * self.importance_weights["activity_level"]
            )

            scores[issue.id] = min(1.0, total_score)

        return scores

    def _calculate_recency_score(self, issue: Issue) -> float:
        """最近の更新度スコア（0-1）"""
        if not issue.created_at:
            return 0.5

        now = datetime.now()
        days_old = (now - issue.created_at).days

        # 1日以内: 1.0, 7日以内: 0.8, 30日以内: 0.5, それ以降: 0.2
        if days_old <= 1:
            return 1.0
        elif days_old <= 7:
            return 0.8
        elif days_old <= 30:
            return 0.5
        else:
            return 0.2

    def _calculate_category_score(self, classification: ClassificationResult) -> float:
        """カテゴリ重要度スコア"""
        base_score = self.category_importance.get(classification.category, 0.5)
        
        # AI信頼度で調整
        confidence_adjustment = classification.confidence * 0.2
        
        return min(1.0, base_score + confidence_adjustment)

    def _calculate_label_score(self, issue: Issue) -> float:
        """ラベル重要度スコア"""
        if not issue.labels:
            return 0.5

        max_label_score = 0.0
        for label in issue.labels:
            label_lower = label.lower()
            for key, score in self.label_importance.items():
                if key in label_lower:
                    max_label_score = max(max_label_score, score)

        return max_label_score if max_label_score > 0 else 0.5

    def _calculate_activity_score(self, issue: Issue) -> float:
        """活動レベルスコア"""
        # コメント数やディスカッション活動度から算出
        # この実装では簡略化してラベル数で代用
        label_count = len(issue.labels)
        
        if label_count >= 3:
            return 0.8
        elif label_count >= 2:
            return 0.6
        elif label_count >= 1:
            return 0.4
        else:
            return 0.2

    def _select_top_important_issues(
        self,
        issues: list[Issue],
        scores: dict[int, float],
        classification_results: list[ClassificationResult],
    ) -> list[dict[str, Any]]:
        """重要Issue TOP3を選出"""

        classification_map = {result.issue_id: result for result in classification_results}

        # スコア順でソート
        scored_issues = []
        for issue in issues:
            if issue.id in scores and issue.state == "open":
                classification = classification_map.get(issue.id)
                scored_issues.append((scores[issue.id], issue, classification))

        scored_issues.sort(reverse=True, key=lambda x: x[0])

        # TOP3を詳細情報付きで返す
        top_issues = []
        for score, issue, classification in scored_issues[:3]:
            priority = self._determine_priority_level(score)
            effort = self._estimate_effort(issue, classification)

            top_issues.append({
                "Number": issue.id,
                "Title": issue.title,
                "URL": f"https://github.com/{issue.repository}/issues/{issue.id}" if issue.repository else f"#issue-{issue.id}",
                "Category": classification.category if classification else "未分類",
                "Priority": priority,
                "State": issue.state,
                "UpdatedAt": issue.created_at or datetime.now(),
                "Summary": self._generate_issue_summary(issue, classification),
                "EstimatedEffort": effort,
                "ImportanceScore": score,
            })

        return top_issues

    def _determine_priority_level(self, score: float) -> str:
        """スコアから優先度レベルを判定"""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "medium"
        else:
            return "low"

    def _estimate_effort(self, issue: Issue, classification: Optional[ClassificationResult]) -> str:
        """Issue解決の推定工数"""
        if not classification:
            return "不明"

        # カテゴリベースの工数推定
        effort_map = {
            "bug-fix": "1-2日",
            "feature-request": "3-5日",
            "architecture": "1-2週間",
            "learning": "2-3日",
            "troubleshooting": "半日-1日",
        }

        base_effort = effort_map.get(classification.category, "2-3日")

        # ラベルによる調整
        if any("critical" in label.lower() for label in issue.labels):
            return f"緊急: {base_effort}"
        elif any("simple" in label.lower() or "easy" in label.lower() for label in issue.labels):
            return f"簡単: {base_effort.split('-')[0]}"

        return base_effort

    def _generate_issue_summary(self, issue: Issue, classification: Optional[ClassificationResult]) -> str:
        """Issue要約を生成"""
        if not classification:
            return issue.body[:100] + "..." if issue.body else "詳細情報なし"

        # AI分析結果から要約生成
        reasoning = classification.reasoning if classification.reasoning else ""
        
        if len(reasoning) > 150:
            return reasoning[:150] + "..."
        elif reasoning:
            return reasoning
        else:
            return issue.body[:100] + "..." if issue.body else "AI分析結果に基づく詳細情報"

    def _calculate_category_statistics(
        self,
        issues: list[Issue],
        classification_results: list[ClassificationResult],
    ) -> dict[str, int]:
        """カテゴリ別統計を計算"""

        stats = {
            "BugCount": 0,
            "PerformanceCount": 0,
            "FeatureCount": 0,
            "DocsCount": 0,
            "TechDebtCount": 0,
            "TestCount": 0,
        }

        classification_map = {result.issue_id: result for result in classification_results}

        for issue in issues:
            if issue.state != "open":
                continue

            classification = classification_map.get(issue.id)
            
            # ラベルベースのカウント
            labels_text = " ".join(issue.labels).lower()
            
            if "bug" in labels_text or (classification and classification.category == "bug-fix"):
                stats["BugCount"] += 1
            elif "performance" in labels_text:
                stats["PerformanceCount"] += 1
            elif "feature" in labels_text or (classification and classification.category == "feature-request"):
                stats["FeatureCount"] += 1
            elif "doc" in labels_text:
                stats["DocsCount"] += 1
            elif "tech" in labels_text and "debt" in labels_text:
                stats["TechDebtCount"] += 1
            elif "test" in labels_text:
                stats["TestCount"] += 1

        return stats

    def _calculate_weekly_statistics(self, issues: list[Issue]) -> dict[str, Any]:
        """週次統計を計算"""

        now = datetime.now()
        week_start = now - timedelta(days=7)
        last_week_start = now - timedelta(days=14)

        this_week_resolved = 0
        this_week_created = 0
        last_week_resolved = 0
        last_week_created = 0

        resolution_times = []
        last_resolution_times = []

        for issue in issues:
            if not issue.created_at:
                continue

            # 今週作成
            if issue.created_at >= week_start:
                this_week_created += 1

            # 先週作成
            elif issue.created_at >= last_week_start and issue.created_at < week_start:
                last_week_created += 1

            # 解決時間の計算（簡略化）
            if issue.state == "closed":
                if issue.created_at >= week_start:
                    this_week_resolved += 1
                    # 解決時間の推定（実際の実装では closed_at を使用）
                    days_to_resolve = (now - issue.created_at).days
                    resolution_times.append(days_to_resolve)
                elif issue.created_at >= last_week_start and issue.created_at < week_start:
                    last_week_resolved += 1
                    days_to_resolve = (now - issue.created_at).days
                    last_resolution_times.append(days_to_resolve)

        avg_resolution_days = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        avg_resolution_days_last = sum(last_resolution_times) / len(last_resolution_times) if last_resolution_times else 0

        return {
            "Resolved": this_week_resolved,
            "Created": this_week_created,
            "ResolvedLast": last_week_resolved,
            "CreatedLast": last_week_created,
            "AvgResolutionDays": round(avg_resolution_days, 1),
            "AvgResolutionDaysLast": round(avg_resolution_days_last, 1),
        }

    def _calculate_health_metrics(
        self,
        issues: list[Issue],
        classification_results: list[ClassificationResult],
    ) -> dict[str, str]:
        """プロジェクト健康指標を計算"""

        open_issues = [issue for issue in issues if issue.state == "open"]
        total_issues = len(issues)
        open_count = len(open_issues)

        # バックログ健全性
        if open_count <= 10:
            backlog_health = "🟢 良好"
            backlog_details = f"未解決Issue {open_count}件は管理可能"
        elif open_count <= 25:
            backlog_health = "🟡 注意"
            backlog_details = f"未解決Issue {open_count}件、計画的な対応が必要"
        else:
            backlog_health = "🔴 改善必要"
            backlog_details = f"未解決Issue {open_count}件、積極的な解決が必要"

        # 対応速度（簡略化）
        critical_issues = [
            issue for issue in open_issues
            if any("critical" in label.lower() for label in issue.labels)
        ]

        if len(critical_issues) == 0:
            response_speed = "🟢 良好"
            response_details = "クリティカルなIssueなし"
        elif len(critical_issues) <= 2:
            response_speed = "🟡 注意"
            response_details = f"クリティカルIssue {len(critical_issues)}件"
        else:
            response_speed = "🔴 改善必要"
            response_details = f"クリティカルIssue {len(critical_issues)}件、緊急対応必要"

        # 品質トレンド（簡略化）
        bug_issues = [
            issue for issue in open_issues
            if any("bug" in label.lower() for label in issue.labels)
        ]

        bug_ratio = len(bug_issues) / total_issues if total_issues > 0 else 0

        if bug_ratio <= 0.2:
            quality_trend = "🟢 向上中"
            quality_details = f"バグ率 {bug_ratio:.1%}、品質安定"
        elif bug_ratio <= 0.4:
            quality_trend = "🟡 普通"
            quality_details = f"バグ率 {bug_ratio:.1%}、通常レベル"
        else:
            quality_trend = "🔴 改善必要"
            quality_details = f"バグ率 {bug_ratio:.1%}、品質改善が必要"

        return {
            "BacklogHealth": backlog_health,
            "BacklogDetails": backlog_details,
            "ResponseSpeed": response_speed,
            "ResponseDetails": response_details,
            "QualityTrend": quality_trend,
            "QualityDetails": quality_details,
        }

    def _calculate_ai_confidence(self, classification_results: list[ClassificationResult]) -> float:
        """AI分析の信頼度を計算"""
        if not classification_results:
            return 0.0

        confidences = [result.confidence for result in classification_results]
        avg_confidence = sum(confidences) / len(confidences)

        return round(avg_confidence * 100, 1)  # パーセント表示


async def analyze_issues_for_wiki_generation(
    issues: list[Issue],
    classification_results: list[ClassificationResult],
) -> dict[str, Any]:
    """Wiki生成用のIssue分析メイン関数"""
    
    engine = WikiIntelligenceEngine()
    analysis_result = await engine.analyze_issues_for_wiki(issues, classification_results)
    
    structlog.get_logger().info(
        "Wiki intelligence analysis completed",
        total_issues=len(issues),
        important_issues_count=len(analysis_result["important_issues"]),
        ai_confidence=analysis_result["ai_confidence"],
    )
    
    return analysis_result