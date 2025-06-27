# Beaver Integration Testing Guide

## 概要

このガイドでは、Beaverの統合テスト（Integration Tests）の設定と実行について説明します。統合テストは実際のGitHub APIとWikiリポジトリを使用して、エンドツーエンドの機能検証を行います。

## 🎯 テストの目的

### 1. **機能検証**
- 実際のGitHub環境での動作確認
- CLI コマンドのワークフローテスト
- エラーハンドリングの検証

### 2. **品質保証**
- 本番環境での動作保証
- 回帰テストの実行
- パフォーマンス検証

### 3. **CI/CD統合**
- 自動化されたテスト実行
- プルリクエストでの検証
- リリース前の最終確認

## 🏗️ テスト構成

### テストファイル構造
```
tests/integration/
├── README.md                    # 統合テストの説明
├── wiki_integration_test.go     # GitHub Wiki機能テスト
└── cli_workflow_test.go         # CLI ワークフローテスト

scripts/
└── run-integration-tests.sh     # 統合テスト実行スクリプト

.github/workflows/
└── integration-tests.yml        # GitHub Actions CI/CD設定
```

### テスト種類

1. **`TestFullWorkflowIntegration`**
   - GitHub API接続
   - Issues取得
   - Wiki生成・公開
   - コンテンツ検証

2. **`TestCLIWorkflowIntegration`**
   - CLI コマンド実行
   - 設定ファイル処理
   - ファイル入出力

3. **`TestErrorScenarios`**
   - 無効認証情報
   - 存在しないリポジトリ
   - 権限エラー

4. **`TestJapaneseContent`**
   - 日本語コンテンツ処理
   - UTF-8エンコーディング
   - 多言語混合コンテンツ

5. **`TestPerformanceScenarios`**
   - 大容量データ処理
   - 処理時間測定
   - メモリ使用量監視

## 🔧 セットアップ

### 1. 前提条件

#### GitHub Personal Access Token
```bash
# GitHubでPersonal Access Tokenを作成
# https://github.com/settings/tokens
# 必要なスコープ: repo, public_repo, user:email
```

#### テスト用リポジトリ
```bash
# 専用のテストリポジトリを作成することを推奨
# 例: beaver-integration-test
# Wikiを有効化する必要があります
```

### 2. 環境変数設定

#### 手動設定
```bash
export BEAVER_INTEGRATION_TESTS=true
export GITHUB_TOKEN="your_github_token_here"
export BEAVER_TEST_REPO_OWNER="your_github_username"
export BEAVER_TEST_REPO_NAME="beaver-integration-test"
```

#### 設定ファイル使用（推奨）
```bash
# セットアップスクリプトを実行
./scripts/run-integration-tests.sh --setup

# または手動で .env.integration を作成
cat > .env.integration << EOF
export BEAVER_INTEGRATION_TESTS=true
export GITHUB_TOKEN="your_token_here"
export BEAVER_TEST_REPO_OWNER="your_username"
export BEAVER_TEST_REPO_NAME="beaver-integration-test"
EOF

# 環境変数をロード
source .env.integration
```

## 🚀 実行方法

### 1. Makefileを使用（推奨）

```bash
# 環境設定
make test-integration-setup

# 統合テスト実行
make test-integration

# クイックテスト（パフォーマンステスト除く）
make test-integration-quick
```

### 2. スクリプトを直接使用

```bash
# 環境チェック
./scripts/run-integration-tests.sh --check

# 全テスト実行
./scripts/run-integration-tests.sh --run

# クイックテスト
./scripts/run-integration-tests.sh --quick --run

# 全テスト（パフォーマンス含む）
./scripts/run-integration-tests.sh --all --run

# ドライラン（実行内容確認）
./scripts/run-integration-tests.sh --dry-run --run
```

### 3. Goコマンド直接実行

```bash
# 全統合テスト
go test -v -timeout 10m ./tests/integration/...

# 特定テスト
go test -v ./tests/integration/ -run TestFullWorkflowIntegration

# パフォーマンステスト
go test -v -timeout 15m ./tests/integration/ -run TestPerformanceScenarios
```

## 🤖 CI/CD統合

### GitHub Actions

プロジェクトには `.github/workflows/integration-tests.yml` が含まれており、以下のタイミングで自動実行されます：

#### 自動実行条件
- `main` ブランチへのpush
- `run-integration-tests` ラベル付きのPR
- 手動実行（workflow_dispatch）

#### 必要なSecrets設定
GitHub リポジトリの Settings > Secrets で以下を設定：

```bash
INTEGRATION_GITHUB_TOKEN     # GitHub Personal Access Token
BEAVER_TEST_REPO_OWNER      # テストリポジトリのオーナー
BEAVER_TEST_REPO_NAME       # テストリポジトリ名
```

#### 実行例
```yaml
# プルリクエストで統合テストを実行
# PRに 'run-integration-tests' ラベルを追加

# 手動実行
# GitHub > Actions > Integration Tests > Run workflow
```

### 他のCI/CDシステム

#### Jenkins例
```groovy
pipeline {
    agent any
    environment {
        BEAVER_INTEGRATION_TESTS = 'true'
        GITHUB_TOKEN = credentials('github-token')
        BEAVER_TEST_REPO_OWNER = 'your-username'
        BEAVER_TEST_REPO_NAME = 'beaver-integration-test'
    }
    stages {
        stage('Integration Tests') {
            steps {
                sh './scripts/run-integration-tests.sh --check'
                sh './scripts/run-integration-tests.sh --quick --run'
            }
        }
    }
}
```

#### GitLab CI例
```yaml
integration_tests:
  stage: test
  image: golang:1.21
  variables:
    BEAVER_INTEGRATION_TESTS: "true"
  script:
    - ./scripts/run-integration-tests.sh --check
    - ./scripts/run-integration-tests.sh --quick --run
  only:
    - main
    - merge_requests
```

## 📊 テスト結果の確認

### 成功時の出力例
```
🧪 Running Beaver integration tests...
✅ GitHub API connection verified
✅ Fetched 5 issues from owner/repo
✅ Wiki publisher initialized for owner/repo
✅ Successfully published 3 wiki pages
🌐 Wiki published at: https://github.com/owner/repo/wiki
✅ Integration test completed successfully
```

### 生成されるアーティファクト
- **GitHub Wiki**: テストページが実際に公開される
- **ログファイル**: 詳細な実行ログ
- **カバレッジレポート**: テストカバレッジ情報
- **パフォーマンスデータ**: 処理時間とメモリ使用量

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 認証エラー
```bash
Error: authentication failed
```
**解決策:**
- GitHub Personal Access Tokenの有効性を確認
- 適切なスコープ（repo, public_repo）が設定されているか確認
- トークンの有効期限を確認

#### 2. リポジトリアクセスエラー
```bash
Error: repository not found or access denied
```
**解決策:**
- リポジトリ名とオーナー名を確認
- リポジトリのWiki機能が有効か確認
- リポジトリへの書き込み権限があるか確認

#### 3. Wiki公開エラー
```bash
Error: failed to publish wiki pages
```
**解決策:**
- Wikiが初期化されているか確認
- Git設定（user.name, user.email）を確認
- ネットワーク接続を確認

#### 4. テストタイムアウト
```bash
Error: test timeout exceeded
```
**解決策:**
- ネットワーク速度を確認
- GitHub API レート制限を確認
- テストデータサイズを削減

### デバッグモード

詳細なログを有効にする：
```bash
export BEAVER_DEBUG=true
./scripts/run-integration-tests.sh --verbose --run
```

### ログ確認

```bash
# 統合テストログ
cat integration-test.log

# Gitオペレーションログ
export GIT_TRACE=1
```

## 🛡️ セキュリティ考慮事項

### テスト環境の分離
- 本番データは使用しない
- 専用のテストアカウント・リポジトリを使用
- テスト後の自動クリーンアップ

### 機密情報の保護
- GitHub TokenをGitにコミットしない
- 環境変数またはSecrets管理を使用
- 最小権限の原則を適用

### アクセス制御
- テスト用Tokenの権限を制限
- 定期的なToken rotation
- アクセスログの監視

## 📈 パフォーマンス監視

### メトリクス収集
- 処理時間測定
- メモリ使用量監視
- API呼び出し回数追跡

### 回帰テスト
- 前回の結果との比較
- パフォーマンス閾値の設定
- CI/CDでの自動警告

### 最適化指標
- Wiki公開時間: < 30秒
- メモリ使用量: < 100MB
- API呼び出し効率: 適切なバッチング

## 🔄 継続的改善

### テストカバレッジの向上
- 新機能のテストケース追加
- エッジケースの網羅
- エラーシナリオの拡充

### 自動化の拡張
- より多くのCI/CDシステムとの統合
- 並列テスト実行
- 依存関係の自動管理

### 監視とアラート
- テスト失敗の早期検出
- パフォーマンス劣化の監視
- 障害時の自動通知

## 📚 参考資料

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Go Testing Package](https://pkg.go.dev/testing)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Beaver Project Documentation](../README.md)

## 💬 サポート

問題やご質問がある場合：

1. [Issue を作成](https://github.com/nyasuto/beaver/issues)
2. 統合テストのREADMEを再確認
3. デバッグモードで詳細ログを確認
4. 環境設定を再確認

**Happy Testing! 🧪🦫**