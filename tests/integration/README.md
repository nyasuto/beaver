# Beaver Integration Tests

## 概要

このディレクトリには、Beaverの実際のGitHub Wiki機能をテストする統合テストが含まれています。これらのテストは実際のGitHub APIとWikiリポジトリを使用してエンドツーエンドの機能検証を行います。

## 前提条件

### 1. GitHub Personal Access Token

GitHubのPersonal Access Tokenが必要です：

1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. "Generate new token (classic)"をクリック
3. 以下のスコープを選択：
   - `repo` (プライベートリポジトリアクセス用)
   - `public_repo` (パブリックリポジトリアクセス用)
   - `user:email` (ユーザー情報取得用)

### 2. テスト用リポジトリ

統合テストには専用のテストリポジトリを使用することを強く推奨します：

1. GitHub上で新しいリポジトリを作成
2. Wikiを有効化（Settings > Features > Wikis）
3. 適切な権限設定（トークンのスコープに対応）

## セットアップ

### 環境変数の設定

```bash
# 必須: 統合テストを有効化
export BEAVER_INTEGRATION_TESTS=true

# 必須: GitHub認証
export GITHUB_TOKEN="your_github_token_here"

# 必須: テスト用リポジトリ情報
export BEAVER_TEST_REPO_OWNER="your_github_username"
export BEAVER_TEST_REPO_NAME="beaver-integration-test"
```

### 環境変数設定スクリプト（推奨）

`.env.integration`ファイルを作成：

```bash
# .env.integration
BEAVER_INTEGRATION_TESTS=true
GITHUB_TOKEN=your_token_here
BEAVER_TEST_REPO_OWNER=your_username
BEAVER_TEST_REPO_NAME=beaver-integration-test
```

使用方法：
```bash
source .env.integration
```

## テストの実行

### 全統合テストの実行

```bash
# プロジェクトルートから
go test -v ./tests/integration/...
```

### 個別テストの実行

```bash
# 完全ワークフローテスト
go test -v ./tests/integration -run TestFullWorkflowIntegration

# エラーシナリオテスト
go test -v ./tests/integration -run TestErrorScenarios

# 日本語コンテンツテスト
go test -v ./tests/integration -run TestJapaneseContent

# パフォーマンステスト
go test -v ./tests/integration -run TestPerformanceScenarios

# 設定統合テスト
go test -v ./tests/integration -run TestConfigurationIntegration
```

### CI/CD環境での実行

```bash
# タイムアウト設定（大きなコンテンツテスト用）
go test -v -timeout 10m ./tests/integration/...

# カバレッジ付き実行
go test -v -cover ./tests/integration/...
```

## テスト内容

### 1. `TestFullWorkflowIntegration`
- GitHub API接続テスト
- Issuesの取得
- Wiki生成とPublishing
- コンテンツ検証

### 2. `TestErrorScenarios`
- 無効なGitHubトークン
- 存在しないリポジトリ
- 権限不足エラー

### 3. `TestJapaneseContent`
- 日本語コンテンツの生成
- 多言語混合コンテンツ
- UTF-8エンコーディング検証

### 4. `TestPerformanceScenarios`
- 大容量コンテンツの処理
- Publishing性能測定
- メモリ使用量の監視

### 5. `TestConfigurationIntegration`
- 設定ファイルの読み込み
- 設定値の検証
- 環境変数との統合

## 期待される結果

### 成功時
- 全テストがPASSする
- GitHub Wikiにテストページが作成される
- コンソールに詳細なログが出力される

### テスト後の確認

テスト実行後、以下のURLでWikiページを確認できます：
```
https://github.com/{BEAVER_TEST_REPO_OWNER}/{BEAVER_TEST_REPO_NAME}/wiki
```

## トラブルシューティング

### よくある問題

#### 1. `BEAVER_INTEGRATION_TESTS not set`
```bash
export BEAVER_INTEGRATION_TESTS=true
```

#### 2. `GITHUB_TOKEN not set`
```bash
export GITHUB_TOKEN="your_token_here"
```

#### 3. `TestConnection failed`
- トークンの有効性を確認
- ネットワーク接続を確認
- GitHub APIの制限を確認

#### 4. `Wiki publishing failed`
- リポジトリのWiki機能が有効か確認
- トークンに適切な権限があるか確認
- リポジトリ名とオーナー名を確認

#### 5. `Permission denied`
- トークンのスコープを確認（`repo`または`public_repo`）
- リポジトリへの書き込み権限を確認

### デバッグモード

詳細なログを表示：
```bash
export BEAVER_DEBUG=true
go test -v ./tests/integration/...
```

## 安全性について

### テスト環境の分離
- 本番リポジトリは使用しない
- 専用のテストリポジトリを作成
- テスト用のGitHubアカウントの使用を推奨

### トークンの管理
- トークンをGitにコミットしない
- 環境変数またはシークレット管理ツールを使用
- 最小限の権限のみを付与

### クリーンアップ
- テスト後は自動的にクリーンアップされる
- 手動クリーンアップが必要な場合はWikiページを削除

## CI/CD統合

### GitHub Actions例

```yaml
name: Integration Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Go
      uses: actions/setup-go@v3
      with:
        go-version: 1.21
    - name: Run Integration Tests
      env:
        BEAVER_INTEGRATION_TESTS: true
        GITHUB_TOKEN: ${{ secrets.INTEGRATION_GITHUB_TOKEN }}
        BEAVER_TEST_REPO_OWNER: ${{ secrets.TEST_REPO_OWNER }}
        BEAVER_TEST_REPO_NAME: ${{ secrets.TEST_REPO_NAME }}
      run: go test -v -timeout 10m ./tests/integration/...
```

## サポート

問題が発生した場合：

1. このREADMEの内容を再確認
2. 環境変数の設定を確認
3. GitHubトークンの権限を確認
4. [Issue](https://github.com/nyasuto/beaver/issues)を作成