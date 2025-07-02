"""
Advanced Pattern Recognition System for Learning Path Analysis

学習パターン認識エンジン - 開発履歴から成功・失敗パターンを抽出し、
学習軌跡を分析するシステム
"""

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional

import numpy as np
import structlog
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

logger = structlog.get_logger()


class PatternType(Enum):
    """パターンの種類"""

    SUCCESS_PATTERN = "success_pattern"
    LEARNING_PATTERN = "learning_pattern"
    FAILURE_PATTERN = "failure_pattern"
    REPETITION_PATTERN = "repetition_pattern"
    EVOLUTION_PATTERN = "evolution_pattern"


class LearningStage(Enum):
    """学習段階"""

    EXPLORATION = "exploration"  # 探索段階
    EXPERIMENTATION = "experimentation"  # 実験段階
    CONSOLIDATION = "consolidation"  # 定着段階
    MASTERY = "mastery"  # 習得段階


@dataclass
class DevelopmentEvent:
    """開発イベント"""

    id: str
    type: str  # issue, commit, pr
    timestamp: datetime
    title: str
    description: str
    author: str
    metadata: dict[str, Any] = field(default_factory=dict)
    labels: list[str] = field(default_factory=list)
    related_events: list[str] = field(default_factory=list)


@dataclass
class LearningPattern:
    """学習パターン"""

    pattern_id: str
    type: PatternType
    title: str
    description: str
    confidence: float
    evidence: list[str]
    timeline: list[DevelopmentEvent]
    insights: list[str]
    stage: LearningStage
    success_rate: float
    frequency: int
    recommendations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "pattern_id": self.pattern_id,
            "type": self.type.value,
            "title": self.title,
            "description": self.description,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "insights": self.insights,
            "stage": self.stage.value,
            "success_rate": self.success_rate,
            "frequency": self.frequency,
            "recommendations": self.recommendations,
            "timeline_length": len(self.timeline),
        }


@dataclass
class LearningTrajectory:
    """学習軌跡"""

    person: str
    domain: str
    start_date: datetime
    end_date: datetime
    stages: list[tuple[LearningStage, datetime, str]]  # (stage, date, evidence)
    patterns: list[LearningPattern]
    progress_score: float
    key_milestones: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "person": self.person,
            "domain": self.domain,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "stages": [(s.value, d.isoformat(), e) for s, d, e in self.stages],
            "patterns": [p.to_dict() for p in self.patterns],
            "progress_score": self.progress_score,
            "key_milestones": self.key_milestones,
        }


class PatternRecognitionEngine:
    """パターン認識エンジン"""

    def __init__(self) -> None:
        self.vectorizer = TfidfVectorizer(
            max_features=1000, stop_words="english", ngram_range=(1, 2)
        )

        # パターン認識のためのキーワード定義
        self.success_keywords = [
            "fix",
            "solve",
            "implement",
            "complete",
            "success",
            "work",
            "merge",
            "deploy",
            "release",
            "stable",
            "ready",
        ]

        self.failure_keywords = [
            "error",
            "bug",
            "fail",
            "issue",
            "problem",
            "broken",
            "revert",
            "rollback",
            "crash",
            "wrong",
            "mistake",
        ]

        self.learning_keywords = [
            "learn",
            "try",
            "experiment",
            "test",
            "explore",
            "research",
            "investigate",
            "study",
            "understand",
            "figure out",
            "discover",
        ]

        self.improvement_keywords = [
            "improve",
            "optimize",
            "refactor",
            "enhance",
            "upgrade",
            "better",
            "faster",
            "efficient",
            "clean",
            "update",
        ]

    def analyze_development_patterns(self, events: list[DevelopmentEvent]) -> list[LearningPattern]:
        """開発イベントからパターンを分析"""
        logger.info(f"Analyzing patterns from {len(events)} development events")

        patterns = []

        # 時系列順にソート
        sorted_events = sorted(events, key=lambda x: x.timestamp)

        # 各種パターンを検出
        patterns.extend(self._detect_success_patterns(sorted_events))
        patterns.extend(self._detect_learning_patterns(sorted_events))
        patterns.extend(self._detect_failure_recovery_patterns(sorted_events))
        patterns.extend(self._detect_repetition_patterns(sorted_events))
        patterns.extend(self._detect_evolution_patterns(sorted_events))

        logger.info(f"Detected {len(patterns)} patterns")
        return patterns

    def _detect_success_patterns(self, events: list[DevelopmentEvent]) -> list[LearningPattern]:
        """成功パターンの検出"""
        patterns = []

        # Issue → 迅速解決パターン
        quick_resolutions = self._find_quick_resolutions(events)
        if quick_resolutions:
            pattern = LearningPattern(
                pattern_id=f"success_quick_resolution_{len(quick_resolutions)}",
                type=PatternType.SUCCESS_PATTERN,
                title="迅速問題解決パターン",
                description=f"{len(quick_resolutions)}個のIssueが24時間以内に解決されています",
                confidence=min(0.9, len(quick_resolutions) / 10),
                evidence=[
                    f"Issue #{event.metadata.get('issue_number', event.id)} resolved quickly"
                    for event in quick_resolutions[:5]
                ],
                timeline=quick_resolutions[:10],
                insights=[
                    "問題を迅速に特定・解決する能力が高い",
                    "効果的なデバッグプロセスが確立されている",
                    "類似問題の経験が豊富",
                ],
                stage=LearningStage.MASTERY,
                success_rate=1.0,
                frequency=len(quick_resolutions),
                recommendations=[
                    "この解決プロセスをドキュメント化してチーム共有",
                    "迅速解決の要因を分析して標準化",
                ],
            )
            patterns.append(pattern)

        # 継続的成功パターン
        consistent_success = self._find_consistent_success(events)
        if consistent_success:
            patterns.append(consistent_success)

        return patterns

    def _detect_learning_patterns(self, events: list[DevelopmentEvent]) -> list[LearningPattern]:
        """学習パターンの検出"""
        patterns = []

        # 実験 → 学習 → 改善パターン
        learning_cycles = self._find_learning_cycles(events)
        for cycle in learning_cycles:
            pattern = LearningPattern(
                pattern_id=f"learning_cycle_{cycle['domain']}",
                type=PatternType.LEARNING_PATTERN,
                title=f"{cycle['domain']}学習サイクル",
                description=f"{cycle['domain']}領域での体系的な学習パターンが観察されます",
                confidence=cycle["confidence"],
                evidence=cycle["evidence"],
                timeline=cycle["events"],
                insights=cycle["insights"],
                stage=cycle["stage"],
                success_rate=cycle["success_rate"],
                frequency=len(cycle["events"]),
                recommendations=cycle["recommendations"],
            )
            patterns.append(pattern)

        return patterns

    def _detect_failure_recovery_patterns(
        self, events: list[DevelopmentEvent]
    ) -> list[LearningPattern]:
        """失敗からの回復パターンの検出"""
        patterns = []

        # 失敗 → 学習 → 成功パターン
        recovery_patterns = self._find_failure_recovery_sequences(events)
        for recovery in recovery_patterns:
            pattern = LearningPattern(
                pattern_id=f"failure_recovery_{recovery['id']}",
                type=PatternType.FAILURE_PATTERN,
                title="失敗からの回復パターン",
                description=recovery["description"],
                confidence=recovery["confidence"],
                evidence=recovery["evidence"],
                timeline=recovery["events"],
                insights=[
                    "失敗から迅速に学習する能力",
                    "レジリエンスの高い開発プロセス",
                    "継続的改善のマインドセット",
                ],
                stage=LearningStage.CONSOLIDATION,
                success_rate=recovery["success_rate"],
                frequency=1,
                recommendations=[
                    "失敗事例をポストモーテムとして文書化",
                    "学習プロセスをチーム全体で共有",
                ],
            )
            patterns.append(pattern)

        return patterns

    def _detect_repetition_patterns(self, events: list[DevelopmentEvent]) -> list[LearningPattern]:
        """反復パターンの検出"""
        patterns = []

        # 類似問題の反復と改善パターン
        repetitions = self._find_repetitive_issues(events)
        for rep_group in repetitions:
            if len(rep_group["events"]) >= 3:  # 3回以上の反復
                pattern = LearningPattern(
                    pattern_id=f"repetition_{rep_group['theme']}",
                    type=PatternType.REPETITION_PATTERN,
                    title=f"{rep_group['theme']}問題の反復パターン",
                    description=f"{rep_group['theme']}に関連する問題が{len(rep_group['events'])}回発生しています",
                    confidence=0.8,
                    evidence=[f"Similar issue: {event.title}" for event in rep_group["events"][:5]],
                    timeline=rep_group["events"],
                    insights=[
                        "特定領域での課題の再発",
                        "根本原因への対処が必要",
                        "予防策の検討が重要",
                    ],
                    stage=LearningStage.EXPERIMENTATION,
                    success_rate=rep_group["improvement_trend"],
                    frequency=len(rep_group["events"]),
                    recommendations=[
                        "根本原因分析の実施",
                        "予防的対策の策定",
                        "チェックリストの作成",
                    ],
                )
                patterns.append(pattern)

        return patterns

    def _detect_evolution_patterns(self, events: list[DevelopmentEvent]) -> list[LearningPattern]:
        """進化パターンの検出"""
        patterns = []

        # スキル進化パターン
        evolutions = self._find_skill_evolutions(events)
        for evolution in evolutions:
            pattern = LearningPattern(
                pattern_id=f"evolution_{evolution['skill']}",
                type=PatternType.EVOLUTION_PATTERN,
                title=f"{evolution['skill']}スキル進化パターン",
                description=evolution["description"],
                confidence=evolution["confidence"],
                evidence=evolution["evidence"],
                timeline=evolution["events"],
                insights=evolution["insights"],
                stage=evolution["current_stage"],
                success_rate=evolution["success_rate"],
                frequency=len(evolution["events"]),
                recommendations=evolution["recommendations"],
            )
            patterns.append(pattern)

        return patterns

    def _find_quick_resolutions(self, events: list[DevelopmentEvent]) -> list[DevelopmentEvent]:
        """24時間以内に解決されたIssueを検出"""
        quick_resolutions = []

        # Issueの作成と解決をペアリング
        issues = {}
        for event in events:
            if event.type == "issue" and "created" in event.description.lower():
                issue_id = event.metadata.get("issue_number", event.id)
                issues[issue_id] = {"created": event, "closed": None}
            elif event.type == "issue" and "closed" in event.description.lower():
                issue_id = event.metadata.get("issue_number", event.id)
                if issue_id in issues:
                    issues[issue_id]["closed"] = event

        # 24時間以内解決をチェック
        for _issue_id, data in issues.items():
            if data["created"] and data["closed"]:
                resolution_time = data["closed"].timestamp - data["created"].timestamp
                if resolution_time <= timedelta(hours=24):
                    quick_resolutions.append(data["closed"])

        return quick_resolutions

    def _find_consistent_success(self, events: list[DevelopmentEvent]) -> Optional[LearningPattern]:
        """継続的成功パターンを検出"""
        success_events = []

        for event in events:
            text = (event.title + " " + event.description).lower()
            if any(keyword in text for keyword in self.success_keywords):
                success_events.append(event)

        if len(success_events) >= 10:  # 10回以上の成功
            # 時系列での成功率を計算
            success_rate = len(success_events) / len(events)

            return LearningPattern(
                pattern_id="consistent_success",
                type=PatternType.SUCCESS_PATTERN,
                title="継続的成功パターン",
                description=f"全体の{success_rate:.1%}が成功イベントで、継続的な成果を上げています",
                confidence=min(0.95, success_rate * 2),
                evidence=[f"Success: {event.title}" for event in success_events[:5]],
                timeline=success_events[-10:],
                insights=["安定した開発プロセスの確立", "高い技術的習熟度", "効果的な問題解決能力"],
                stage=LearningStage.MASTERY,
                success_rate=success_rate,
                frequency=len(success_events),
            )

        return None

    def _find_learning_cycles(self, events: list[DevelopmentEvent]) -> list[dict[str, Any]]:
        """学習サイクルを検出"""
        cycles = []

        # ドメインごとにイベントをグループ化
        domains = self._extract_domains(events)

        for domain, domain_events in domains.items():
            if len(domain_events) < 5:
                continue

            # 学習段階の推移を分析
            stages = self._analyze_learning_stages(domain_events)

            if len(stages) >= 3:  # 最低3段階の学習プロセス
                cycle = {
                    "domain": domain,
                    "events": domain_events,
                    "confidence": min(0.9, len(stages) / 4),
                    "evidence": [f"Stage {i + 1}: {stage}" for i, stage in enumerate(stages[:3])],
                    "insights": [
                        f"{domain}領域での体系的な学習",
                        "段階的なスキル向上",
                        "継続的な実践と改善",
                    ],
                    "stage": self._determine_current_stage(stages),
                    "success_rate": self._calculate_domain_success_rate(domain_events),
                    "recommendations": [
                        f"{domain}の学習を更に深化",
                        "他のドメインへの応用を検討",
                        "知見の体系化とドキュメント化",
                    ],
                }
                cycles.append(cycle)

        return cycles

    def _find_failure_recovery_sequences(
        self, events: list[DevelopmentEvent]
    ) -> list[dict[str, Any]]:
        """失敗からの回復シーケンスを検出"""
        recoveries = []

        for i, event in enumerate(events[:-2]):
            text = (event.title + " " + event.description).lower()

            # 失敗イベントを検出
            if any(keyword in text for keyword in self.failure_keywords):
                # 後続イベントで回復パターンを探索
                recovery_window = events[i + 1 : min(i + 10, len(events))]

                learning_events = []
                success_events = []

                for follow_up in recovery_window:
                    follow_text = (follow_up.title + " " + follow_up.description).lower()
                    if any(keyword in follow_text for keyword in self.learning_keywords):
                        learning_events.append(follow_up)
                    elif any(keyword in follow_text for keyword in self.success_keywords):
                        success_events.append(follow_up)

                # 学習 → 成功のシーケンスがある場合
                if learning_events and success_events:
                    recovery = {
                        "id": f"recovery_{i}",
                        "description": "失敗後の学習プロセスを経て成功に至ったパターン",
                        "confidence": 0.8,
                        "evidence": [
                            f"Failure: {event.title}",
                            f"Learning: {learning_events[0].title}",
                            f"Success: {success_events[0].title}",
                        ],
                        "events": [event] + learning_events + success_events,
                        "success_rate": len(success_events)
                        / (len(learning_events) + len(success_events)),
                    }
                    recoveries.append(recovery)

        return recoveries

    def _find_repetitive_issues(self, events: list[DevelopmentEvent]) -> list[dict[str, Any]]:
        """反復的な問題を検出"""
        if not events:
            return []

        # テキストベクトル化
        texts = [event.title + " " + event.description for event in events]

        try:
            vectors = self.vectorizer.fit_transform(texts)

            # クラスタリングで類似イベントをグループ化
            n_clusters = min(10, len(events) // 3)
            if n_clusters < 2:
                return []

            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            clusters = kmeans.fit_predict(vectors)

            # クラスタごとに分析
            repetition_groups = []
            for cluster_id in range(n_clusters):
                cluster_events = [events[i] for i, c in enumerate(clusters) if c == cluster_id]

                if len(cluster_events) >= 3:  # 3回以上の反復
                    # テーマを抽出
                    theme = self._extract_theme(cluster_events)

                    # 改善トレンドを分析
                    improvement_trend = self._analyze_improvement_trend(cluster_events)

                    repetition_groups.append(
                        {
                            "theme": theme,
                            "events": cluster_events,
                            "improvement_trend": improvement_trend,
                        }
                    )

            return repetition_groups

        except Exception as e:
            logger.warning(f"Failed to analyze repetitive patterns: {e}")
            return []

    def _find_skill_evolutions(self, events: list[DevelopmentEvent]) -> list[dict[str, Any]]:
        """スキル進化パターンを検出"""
        evolutions = []

        # 技術領域ごとにイベントをグループ化
        tech_domains = self._extract_tech_domains(events)

        for domain, domain_events in tech_domains.items():
            if len(domain_events) < 5:
                continue

            # 時系列でのスキル進化を分析
            evolution = self._analyze_skill_evolution(domain, domain_events)
            if evolution:
                evolutions.append(evolution)

        return evolutions

    def _extract_domains(self, events: list[DevelopmentEvent]) -> dict[str, list[DevelopmentEvent]]:
        """イベントからドメインを抽出してグループ化"""
        domains: dict[str, list[DevelopmentEvent]] = {}

        for event in events:
            # ラベルやタイトルからドメインを推定
            text = (event.title + " " + " ".join(event.labels)).lower()

            domain = "general"
            if any(word in text for word in ["frontend", "ui", "react", "vue", "angular"]):
                domain = "frontend"
            elif any(word in text for word in ["backend", "api", "server", "database"]):
                domain = "backend"
            elif any(word in text for word in ["test", "testing", "qa"]):
                domain = "testing"
            elif any(word in text for word in ["devops", "ci", "cd", "deploy"]):
                domain = "devops"
            elif any(word in text for word in ["security", "auth", "authentication"]):
                domain = "security"

            if domain not in domains:
                domains[domain] = []
            domains[domain].append(event)

        return domains

    def _analyze_learning_stages(self, events: list[DevelopmentEvent]) -> list[str]:
        """学習段階を分析"""
        stages = []

        # 時系列順にソート
        sorted_events = sorted(events, key=lambda x: x.timestamp)

        for event in sorted_events:
            text = (event.title + " " + event.description).lower()

            if any(word in text for word in ["learn", "try", "experiment"]):
                stages.append("experimentation")
            elif any(word in text for word in ["implement", "add", "create"]):
                stages.append("implementation")
            elif any(word in text for word in ["improve", "optimize", "refactor"]):
                stages.append("optimization")
            elif any(word in text for word in ["master", "expert", "advanced"]):
                stages.append("mastery")

        return stages

    def _determine_current_stage(self, stages: list[str]) -> LearningStage:
        """現在の学習段階を判定"""
        if not stages:
            return LearningStage.EXPLORATION

        recent_stages = stages[-3:]  # 直近3つの段階

        if "mastery" in recent_stages:
            return LearningStage.MASTERY
        elif "optimization" in recent_stages:
            return LearningStage.CONSOLIDATION
        elif "implementation" in recent_stages:
            return LearningStage.EXPERIMENTATION
        else:
            return LearningStage.EXPLORATION

    def _calculate_domain_success_rate(self, events: list[DevelopmentEvent]) -> float:
        """ドメインでの成功率を計算"""
        success_count = 0

        for event in events:
            text = (event.title + " " + event.description).lower()
            if any(keyword in text for keyword in self.success_keywords):
                success_count += 1

        return success_count / len(events) if events else 0

    def _extract_theme(self, events: list[DevelopmentEvent]) -> str:
        """イベントグループからテーマを抽出"""
        # 最も頻出する単語をテーマとして抽出
        all_text = " ".join([event.title for event in events]).lower()
        words = re.findall(r"\b\w+\b", all_text)

        # 頻度計算
        word_freq: dict[str, int] = {}
        for word in words:
            if len(word) > 3:  # 短すぎる単語は除外
                word_freq[word] = word_freq.get(word, 0) + 1

        if word_freq:
            most_common = max(word_freq, key=lambda x: word_freq[x])
            return most_common.capitalize()

        return "Unknown"

    def _analyze_improvement_trend(self, events: list[DevelopmentEvent]) -> float:
        """改善トレンドを分析"""
        # 時系列順にソートして解決時間の変化を分析
        sorted_events = sorted(events, key=lambda x: x.timestamp)

        success_scores = []
        for event in sorted_events:
            text = (event.title + " " + event.description).lower()
            score = 0.0
            if any(keyword in text for keyword in self.success_keywords):
                score += 1.0
            if any(keyword in text for keyword in self.improvement_keywords):
                score += 0.5
            success_scores.append(score)

        if len(success_scores) < 2:
            return 0.5

        # 線形トレンドを計算
        x = np.arange(len(success_scores))
        y = np.array(success_scores)

        if np.std(y) == 0:
            return 0.5

        correlation = float(np.corrcoef(x, y)[0, 1])
        return max(0.0, min(1.0, (correlation + 1) / 2))  # -1,1 を 0,1 に正規化

    def _extract_tech_domains(
        self, events: list[DevelopmentEvent]
    ) -> dict[str, list[DevelopmentEvent]]:
        """技術ドメインを抽出"""
        tech_domains: dict[str, list[DevelopmentEvent]] = {}

        tech_keywords = {
            "python": ["python", "django", "flask", "pandas"],
            "javascript": ["javascript", "js", "node", "react", "vue"],
            "go": ["go", "golang", "gin", "gorilla"],
            "database": ["sql", "postgres", "mysql", "mongo"],
            "docker": ["docker", "container", "kubernetes"],
            "ai": ["ai", "ml", "machine learning", "neural", "model"],
        }

        for event in events:
            text = (event.title + " " + event.description + " " + " ".join(event.labels)).lower()

            for domain, keywords in tech_keywords.items():
                if any(keyword in text for keyword in keywords):
                    if domain not in tech_domains:
                        tech_domains[domain] = []
                    tech_domains[domain].append(event)

        return tech_domains

    def _analyze_skill_evolution(
        self, domain: str, events: list[DevelopmentEvent]
    ) -> Optional[dict[str, Any]]:
        """特定ドメインでのスキル進化を分析"""
        if len(events) < 5:
            return None

        sorted_events = sorted(events, key=lambda x: x.timestamp)

        # 複雑さの進化を分析
        complexity_scores = []
        for event in sorted_events:
            text = (event.title + " " + event.description).lower()

            complexity = 0
            if any(word in text for word in ["simple", "basic", "tutorial"]):
                complexity = 1
            elif any(word in text for word in ["intermediate", "implement"]):
                complexity = 2
            elif any(word in text for word in ["advanced", "complex", "optimize"]):
                complexity = 3
            elif any(word in text for word in ["expert", "architecture", "design"]):
                complexity = 4

            complexity_scores.append(complexity)

        # 進化トレンドを計算
        if len(complexity_scores) < 2:
            return None

        evolution_trend = np.corrcoef(range(len(complexity_scores)), complexity_scores)[0, 1]

        current_stage = LearningStage.EXPLORATION
        avg_complexity = np.mean(complexity_scores[-3:])  # 直近3イベントの平均

        if avg_complexity >= 3.5:
            current_stage = LearningStage.MASTERY
        elif avg_complexity >= 2.5:
            current_stage = LearningStage.CONSOLIDATION
        elif avg_complexity >= 1.5:
            current_stage = LearningStage.EXPERIMENTATION

        return {
            "skill": domain,
            "description": f"{domain}領域でのスキル進化パターン（複雑度: {avg_complexity:.1f}）",
            "confidence": min(0.9, abs(evolution_trend)),
            "evidence": [f"Event: {event.title}" for event in sorted_events[-3:]],
            "events": sorted_events,
            "insights": [f"{domain}技術の段階的習得", "複雑さレベルの向上", "継続的な技術向上"],
            "current_stage": current_stage,
            "success_rate": self._calculate_domain_success_rate(events),
            "recommendations": [
                f"{domain}の更なる深化",
                "実践プロジェクトでの活用",
                "知識の体系化",
            ],
        }


def create_development_events_from_issues(
    issues_data: list[dict[str, Any]],
) -> list[DevelopmentEvent]:
    """GitHub Issues データから DevelopmentEvent を作成"""
    events = []

    for issue in issues_data:
        # Issue 作成イベント
        created_event = DevelopmentEvent(
            id=f"issue-{issue['number']}-created",
            type="issue",
            timestamp=datetime.fromisoformat(issue["created_at"].replace("Z", "+00:00")),
            title=issue["title"],
            description=f"Issue created: {issue['body'][:200]}...",
            author=issue["user"]["login"],
            metadata={"issue_number": issue["number"], "state": issue["state"]},
            labels=[label["name"] for label in issue.get("labels", [])],
        )
        events.append(created_event)

        # Issue クローズイベント（該当する場合）
        if issue["state"] == "closed" and issue.get("closed_at"):
            closed_event = DevelopmentEvent(
                id=f"issue-{issue['number']}-closed",
                type="issue",
                timestamp=datetime.fromisoformat(issue["closed_at"].replace("Z", "+00:00")),
                title=f"Closed: {issue['title']}",
                description=f"Issue closed: {issue['body'][:200]}...",
                author=issue["user"]["login"],
                metadata={"issue_number": issue["number"], "state": "closed"},
                labels=[label["name"] for label in issue.get("labels", [])],
                related_events=[created_event.id],
            )
            events.append(closed_event)

    return events
