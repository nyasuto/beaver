# Phase 2: AI分類システム アーキテクチャ設計

## 概要
GitHub Issues自動分類システムの技術基盤アーキテクチャ設計文書

**更新日**: 2025-06-28
**バージョン**: v1.0
**作成者**: Claude Code

---

## 1. Go ↔ Python サービス間通信設計

### 1.1 通信プロトコル
**選択**: HTTP/REST API通信

**理由**:
- シンプルな実装とデバッグの容易さ
- 言語非依存でスケーラビリティ確保
- 既存のHTTPクライアント/サーバー活用可能
- 将来的なマイクロサービス化に対応

### 1.2 通信構成
```
┌─────────────────┐    HTTP/REST    ┌──────────────────┐
│   Go Service    │ ────────────→   │ Python AI Service│
│ (Main Backend)  │                 │ (Classification) │
│                 │ ←────────────   │                  │
└─────────────────┘    JSON         └──────────────────┘
```

### 1.3 データ形式
- **リクエスト/レスポンス**: JSON
- **文字エンコーディング**: UTF-8
- **Content-Type**: `application/json`

### 1.4 認証・セキュリティ
- **内部API**: API Key認証
- **HTTPS**: 本番環境で必須
- **レート制限**: GoサービスでPythonサービスへの呼び出し制御

---

## 2. REST API エンドポイント設計

### 2.1 Python AI Service エンドポイント

#### `/classify` - 単一Issue分類
```http
POST /classify
Content-Type: application/json

{
  "issue": {
    "id": 123,
    "title": "テストカバレッジ改善",
    "body": "プロジェクトのテスト...",
    "labels": ["enhancement", "testing"]
  },
  "config": {
    "confidence_threshold": 0.7,
    "model": "gpt-3.5-turbo"
  }
}

Response:
{
  "category": "architecture",
  "confidence": 0.85,
  "reasoning": "テスト戦略とコード品質改善に関する設計課題",
  "suggested_tags": ["testing", "coverage", "quality"],
  "processing_time_ms": 1250
}
```

#### `/batch-classify` - バッチ分類
```http
POST /batch-classify
Content-Type: application/json

{
  "issues": [
    {"id": 123, "title": "...", "body": "..."},
    {"id": 124, "title": "...", "body": "..."}
  ],
  "config": {
    "confidence_threshold": 0.7,
    "parallel_processing": true
  }
}

Response:
{
  "results": [
    {"issue_id": 123, "category": "architecture", "confidence": 0.85},
    {"issue_id": 124, "category": "bug-fix", "confidence": 0.92}
  ],
  "summary": {
    "total_processed": 2,
    "successful": 2,
    "failed": 0,
    "average_confidence": 0.885,
    "processing_time_ms": 2100
  }
}
```

#### `/health` - ヘルスチェック
```http
GET /health

Response:
{
  "status": "healthy",
  "model_loaded": true,
  "api_accessible": true,
  "memory_usage_mb": 256,
  "uptime_seconds": 3600
}
```

### 2.2 Go Service内部API設計

#### Go内分類制御フロー
```go
type ClassificationService struct {
    pythonClient *http.Client
    ruleEngine   *RuleEngine
    config       *ClassificationConfig
}

func (s *ClassificationService) ClassifyIssue(issue *models.Issue) (*ClassificationResult, error) {
    // 1. Python AIサービス呼び出し
    aiResult, err := s.callPythonClassifier(issue)
    if err != nil {
        return nil, fmt.Errorf("AI classification failed: %w", err)
    }
    
    // 2. Go ルールエンジン適用
    ruleResult := s.ruleEngine.Classify(issue)
    
    // 3. ハイブリッド統合
    finalResult := s.combineResults(aiResult, ruleResult)
    
    return finalResult, nil
}
```

---

## 3. 分類カテゴリ仕様確定

### 3.1 基本5カテゴリ定義

| カテゴリ | 英語名 | 説明 | キーワード例 |
|---------|--------|------|------------|
| **バグ修正** | `bug-fix` | バグ報告・修正関連 | bug, error, crash, fix, broken |
| **機能要求** | `feature-request` | 新機能・改善要求 | feature, enhancement, add, improve |
| **アーキテクチャ** | `architecture` | システム設計・構造 | design, architecture, refactor, structure |
| **学習・調査** | `learning` | 学習・調査・研究 | research, investigate, study, learn |
| **トラブルシューティング** | `troubleshooting` | 問題解決・サポート | help, support, troubleshoot, question |

### 3.2 カテゴリ判定基準

#### `bug-fix`
- エラー・例外の報告
- 動作不良の修正
- 予期しない動作の解決

#### `feature-request`
- 新機能の提案・要求
- 既存機能の改善・拡張
- UX/UI改善提案

#### `architecture`
- システム設計の変更
- コードリファクタリング
- 性能改善・最適化
- テスト戦略・コード品質

#### `learning`
- 技術調査・研究
- 学習用Issue・実験
- プロトタイプ開発

#### `troubleshooting`
- 使い方の質問
- 設定・環境問題
- サポート要求

### 3.3 拡張性設計
```go
type CategoryDefinition struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    Description string   `json:"description"`
    Keywords    []string `json:"keywords"`
    Priority    int      `json:"priority"`
    Active      bool     `json:"active"`
}

type CategoryManager struct {
    categories map[string]*CategoryDefinition
    config     *CategoryConfig
}

// 動的カテゴリ追加対応
func (cm *CategoryManager) AddCategory(category *CategoryDefinition) error
func (cm *CategoryManager) UpdateCategory(id string, category *CategoryDefinition) error
func (cm *CategoryManager) RemoveCategory(id string) error
```

---

## 4. データフロー設計

### 4.1 全体フロー
```
1. Issue取得 (GitHub API)
     ↓
2. 前処理 (テキスト正規化)
     ↓
3. AI分類 (Python Service)
     ↓
4. ルール分類 (Go Rule Engine)
     ↓
5. ハイブリッド統合
     ↓
6. 信頼度評価
     ↓
7. タグ生成
     ↓
8. Wiki統合
     ↓
9. 結果保存・出力
```

### 4.2 データ構造定義

#### Go側データ構造
```go
// 入力Issue
type Issue struct {
    ID          int       `json:"id"`
    Number      int       `json:"number"`
    Title       string    `json:"title"`
    Body        string    `json:"body"`
    Labels      []Label   `json:"labels"`
    State       string    `json:"state"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    Repository  string    `json:"repository"`
}

// 分類結果
type ClassificationResult struct {
    IssueID         int               `json:"issue_id"`
    Category        string            `json:"category"`
    Confidence      float64           `json:"confidence"`
    Source          string            `json:"source"` // "ai", "rule", "hybrid"
    Reasoning       string            `json:"reasoning"`
    SuggestedTags   []string          `json:"suggested_tags"`
    AIResult        *AIResult         `json:"ai_result,omitempty"`
    RuleResult      *RuleResult       `json:"rule_result,omitempty"`
    ProcessingTime  time.Duration     `json:"processing_time"`
    Timestamp       time.Time         `json:"timestamp"`
}

// AI分類結果
type AIResult struct {
    Category         string    `json:"category"`
    Confidence       float64   `json:"confidence"`
    Reasoning        string    `json:"reasoning"`
    SuggestedTags    []string  `json:"suggested_tags"`
    ModelUsed        string    `json:"model_used"`
    ProcessingTimeMS int       `json:"processing_time_ms"`
}

// ルール分類結果
type RuleResult struct {
    Category        string            `json:"category"`
    Confidence      float64           `json:"confidence"`
    MatchedRules    []string          `json:"matched_rules"`
    Keywords        []string          `json:"keywords"`
    Score           float64           `json:"score"`
}
```

### 4.3 エラーハンドリング戦略

#### エラー分類
1. **一時的エラー** (リトライ可能)
   - ネットワーク接続エラー
   - API制限エラー
   - タイムアウト

2. **永続的エラー** (リトライ不可)
   - 認証エラー
   - 不正なリクエスト形式
   - サポートされていないコンテンツ

#### 回復戦略
```go
type RetryPolicy struct {
    MaxRetries      int           `json:"max_retries"`
    BackoffStrategy string        `json:"backoff_strategy"` // "exponential", "linear", "fixed"
    InitialDelay    time.Duration `json:"initial_delay"`
    MaxDelay        time.Duration `json:"max_delay"`
}

type FallbackStrategy struct {
    UseRuleOnly     bool    `json:"use_rule_only"`
    DefaultCategory string  `json:"default_category"`
    MinConfidence   float64 `json:"min_confidence"`
}
```

---

## 5. 性能要件定義

### 5.1 レスポンス時間
- **単一Issue分類**: < 5秒
- **バッチ分類(10件)**: < 30秒
- **バッチ分類(100件)**: < 300秒

### 5.2 スループット
- **同時処理**: 最大10並列分類
- **1日あたり**: 10,000件分類対応

### 5.3 可用性
- **稼働率**: 99.0% (開発環境)
- **復旧時間**: < 5分

### 5.4 メモリ使用量
- **Go Service**: < 500MB
- **Python Service**: < 1GB

---

## 6. データ永続化戦略

### 6.1 保存対象データ
1. **分類履歴**
   - Issue情報
   - 分類結果
   - 信頼度スコア
   - 処理時間

2. **学習データ**
   - フィードバック修正
   - ユーザー評価
   - 精度統計

### 6.2 ストレージ選択
- **軽量**: SQLite (開発・小規模)
- **本格**: PostgreSQL (本番・大規模)
- **設定**: 環境変数で切り替え可能

### 6.3 データ構造
```sql
-- 分類履歴テーブル
CREATE TABLE classification_history (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    repository VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    source VARCHAR(20) NOT NULL,
    reasoning TEXT,
    suggested_tags TEXT[], -- PostgreSQL array
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- フィードバックテーブル  
CREATE TABLE classification_feedback (
    id SERIAL PRIMARY KEY,
    classification_id INTEGER REFERENCES classification_history(id),
    original_category VARCHAR(50),
    corrected_category VARCHAR(50),
    user_id VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. 実装優先順位

### Phase 2.1 (基盤実装) - 4週間
1. **Week 1**: Go-Python通信基盤
2. **Week 2**: Python AI分類エンジン
3. **Week 3**: Go ルールエンジン
4. **Week 4**: ハイブリッド統合・テスト

### Phase 2.2 (統合機能) - 4週間
1. **Week 5-6**: 信頼度計算・タグ生成
2. **Week 7**: Wiki統合
3. **Week 8**: CLI実装・最適化

### Phase 2.3 (評価改善) - 2週間
1. **Week 9**: 精度評価システム
2. **Week 10**: フィードバック学習

---

## 8. 技術選定

### 8.1 Python AI Service
- **Framework**: FastAPI
- **AI Library**: LangChain + OpenAI SDK
- **Model**: GPT-3.5-turbo (初期), GPT-4 (最適化後)

### 8.2 Go Backend
- **HTTP Client**: 標準 `net/http`
- **JSON処理**: 標準 `encoding/json`
- **設定管理**: Viper
- **ログ**: 既存logger活用

### 8.3 開発・テスト
- **API Testing**: Postman/curl
- **Unit Testing**: Go標準testing + Python pytest
- **Integration Testing**: Docker Compose

---

## 9. 次のステップ

1. ✅ **基盤設計完了** (この文書)
2. 🔄 **Python AI Service実装** (Issue #134)
3. 🔄 **トピックモデル作成** (Issue #135)  
4. 🔄 **Go ルールエンジン実装** (Issue #136)

**設計レビュー完了後、実装フェーズに移行**