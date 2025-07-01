"""
Advanced Topic Model for GitHub Issues Classification

トピック分類の精度向上を目的とした高度なモデリング機能
- Few-shot学習サンプル管理
- 多言語プロンプト最適化
- 分類精度評価システム
"""

import json
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Tuple

import structlog
from langchain.schema import BaseMessage, HumanMessage, SystemMessage

from models.classification import ClassificationResult, Issue

logger = structlog.get_logger()


class Language(Enum):
    """支援する言語"""

    JAPANESE = "ja"
    ENGLISH = "en"
    AUTO = "auto"


@dataclass
class FewShotExample:
    """Few-shot学習用のサンプルデータ"""

    issue: Issue
    expected_category: str
    expected_confidence: float
    reasoning: str
    language: Language


@dataclass
class ClassificationMetrics:
    """分類精度評価メトリクス"""

    accuracy: float
    precision_per_category: Dict[str, float]
    recall_per_category: Dict[str, float]
    f1_score_per_category: Dict[str, float]
    average_f1_score: float
    average_response_time_ms: float
    total_classified: int
    timestamp: datetime


class EnhancedTopicModel:
    """高度なトピック分類モデル"""

    def __init__(self):
        self.few_shot_examples: List[FewShotExample] = []
        self.classification_history: List[Tuple[Issue, ClassificationResult]] = []

        # カテゴリ定義の拡張
        self.enhanced_categories = {
            "bug-fix": {
                "name_ja": "バグ修正",
                "name_en": "Bug Fix",
                "description_ja": "システムエラー、バグ報告、異常動作の修正、例外処理に関するIssue。既存機能の不具合解決が主目的。",
                "description_en": "Issues related to system errors, bug reports, abnormal behavior fixes, and exception handling. Primary focus on resolving existing functionality problems.",
                "keywords_ja": [
                    "バグ",
                    "エラー",
                    "不具合",
                    "異常",
                    "例外",
                    "修正",
                    "直す",
                    "動かない",
                    "失敗",
                ],
                "keywords_en": [
                    "bug",
                    "error",
                    "crash",
                    "fix",
                    "broken",
                    "fails",
                    "exception",
                    "defect",
                    "malfunction",
                ],
                "indicators": [
                    "stack trace",
                    "error message",
                    "reproducible steps",
                    "expected vs actual",
                ],
            },
            "feature-request": {
                "name_ja": "機能要求",
                "name_en": "Feature Request",
                "description_ja": "新機能の提案・追加、既存機能の改善・拡張要求。ユーザビリティ向上や新しい価値提供が目的。",
                "description_en": "Proposals for new features, enhancements to existing functionality. Focused on improving usability and providing new value.",
                "keywords_ja": [
                    "機能",
                    "追加",
                    "新しい",
                    "改善",
                    "拡張",
                    "要求",
                    "提案",
                    "実装",
                    "できるように",
                ],
                "keywords_en": [
                    "feature",
                    "enhancement",
                    "add",
                    "improve",
                    "request",
                    "new",
                    "implement",
                    "ability",
                ],
                "indicators": ["user story", "acceptance criteria", "mockup", "specification"],
            },
            "architecture": {
                "name_ja": "アーキテクチャ",
                "name_en": "Architecture",
                "description_ja": "システム設計・構造の変更、コードリファクタリング、性能改善、テスト戦略、技術的負債解決。",
                "description_en": "System design changes, code refactoring, performance improvements, testing strategies, technical debt resolution.",
                "keywords_ja": [
                    "設計",
                    "アーキテクチャ",
                    "リファクタリング",
                    "構造",
                    "性能",
                    "最適化",
                    "テスト",
                    "技術的負債",
                ],
                "keywords_en": [
                    "design",
                    "architecture",
                    "refactor",
                    "structure",
                    "performance",
                    "optimization",
                    "test",
                    "debt",
                ],
                "indicators": [
                    "design pattern",
                    "code structure",
                    "performance metrics",
                    "test coverage",
                ],
            },
            "learning": {
                "name_ja": "学習・調査",
                "name_en": "Learning & Research",
                "description_ja": "技術調査・研究、新技術学習、実験的実装、プロトタイプ開発、知識共有。",
                "description_en": "Technical research, learning new technologies, experimental implementations, prototype development, knowledge sharing.",
                "keywords_ja": [
                    "調査",
                    "研究",
                    "学習",
                    "実験",
                    "プロトタイプ",
                    "検証",
                    "試す",
                    "勉強",
                ],
                "keywords_en": [
                    "research",
                    "investigate",
                    "study",
                    "learn",
                    "experiment",
                    "prototype",
                    "explore",
                    "poc",
                ],
                "indicators": [
                    "proof of concept",
                    "experiment",
                    "research",
                    "comparison",
                    "evaluation",
                ],
            },
            "troubleshooting": {
                "name_ja": "トラブルシューティング",
                "name_en": "Troubleshooting",
                "description_ja": "使用方法の質問、設定・環境問題、インストール支援、ドキュメント要求、一般的なサポート。",
                "description_en": "Usage questions, configuration/environment issues, installation support, documentation requests, general support.",
                "keywords_ja": [
                    "質問",
                    "ヘルプ",
                    "サポート",
                    "使い方",
                    "設定",
                    "環境",
                    "インストール",
                    "わからない",
                ],
                "keywords_en": [
                    "help",
                    "support",
                    "question",
                    "how to",
                    "setup",
                    "configuration",
                    "installation",
                    "documentation",
                ],
                "indicators": [
                    "how to",
                    "configuration",
                    "environment",
                    "documentation",
                    "tutorial",
                ],
            },
        }

    def detect_language(self, text: str) -> Language:
        """テキストの言語を自動検出"""
        # 日本語文字（ひらがな、カタカナ、漢字）の存在をチェック
        japanese_chars = sum(
            1
            for char in text
            if "\u3040" <= char <= "\u309f"  # ひらがな
            or "\u30a0" <= char <= "\u30ff"  # カタカナ
            or "\u4e00" <= char <= "\u9faf"
        )  # 漢字

        total_chars = len([char for char in text if char.isalpha()])

        if total_chars == 0:
            return Language.ENGLISH  # デフォルト

        japanese_ratio = japanese_chars / total_chars

        if japanese_ratio > 0.1:  # 10%以上日本語文字が含まれている
            return Language.JAPANESE
        else:
            return Language.ENGLISH

    def create_few_shot_examples(self) -> List[FewShotExample]:
        """Few-shot学習用の高品質サンプルデータを作成"""

        examples = [
            # Bug Fix Examples
            FewShotExample(
                issue=Issue(
                    id=1001,
                    title="NullPointerException in UserService.authenticate()",
                    body="When trying to authenticate with a null username, the application crashes with NullPointerException. Stack trace: at UserService.authenticate(UserService.java:45)",
                    labels=["bug"],
                    repository="example/auth-service",
                ),
                expected_category="bug-fix",
                expected_confidence=0.95,
                reasoning="スタックトレースと例外の詳細があり、明確なバグ報告",
                language=Language.ENGLISH,
            ),
            FewShotExample(
                issue=Issue(
                    id=1002,
                    title="ログイン機能でパスワードが正しく検証されない",
                    body="パスワード入力時に特殊文字が含まれていると、正しいパスワードでもログインが失敗します。再現手順：1. 特殊文字(@#$)を含むパスワードでアカウント作成 2. 同じパスワードでログイン試行 3. 認証失敗",
                    labels=["バグ"],
                    repository="example/auth-service",
                ),
                expected_category="bug-fix",
                expected_confidence=0.92,
                reasoning="再現手順が明確で、既存機能の不具合報告",
                language=Language.JAPANESE,
            ),
            # Feature Request Examples
            FewShotExample(
                issue=Issue(
                    id=2001,
                    title="Add dark mode support to the dashboard",
                    body="As a user, I want to be able to switch between light and dark themes so that I can use the application comfortably in different lighting conditions. Acceptance criteria: - Toggle button in settings - Persistent theme preference - All components support dark mode",
                    labels=["enhancement"],
                    repository="example/dashboard",
                ),
                expected_category="feature-request",
                expected_confidence=0.90,
                reasoning="新機能追加の明確な要求とユーザーストーリー形式",
                language=Language.ENGLISH,
            ),
            FewShotExample(
                issue=Issue(
                    id=2002,
                    title="CSVエクスポート機能の追加",
                    body="データ分析のために、現在の検索結果をCSV形式でダウンロードできる機能を追加してほしいです。要件：- 検索結果の全件エクスポート - 日本語ファイル名対応 - プログレス表示",
                    labels=["機能要求"],
                    repository="example/analytics",
                ),
                expected_category="feature-request",
                expected_confidence=0.88,
                reasoning="具体的な要件が記載された新機能追加要求",
                language=Language.JAPANESE,
            ),
            # Architecture Examples
            FewShotExample(
                issue=Issue(
                    id=3001,
                    title="Refactor authentication module for better testability",
                    body="The current authentication module has high coupling and low testability. Proposal: - Extract interfaces for dependency injection - Implement repository pattern for data access - Add comprehensive unit tests - Improve code coverage from 45% to 80%",
                    labels=["refactor", "technical-debt"],
                    repository="example/auth-service",
                ),
                expected_category="architecture",
                expected_confidence=0.93,
                reasoning="コード構造改善とテスト戦略に関する技術的な提案",
                language=Language.ENGLISH,
            ),
            FewShotExample(
                issue=Issue(
                    id=3002,
                    title="データベースクエリの性能改善",
                    body="現在のユーザー検索クエリが遅く、平均応答時間が3秒を超えています。改善案：- インデックスの追加 - N+1問題の解決 - クエリの最適化 - キャッシュ戦略の導入。目標：応答時間500ms以下",
                    labels=["性能改善", "最適化"],
                    repository="example/user-service",
                ),
                expected_category="architecture",
                expected_confidence=0.91,
                reasoning="性能改善と技術的最適化に関する構造的な変更提案",
                language=Language.JAPANESE,
            ),
            # Learning Examples
            FewShotExample(
                issue=Issue(
                    id=4001,
                    title="Research: Comparison of GraphQL vs REST API for our use case",
                    body="We need to evaluate whether GraphQL would be beneficial for our microservices architecture. Research areas: - Performance comparison - Learning curve for team - Client-side benefits - Migration effort estimation. Deliverable: Technical report with recommendation",
                    labels=["research", "investigation"],
                    repository="example/api-gateway",
                ),
                expected_category="learning",
                expected_confidence=0.94,
                reasoning="技術調査と比較研究の明確な目的",
                language=Language.ENGLISH,
            ),
            FewShotExample(
                issue=Issue(
                    id=4002,
                    title="React 18の新機能検証とプロトタイプ作成",
                    body="React 18のConcurrent Featuresを既存プロジェクトに適用できるか検証したい。調査項目：- Suspenseの活用方法 - useTransitionの効果 - 既存コードとの互換性 - 移行コスト。プロトタイプを作成して効果を確認する。",
                    labels=["調査", "プロトタイプ"],
                    repository="example/frontend",
                ),
                expected_category="learning",
                expected_confidence=0.89,
                reasoning="新技術の検証と実験的な実装に関する学習目的",
                language=Language.JAPANESE,
            ),
            # Troubleshooting Examples
            FewShotExample(
                issue=Issue(
                    id=5001,
                    title="How to configure SSL certificates for production deployment?",
                    body="I'm trying to deploy our application to production but having issues with SSL certificate configuration. I've followed the documentation but still getting certificate errors. Can someone provide guidance on: - Certificate generation - Nginx configuration - Testing SSL setup",
                    labels=["question", "help-wanted"],
                    repository="example/deployment",
                ),
                expected_category="troubleshooting",
                expected_confidence=0.92,
                reasoning="設定方法に関する質問とサポート要求",
                language=Language.ENGLISH,
            ),
            FewShotExample(
                issue=Issue(
                    id=5002,
                    title="開発環境のセットアップでエラーが発生",
                    body="READMEに従って開発環境をセットアップしようとしていますが、npm installでエラーが出ます。エラーメッセージ：'python not found'。Python 3.9はインストール済みです。MacOS Monterey使用。解決方法を教えてください。",
                    labels=["質問", "セットアップ"],
                    repository="example/frontend",
                ),
                expected_category="troubleshooting",
                expected_confidence=0.90,
                reasoning="環境設定に関する支援要求と質問",
                language=Language.JAPANESE,
            ),
        ]

        self.few_shot_examples = examples
        logger.info(f"Created {len(examples)} few-shot examples")
        return examples

    def create_enhanced_prompt(self, issue: Issue, use_few_shot: bool = True) -> List[BaseMessage]:
        """拡張されたプロンプトを作成（Few-shot学習対応）"""

        language = self.detect_language(f"{issue.title} {issue.body}")

        # 言語に応じたカテゴリ説明を生成
        categories_desc = []
        for cat_id, cat_info in self.enhanced_categories.items():
            if language == Language.JAPANESE:
                name = cat_info["name_ja"]
                description = cat_info["description_ja"]
                keywords = ", ".join(cat_info["keywords_ja"])
            else:
                name = cat_info["name_en"]
                description = cat_info["description_en"]
                keywords = ", ".join(cat_info["keywords_en"])

            categories_desc.append(
                f"- **{cat_id}** ({name}): {description}\n"
                f"  主要キーワード: {keywords}\n"
                f"  判定指標: {', '.join(cat_info['indicators'])}"
            )

        categories_text = "\n\n".join(categories_desc)

        # システムプロンプトの言語別作成
        if language == Language.JAPANESE:
            system_prompt = f"""あなたはGitHub Issues分類の専門AIエージェントです。高い精度でIssueを適切なカテゴリに分類してください。

## 分類カテゴリ

{categories_text}

## 分類ガイドライン

**精度向上のポイント:**
1. **コンテキスト分析**: タイトル・本文・ラベルを総合的に評価
2. **言語対応**: 日本語・英語の混在テキストに対応
3. **意図理解**: Issue作成者の真の目的を理解
4. **曖昧さ処理**: 不明確な場合は信頼度を適切に下げる

**信頼度評価基準:**
- 0.9-1.0: 明確な分類指標が複数存在
- 0.7-0.9: 適切な指標がある程度存在
- 0.5-0.7: 分類可能だが曖昧な要素あり
- 0.3-0.5: 非常に曖昧、複数カテゴリに該当可能
- 0.0-0.3: 分類困難、情報不足

**出力形式 (JSON):**
```json
{{
  "category": "分類されたカテゴリID",
  "confidence": 0.0から1.0の信頼度,
  "reasoning": "分類根拠の詳細説明（150文字以内）",
  "suggested_tags": ["有用なタグ3-5個"],
  "detected_language": "ja",
  "key_indicators": ["分類の決定要因となった要素"]
}}
```"""
        else:
            system_prompt = f"""You are a specialized AI agent for GitHub Issues classification. Classify issues with high accuracy into appropriate categories.

## Classification Categories

{categories_text}

## Classification Guidelines

**Accuracy Enhancement Points:**
1. **Context Analysis**: Comprehensively evaluate title, body, and labels
2. **Language Support**: Handle mixed Japanese-English text
3. **Intent Understanding**: Understand the true purpose of issue creators
4. **Ambiguity Handling**: Appropriately lower confidence for unclear cases

**Confidence Evaluation Criteria:**
- 0.9-1.0: Multiple clear classification indicators exist
- 0.7-0.9: Adequate indicators present
- 0.5-0.7: Classifiable but with ambiguous elements
- 0.3-0.5: Very ambiguous, potentially fits multiple categories
- 0.0-0.3: Difficult to classify, insufficient information

**Output Format (JSON):**
```json
{{
  "category": "classified_category_id",
  "confidence": 0.0 to 1.0 confidence score,
  "reasoning": "detailed classification rationale (under 150 chars)",
  "suggested_tags": ["3-5 useful tags"],
  "detected_language": "en",
  "key_indicators": ["factors that determined classification"]
}}
```"""

        messages = [SystemMessage(content=system_prompt)]

        # Few-shot例の追加
        if use_few_shot and self.few_shot_examples:
            relevant_examples = [
                ex
                for ex in self.few_shot_examples
                if ex.language == language or ex.language == Language.AUTO
            ][:3]

            for example in relevant_examples:
                example_input = f"""Issue ID: {example.issue.id}
Title: {example.issue.title}
Body: {example.issue.body}
Labels: {", ".join(example.issue.labels) if example.issue.labels else "None"}
Repository: {example.issue.repository or "N/A"}"""

                example_output = f"""```json
{{
  "category": "{example.expected_category}",
  "confidence": {example.expected_confidence},
  "reasoning": "{example.reasoning}",
  "suggested_tags": ["example", "high-quality"],
  "detected_language": "{example.language.value}",
  "key_indicators": ["clear context", "specific details"]
}}
```"""

                messages.extend(
                    [HumanMessage(content=example_input), SystemMessage(content=example_output)]
                )

        # 実際のIssue入力
        issue_input = f"""Issue ID: {issue.id}
Title: {issue.title}
Body: {issue.body}
Labels: {", ".join(issue.labels) if issue.labels else "None"}
Repository: {issue.repository or "N/A"}"""

        messages.append(HumanMessage(content=issue_input))

        return messages

    def parse_enhanced_response(self, response_text: str, issue_id: int) -> ClassificationResult:
        """拡張されたレスポンスを解析"""
        import re

        try:
            # JSONブロックを抽出
            json_match = re.search(r"```json\s*(\{.*?\})\s*```", response_text, re.DOTALL)
            if not json_match:
                json_match = re.search(r"\{.*?\}", response_text, re.DOTALL)

            if not json_match:
                raise ValueError("No JSON found in response")

            json_str = (
                json_match.group(1)
                if json_match.group(0).startswith("```")
                else json_match.group(0)
            )
            response_data = json.loads(json_str)

            # 必須フィールドの検証と拡張
            category = response_data.get("category", "").lower()
            if category not in self.enhanced_categories:
                logger.warning(f"Invalid category '{category}' for issue {issue_id}")
                category = "troubleshooting"

            confidence = max(0.0, min(1.0, float(response_data.get("confidence", 0.0))))
            reasoning = response_data.get("reasoning", "分類理由が取得できませんでした")
            suggested_tags = response_data.get("suggested_tags", [])

            if not isinstance(suggested_tags, list):
                suggested_tags = []

            # 拡張フィールドの追加
            detected_language = response_data.get("detected_language", "auto")
            key_indicators = response_data.get("key_indicators", [])

            result = ClassificationResult(
                issue_id=issue_id,
                category=category,
                confidence=confidence,
                reasoning=reasoning,
                suggested_tags=suggested_tags[:5],
                processing_time_ms=0,
            )

            # 拡張情報をログ記録
            logger.info(
                "Enhanced classification completed",
                issue_id=issue_id,
                category=category,
                confidence=confidence,
                detected_language=detected_language,
                key_indicators=key_indicators,
            )

            return result

        except Exception as e:
            logger.error(f"Failed to parse enhanced response for issue {issue_id}: {e}")
            return ClassificationResult(
                issue_id=issue_id,
                category="troubleshooting",
                confidence=0.0,
                reasoning=f"Enhanced parsing error: {str(e)}",
                suggested_tags=["parse-error"],
                processing_time_ms=0,
            )

    def evaluate_classification_accuracy(
        self, test_cases: List[Tuple[Issue, str]]
    ) -> ClassificationMetrics:
        """分類精度を評価"""
        # 実装は分類サービスと連携して行う
        # ここでは評価フレームワークの構造を定義

        metrics = ClassificationMetrics(
            accuracy=0.0,
            precision_per_category={},
            recall_per_category={},
            f1_score_per_category={},
            average_f1_score=0.0,
            average_response_time_ms=0.0,
            total_classified=len(test_cases),
            timestamp=datetime.now(),
        )

        # TODO: 実際の評価ロジックを実装
        logger.info(
            f"Classification accuracy evaluation completed for {len(test_cases)} test cases"
        )

        return metrics

    def get_optimization_recommendations(self) -> Dict[str, Any]:
        """分類精度向上のための推奨事項を生成"""

        recommendations = {
            "prompt_optimization": {
                "suggestions": [
                    "カテゴリ説明の具体化と例示追加",
                    "Few-shot例の品質向上と多様化",
                    "言語別プロンプトの最適化",
                    "コンテキスト理解の向上",
                ]
            },
            "model_configuration": {
                "temperature": 0.1,  # 一貫性重視
                "max_tokens": 800,  # 詳細な推論のため増加
                "top_p": 0.9,  # 適度な創造性
                "frequency_penalty": 0.0,
            },
            "evaluation_strategy": {
                "test_set_size": 100,
                "cross_validation": True,
                "category_balance": True,
                "performance_targets": {
                    "overall_accuracy": 0.85,
                    "min_f1_per_category": 0.75,
                    "max_response_time_ms": 3000,
                },
            },
        }

        return recommendations


# シングルトンインスタンス
enhanced_topic_model = EnhancedTopicModel()


def get_enhanced_topic_model() -> EnhancedTopicModel:
    """拡張トピックモデルのインスタンスを取得"""
    return enhanced_topic_model
