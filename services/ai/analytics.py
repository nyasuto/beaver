"""
Advanced Analytics System for Development Pattern Analysis

開発パターン分析のための高度な統計分析システム
- 学習軌跡の統計分析
- パフォーマンス指標の計算
- 予測モデリング
- 可視化データ生成
"""

import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Tuple

import numpy as np
import structlog
from scipy import stats

from patterns import (
    DevelopmentEvent,
    LearningPattern,
    LearningStage,
    LearningTrajectory,
    PatternType,
)

logger = structlog.get_logger()


@dataclass
class AnalyticsMetrics:
    """分析メトリクス"""

    total_events: int
    unique_patterns: int
    success_rate: float
    learning_velocity: float  # 学習速度 (patterns per month)
    pattern_diversity: float  # パターンの多様性
    consistency_score: float  # 一貫性スコア
    trend_direction: str  # "improving", "stable", "declining"
    confidence_interval: Tuple[float, float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_events": self.total_events,
            "unique_patterns": self.unique_patterns,
            "success_rate": self.success_rate,
            "learning_velocity": self.learning_velocity,
            "pattern_diversity": self.pattern_diversity,
            "consistency_score": self.consistency_score,
            "trend_direction": self.trend_direction,
            "confidence_interval": list(self.confidence_interval),
        }


@dataclass
class VisualizationData:
    """可視化用データ"""

    timeline_chart: Dict[str, Any]
    pattern_distribution: Dict[str, int]
    learning_curve: List[Dict[str, Any]]
    success_trend: List[Dict[str, Any]]
    skill_radar: Dict[str, float]
    heatmap_data: List[List[float]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timeline_chart": self.timeline_chart,
            "pattern_distribution": self.pattern_distribution,
            "learning_curve": self.learning_curve,
            "success_trend": self.success_trend,
            "skill_radar": self.skill_radar,
            "heatmap_data": self.heatmap_data,
        }


@dataclass
class PredictiveInsights:
    """予測的洞察"""

    next_learning_opportunities: List[str]
    risk_areas: List[str]
    recommended_focus: List[str]
    predicted_trajectory: LearningStage
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "next_learning_opportunities": self.next_learning_opportunities,
            "risk_areas": self.risk_areas,
            "recommended_focus": self.recommended_focus,
            "predicted_trajectory": self.predicted_trajectory.value,
            "confidence": self.confidence,
        }


class DevelopmentAnalytics:
    """開発分析システム"""

    def __init__(self):
        self.logger = structlog.get_logger()

    def analyze_patterns(self, patterns: List[LearningPattern]) -> AnalyticsMetrics:
        """パターンの統計分析"""
        if not patterns:
            return AnalyticsMetrics(
                total_events=0,
                unique_patterns=0,
                success_rate=0.0,
                learning_velocity=0.0,
                pattern_diversity=0.0,
                consistency_score=0.0,
                trend_direction="stable",
                confidence_interval=(0.0, 0.0),
            )

        total_events = sum(len(p.timeline) for p in patterns)
        unique_patterns = len(patterns)

        # 成功率の計算
        success_rates = [p.success_rate for p in patterns if p.success_rate > 0]
        overall_success_rate = statistics.mean(success_rates) if success_rates else 0.0

        # 学習速度の計算
        learning_velocity = self._calculate_learning_velocity(patterns)

        # パターンの多様性を計算
        pattern_diversity = self._calculate_pattern_diversity(patterns)

        # 一貫性スコアを計算
        consistency_score = self._calculate_consistency_score(patterns)

        # トレンド方向を分析
        trend_direction = self._analyze_trend_direction(patterns)

        # 信頼区間を計算
        confidence_interval = self._calculate_confidence_interval(success_rates)

        return AnalyticsMetrics(
            total_events=total_events,
            unique_patterns=unique_patterns,
            success_rate=overall_success_rate,
            learning_velocity=learning_velocity,
            pattern_diversity=pattern_diversity,
            consistency_score=consistency_score,
            trend_direction=trend_direction,
            confidence_interval=confidence_interval,
        )

    def generate_learning_trajectory(
        self, person: str, patterns: List[LearningPattern], events: List[DevelopmentEvent]
    ) -> LearningTrajectory:
        """学習軌跡を生成"""
        if not patterns or not events:
            return self._create_empty_trajectory(person)

        # 時系列でソート
        sorted_events = sorted(events, key=lambda x: x.timestamp)
        sorted_patterns = sorted(
            patterns,
            key=lambda p: min(e.timestamp for e in p.timeline) if p.timeline else datetime.now(),
        )

        start_date = sorted_events[0].timestamp
        end_date = sorted_events[-1].timestamp

        # 学習段階の推移を分析
        stages = self._extract_learning_stages(sorted_patterns)

        # 進歩スコアを計算
        progress_score = self._calculate_progress_score(patterns, sorted_events)

        # 主要マイルストーンを特定
        key_milestones = self._identify_key_milestones(sorted_patterns)

        # ドメインを推定
        domain = self._infer_primary_domain(events)

        return LearningTrajectory(
            person=person,
            domain=domain,
            start_date=start_date,
            end_date=end_date,
            stages=stages,
            patterns=patterns,
            progress_score=progress_score,
            key_milestones=key_milestones,
        )

    def generate_predictive_insights(
        self, trajectory: LearningTrajectory, recent_patterns: List[LearningPattern]
    ) -> PredictiveInsights:
        """予測的洞察を生成"""
        # 次の学習機会を予測
        next_opportunities = self._predict_learning_opportunities(trajectory, recent_patterns)

        # リスク領域を特定
        risk_areas = self._identify_risk_areas(trajectory, recent_patterns)

        # 推奨フォーカス領域
        recommended_focus = self._recommend_focus_areas(trajectory, recent_patterns)

        # 次の学習段階を予測
        predicted_trajectory = self._predict_next_stage(trajectory)

        # 予測信頼度を計算
        confidence = self._calculate_prediction_confidence(trajectory, recent_patterns)

        return PredictiveInsights(
            next_learning_opportunities=next_opportunities,
            risk_areas=risk_areas,
            recommended_focus=recommended_focus,
            predicted_trajectory=predicted_trajectory,
            confidence=confidence,
        )

    def generate_visualization_data(
        self,
        patterns: List[LearningPattern],
        events: List[DevelopmentEvent],
        trajectory: LearningTrajectory,
    ) -> VisualizationData:
        """可視化用データを生成"""

        # タイムライン チャート用データ
        timeline_chart = self._create_timeline_chart_data(events, patterns)

        # パターン分布
        pattern_distribution = self._create_pattern_distribution(patterns)

        # 学習曲線
        learning_curve = self._create_learning_curve_data(trajectory)

        # 成功トレンド
        success_trend = self._create_success_trend_data(patterns)

        # スキルレーダー
        skill_radar = self._create_skill_radar_data(patterns)

        # ヒートマップデータ
        heatmap_data = self._create_heatmap_data(events)

        return VisualizationData(
            timeline_chart=timeline_chart,
            pattern_distribution=pattern_distribution,
            learning_curve=learning_curve,
            success_trend=success_trend,
            skill_radar=skill_radar,
            heatmap_data=heatmap_data,
        )

    def _calculate_learning_velocity(self, patterns: List[LearningPattern]) -> float:
        """学習速度を計算（月あたりのパターン数）"""
        if not patterns:
            return 0.0

        # 全パターンの時間範囲を取得
        all_timestamps = []
        for pattern in patterns:
            for event in pattern.timeline:
                all_timestamps.append(event.timestamp)

        if len(all_timestamps) < 2:
            return 0.0

        time_span = max(all_timestamps) - min(all_timestamps)
        months = time_span.days / 30.44  # 平均月日数

        return len(patterns) / max(months, 1)

    def _calculate_pattern_diversity(self, patterns: List[LearningPattern]) -> float:
        """パターンの多様性を計算（Shannon多様性指数）"""
        if not patterns:
            return 0.0

        # パターンタイプの分布を計算
        type_counts = Counter(p.type.value for p in patterns)
        total = len(patterns)

        # Shannon多様性指数を計算
        diversity = 0.0
        for count in type_counts.values():
            if count > 0:
                p = count / total
                diversity -= p * np.log2(p)

        # 正規化 (0-1の範囲)
        max_diversity = np.log2(len(PatternType))
        return diversity / max_diversity if max_diversity > 0 else 0.0

    def _calculate_consistency_score(self, patterns: List[LearningPattern]) -> float:
        """一貫性スコアを計算"""
        if not patterns:
            return 0.0

        # 信頼度の分散を使用して一貫性を測定
        confidences = [p.confidence for p in patterns]

        if len(confidences) < 2:
            return 1.0

        # 分散が小さいほど一貫性が高い
        variance = statistics.variance(confidences)
        consistency = 1.0 / (1.0 + variance)

        return min(1.0, consistency)

    def _analyze_trend_direction(self, patterns: List[LearningPattern]) -> str:
        """トレンド方向を分析"""
        if len(patterns) < 3:
            return "stable"

        # 成功率の時系列トレンドを分析
        success_rates = []
        timestamps = []

        for pattern in patterns:
            if pattern.timeline:
                avg_timestamp = statistics.mean([e.timestamp.timestamp() for e in pattern.timeline])
                success_rates.append(pattern.success_rate)
                timestamps.append(avg_timestamp)

        if len(success_rates) < 3:
            return "stable"

        # 線形回帰でトレンドを分析
        correlation = np.corrcoef(timestamps, success_rates)[0, 1]

        if correlation > 0.3:
            return "improving"
        elif correlation < -0.3:
            return "declining"
        else:
            return "stable"

    def _calculate_confidence_interval(self, success_rates: List[float]) -> Tuple[float, float]:
        """成功率の信頼区間を計算"""
        if not success_rates:
            return (0.0, 0.0)

        if len(success_rates) == 1:
            return (success_rates[0], success_rates[0])

        # 95%信頼区間を計算
        mean = statistics.mean(success_rates)
        std_err = statistics.stdev(success_rates) / np.sqrt(len(success_rates))

        # t分布を使用
        confidence_level = 0.95
        df = len(success_rates) - 1
        t_value = stats.t.ppf((1 + confidence_level) / 2, df)

        margin = t_value * std_err
        return (max(0.0, mean - margin), min(1.0, mean + margin))

    def _extract_learning_stages(
        self, patterns: List[LearningPattern]
    ) -> List[Tuple[LearningStage, datetime, str]]:
        """パターンから学習段階を抽出"""
        stages = []

        for pattern in patterns:
            if pattern.timeline:
                avg_time = min(e.timestamp for e in pattern.timeline)
                evidence = f"{pattern.type.value}: {pattern.title}"
                stages.append((pattern.stage, avg_time, evidence))

        # 時系列でソート
        stages.sort(key=lambda x: x[1])
        return stages

    def _calculate_progress_score(
        self, patterns: List[LearningPattern], events: List[DevelopmentEvent]
    ) -> float:
        """進歩スコアを計算"""
        if not patterns:
            return 0.0

        # 複数の要素から進歩スコアを計算
        avg_confidence = statistics.mean([p.confidence for p in patterns])
        avg_success_rate = statistics.mean([p.success_rate for p in patterns if p.success_rate > 0])

        # 学習段階の進歩度
        stage_scores = {
            LearningStage.EXPLORATION: 0.25,
            LearningStage.EXPERIMENTATION: 0.5,
            LearningStage.CONSOLIDATION: 0.75,
            LearningStage.MASTERY: 1.0,
        }

        current_stages = [p.stage for p in patterns[-3:]]  # 直近3パターン
        avg_stage_score = statistics.mean([stage_scores[stage] for stage in current_stages])

        # 重み付き平均
        progress_score = avg_confidence * 0.3 + avg_success_rate * 0.4 + avg_stage_score * 0.3

        return min(1.0, progress_score)

    def _identify_key_milestones(self, patterns: List[LearningPattern]) -> List[str]:
        """主要マイルストーンを特定"""
        milestones = []

        # 高信頼度パターンをマイルストーンとして特定
        high_confidence_patterns = [p for p in patterns if p.confidence > 0.8]

        for pattern in high_confidence_patterns[:5]:  # 上位5つ
            milestone = f"{pattern.type.value}: {pattern.title}"
            milestones.append(milestone)

        return milestones

    def _infer_primary_domain(self, events: List[DevelopmentEvent]) -> str:
        """主要ドメインを推定"""
        domain_keywords = {
            "frontend": ["frontend", "ui", "react", "vue", "angular", "css", "html"],
            "backend": ["backend", "api", "server", "database", "sql"],
            "devops": ["docker", "kubernetes", "ci", "cd", "deploy"],
            "ai": ["ai", "ml", "machine learning", "neural", "model"],
            "testing": ["test", "testing", "qa", "unit", "integration"],
        }

        domain_scores = defaultdict(int)

        for event in events:
            text = (event.title + " " + event.description + " " + " ".join(event.labels)).lower()

            for domain, keywords in domain_keywords.items():
                for keyword in keywords:
                    if keyword in text:
                        domain_scores[domain] += 1

        if domain_scores:
            return max(domain_scores, key=domain_scores.get)

        return "general"

    def _predict_learning_opportunities(
        self, trajectory: LearningTrajectory, recent_patterns: List[LearningPattern]
    ) -> List[str]:
        """次の学習機会を予測"""
        opportunities = []

        # 現在の強い領域を特定
        strong_areas = [p.title for p in recent_patterns if p.success_rate > 0.8]

        # 改善の余地がある領域を特定
        improvement_areas = [p.title for p in recent_patterns if p.success_rate < 0.6]

        if strong_areas:
            opportunities.append(f"Strong areas to build upon: {', '.join(strong_areas[:2])}")

        if improvement_areas:
            opportunities.append(f"Areas for improvement: {', '.join(improvement_areas[:2])}")

        # ドメイン別の推奨
        if trajectory.domain == "frontend":
            opportunities.append("Consider exploring advanced UI frameworks or design systems")
        elif trajectory.domain == "backend":
            opportunities.append(
                "Consider learning microservices architecture or database optimization"
            )
        elif trajectory.domain == "ai":
            opportunities.append("Consider exploring MLOps or advanced model architectures")

        return opportunities[:5]

    def _identify_risk_areas(
        self, trajectory: LearningTrajectory, recent_patterns: List[LearningPattern]
    ) -> List[str]:
        """リスク領域を特定"""
        risks = []

        # 低成功率パターンをリスクとして特定
        low_success_patterns = [p for p in recent_patterns if p.success_rate < 0.4]

        if low_success_patterns:
            risks.append(f"Low success rate in {len(low_success_patterns)} recent patterns")

        # 反復パターンをリスクとして特定
        repetition_patterns = [
            p for p in recent_patterns if p.type == PatternType.REPETITION_PATTERN
        ]
        if repetition_patterns:
            risks.append("Repetitive issues suggesting need for process improvement")

        # 学習停滞をリスクとして特定
        if trajectory.progress_score < 0.5:
            risks.append("Learning progress appears to be stagnating")

        return risks

    def _recommend_focus_areas(
        self, trajectory: LearningTrajectory, recent_patterns: List[LearningPattern]
    ) -> List[str]:
        """推奨フォーカス領域"""
        focus_areas = []

        # 成功パターンの強化
        success_patterns = [p for p in recent_patterns if p.type == PatternType.SUCCESS_PATTERN]
        if success_patterns:
            focus_areas.append("Strengthen and document successful patterns")

        # 学習パターンの継続
        learning_patterns = [p for p in recent_patterns if p.type == PatternType.LEARNING_PATTERN]
        if learning_patterns:
            focus_areas.append("Continue structured learning approach")

        # 次段階への準備
        current_stage = trajectory.stages[-1][0] if trajectory.stages else LearningStage.EXPLORATION
        if current_stage == LearningStage.EXPERIMENTATION:
            focus_areas.append("Focus on consolidating experimental learnings")
        elif current_stage == LearningStage.CONSOLIDATION:
            focus_areas.append("Prepare for mastery-level challenges")

        return focus_areas[:3]

    def _predict_next_stage(self, trajectory: LearningTrajectory) -> LearningStage:
        """次の学習段階を予測"""
        if not trajectory.stages:
            return LearningStage.EXPLORATION

        current_stage = trajectory.stages[-1][0]

        # 現在の段階に基づいて次の段階を予測
        stage_progression = {
            LearningStage.EXPLORATION: LearningStage.EXPERIMENTATION,
            LearningStage.EXPERIMENTATION: LearningStage.CONSOLIDATION,
            LearningStage.CONSOLIDATION: LearningStage.MASTERY,
            LearningStage.MASTERY: LearningStage.MASTERY,  # 既にマスタリー段階
        }

        return stage_progression.get(current_stage, LearningStage.EXPLORATION)

    def _calculate_prediction_confidence(
        self, trajectory: LearningTrajectory, recent_patterns: List[LearningPattern]
    ) -> float:
        """予測信頼度を計算"""
        confidence_factors = []

        # パターン数に基づく信頼度
        pattern_confidence = min(1.0, len(recent_patterns) / 10)
        confidence_factors.append(pattern_confidence)

        # 時間範囲に基づく信頼度
        if trajectory.start_date and trajectory.end_date:
            time_span = trajectory.end_date - trajectory.start_date
            time_confidence = min(1.0, time_span.days / 180)  # 6ヶ月で最大信頼度
            confidence_factors.append(time_confidence)

        # パターンの一貫性に基づく信頼度
        if recent_patterns:
            consistencies = [p.confidence for p in recent_patterns]
            consistency_confidence = statistics.mean(consistencies)
            confidence_factors.append(consistency_confidence)

        return statistics.mean(confidence_factors) if confidence_factors else 0.5

    def _create_timeline_chart_data(
        self, events: List[DevelopmentEvent], patterns: List[LearningPattern]
    ) -> Dict[str, Any]:
        """タイムライン チャート用データを作成"""
        chart_data = {
            "events": [],
            "patterns": [],
            "timeline": {
                "start": min(e.timestamp for e in events).isoformat() if events else "",
                "end": max(e.timestamp for e in events).isoformat() if events else "",
            },
        }

        # イベントデータ
        for event in events[-50:]:  # 直近50イベント
            chart_data["events"].append(
                {
                    "date": event.timestamp.isoformat(),
                    "title": event.title,
                    "type": event.type,
                    "description": event.description[:100],
                }
            )

        # パターンデータ
        for pattern in patterns:
            if pattern.timeline:
                start_time = min(e.timestamp for e in pattern.timeline)
                end_time = max(e.timestamp for e in pattern.timeline)

                chart_data["patterns"].append(
                    {
                        "start": start_time.isoformat(),
                        "end": end_time.isoformat(),
                        "title": pattern.title,
                        "type": pattern.type.value,
                        "confidence": pattern.confidence,
                    }
                )

        return chart_data

    def _create_pattern_distribution(self, patterns: List[LearningPattern]) -> Dict[str, int]:
        """パターン分布データを作成"""
        distribution = Counter(p.type.value for p in patterns)
        return dict(distribution)

    def _create_learning_curve_data(self, trajectory: LearningTrajectory) -> List[Dict[str, Any]]:
        """学習曲線データを作成"""
        curve_data = []

        for i, (stage, timestamp, evidence) in enumerate(trajectory.stages):
            curve_data.append(
                {
                    "date": timestamp.isoformat(),
                    "stage": stage.value,
                    "stage_numeric": list(LearningStage).index(stage),
                    "evidence": evidence,
                    "progress": i / len(trajectory.stages) if trajectory.stages else 0,
                }
            )

        return curve_data

    def _create_success_trend_data(self, patterns: List[LearningPattern]) -> List[Dict[str, Any]]:
        """成功トレンドデータを作成"""
        trend_data = []

        # 月ごとの成功率を計算
        monthly_success = defaultdict(list)

        for pattern in patterns:
            if pattern.timeline:
                month_key = min(e.timestamp for e in pattern.timeline).strftime("%Y-%m")
                monthly_success[month_key].append(pattern.success_rate)

        for month, success_rates in sorted(monthly_success.items()):
            trend_data.append(
                {
                    "month": month,
                    "success_rate": statistics.mean(success_rates),
                    "pattern_count": len(success_rates),
                }
            )

        return trend_data

    def _create_skill_radar_data(self, patterns: List[LearningPattern]) -> Dict[str, float]:
        """スキルレーダーデータを作成"""
        skill_domains = {
            "technical": 0.0,
            "problem_solving": 0.0,
            "learning_agility": 0.0,
            "consistency": 0.0,
            "innovation": 0.0,
        }

        if not patterns:
            return skill_domains

        # 各スキルドメインのスコアを計算
        technical_patterns = [
            p for p in patterns if "technical" in p.title.lower() or "implement" in p.title.lower()
        ]
        skill_domains["technical"] = (
            statistics.mean([p.success_rate for p in technical_patterns])
            if technical_patterns
            else 0.5
        )

        problem_patterns = [p for p in patterns if p.type == PatternType.SUCCESS_PATTERN]
        skill_domains["problem_solving"] = (
            statistics.mean([p.success_rate for p in problem_patterns]) if problem_patterns else 0.5
        )

        learning_patterns = [p for p in patterns if p.type == PatternType.LEARNING_PATTERN]
        skill_domains["learning_agility"] = (
            statistics.mean([p.success_rate for p in learning_patterns])
            if learning_patterns
            else 0.5
        )

        skill_domains["consistency"] = self._calculate_consistency_score(patterns)

        evolution_patterns = [p for p in patterns if p.type == PatternType.EVOLUTION_PATTERN]
        skill_domains["innovation"] = (
            statistics.mean([p.success_rate for p in evolution_patterns])
            if evolution_patterns
            else 0.5
        )

        return skill_domains

    def _create_heatmap_data(self, events: List[DevelopmentEvent]) -> List[List[float]]:
        """ヒートマップデータを作成（曜日×時間の活動分布）"""
        # 7日 x 24時間のマトリックス
        heatmap = [[0.0 for _ in range(24)] for _ in range(7)]

        for event in events:
            day_of_week = event.timestamp.weekday()  # 0=月曜日
            hour = event.timestamp.hour
            heatmap[day_of_week][hour] += 1

        # 正規化 (0-1の範囲)
        max_activity = max(max(row) for row in heatmap) if any(any(row) for row in heatmap) else 1

        for i in range(7):
            for j in range(24):
                heatmap[i][j] = heatmap[i][j] / max_activity if max_activity > 0 else 0

        return heatmap

    def _create_empty_trajectory(self, person: str) -> LearningTrajectory:
        """空の学習軌跡を作成"""
        now = datetime.now()
        return LearningTrajectory(
            person=person,
            domain="general",
            start_date=now,
            end_date=now,
            stages=[],
            patterns=[],
            progress_score=0.0,
            key_milestones=[],
        )
