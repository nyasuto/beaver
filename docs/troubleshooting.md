# 🛠️ Beaver トラブルシューティングガイド

> Git clone方式でのWiki公開における一般的な問題と解決方法

## 🎯 概要

このガイドでは、BeaverでGitHub Wikiを使用する際によく発生する問題とその解決方法を説明します。Git clone方式特有の問題も含めて包括的にカバーしています。

## 🚨 緊急時クイックフィックス

### **Beaverが動かない場合の3ステップ診断**
```bash
# 1. 設定確認
beaver status

# 2. Token確認
echo $GITHUB_TOKEN | head -c 10

# 3. Wiki存在確認
curl -I https://github.com/your-username/your-repo/wiki
```

## 📋 よくある問題と解決方法

### **🔴 レベル1: 設定・認証エラー**

#### **問題1**: `Configuration file not found`
```
❌ エラー: 設定ファイルが見つかりません
```

**原因**: `beaver.yml`が存在しない
**解決**:
```bash
# 設定ファイル初期化
beaver init

# 必要項目編集
vi beaver.yml
```

**確認項目**:
- プロジェクトルートにいるか
- `beaver.yml`のパーミッション

#### **問題2**: `GitHub token が設定されていません`
```
❌ エラー: GITHUB_TOKEN 環境変数または設定ファイルで指定してください
```

**原因**: Personal Access Tokenが設定されていない
**解決**:
```bash
# 環境変数設定
export GITHUB_TOKEN="ghp_your_token_here"

# 確認
echo $GITHUB_TOKEN
```

**詳細**: [GitHub Token設定ガイド](github-token-guide.md)

#### **問題3**: `project.repository は必須設定です`
```
❌ エラー: リポジトリ設定が無効です
```

**原因**: `beaver.yml`のリポジトリ設定が間違っている
**解決**:
```yaml
# beaver.yml
project:
  repository: "your-username/your-repo"  # 正しい形式
```

**正しい形式**:
- `owner/repository`
- 例: `nyasuto/beaver`

### **🟡 レベル2: GitHub API・権限エラー**

#### **問題4**: `401 Bad credentials`
```
❌ エラー: GET https://api.github.com/repos/owner/repo: 401 Bad credentials
```

**原因**: 
- Tokenが無効または期限切れ
- Token権限不足

**解決**:
```bash
# 1. Token有効性確認
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 2. 新しいToken生成（必要な場合）
# GitHub Settings → Developer settings → Personal access tokens
```

**必要な権限**: `repo`, `read:org`

#### **問題5**: `403 Resource not accessible by integration`
```
❌ エラー: 403 Resource not accessible by integration
```

**原因**: Token権限不足またはリポジトリアクセス権限なし
**解決**:
```bash
# リポジトリアクセス確認
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-username/your-repo
```

**チェック項目**:
- Tokenに`repo`権限があるか
- リポジトリが存在するか
- リポジトリアクセス権限があるか

#### **問題6**: `Rate limit exceeded`
```
❌ エラー: API rate limit exceeded
```

**原因**: GitHub API制限に到達（5,000 requests/hour）
**解決**:
```bash
# 制限状況確認
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# 待機またはToken追加
```

**回避策**:
- 処理頻度を下げる
- 複数のTokenを使用（要注意）

### **🔴 レベル3: Wiki関連エラー**

#### **問題7**: `Wiki repository not found (404)`
```
❌ エラー: git clone https://github.com/owner/repo.wiki.git: 404
```

**原因**: Wikiが初期化されていない
**解決**:
```bash
# GitHub Web UIでWiki初期化
# 1. https://github.com/owner/repo/wiki にアクセス
# 2. "Create the first page" をクリック
# 3. 適当な内容でページ作成
```

**詳細**: [Wiki Setup Guide](wiki-setup.md)

#### **問題8**: `Git clone failed`
```
❌ エラー: unable to access wiki repository
```

**原因**: 
- Wiki URL が間違っている
- 認証エラー
- ネットワーク問題

**解決**:
```bash
# 1. URL確認
echo "https://github.com/$REPO.wiki.git"

# 2. 手動cloneテスト
git clone https://x-access-token:$GITHUB_TOKEN@github.com/owner/repo.wiki.git

# 3. ネットワーク確認
ping github.com
```

#### **問題9**: `Wiki push failed - conflict`
```
❌ エラー: conflict detected during wiki update
```

**原因**: Wiki内容の競合（複数ユーザーの同時更新）
**解決**:
```bash
# Beaverの競合解決を有効化（自動で実行される）
beaver build --force-rebuild

# 手動解決の場合
# 1. Wikiリポジトリを確認
# 2. 競合箇所を特定
# 3. 手動マージ
```

**予防策**:
- Wiki手動編集を避ける
- Beaverによる自動更新を推奨

### **🟡 レベル4: ファイル・権限エラー**

#### **問題10**: `Permission denied`
```
❌ エラー: permission denied creating temporary directory
```

**原因**: ファイルシステム権限不足
**解決**:
```bash
# 権限確認
ls -la /tmp

# Beaverディレクトリ権限確認
ls -la ~/.beaver

# 必要に応じて権限修正
chmod 755 ~/.beaver
```

#### **問題11**: `Disk space insufficient`
```
❌ エラー: no space left on device
```

**原因**: ディスク容量不足
**解決**:
```bash
# 容量確認
df -h

# 一時ファイル削除
rm -rf /tmp/beaver-*

# ログ削除
rm -rf ~/.beaver/logs/*
```

### **🔴 レベル5: 設定・環境エラー**

#### **問題12**: `無効なタイムゾーン: Invalid/Timezone`
```
❌ エラー: timezone configuration invalid
```

**原因**: `beaver.yml`のタイムゾーン設定が間違っている
**解決**:
```yaml
# beaver.yml
timezone:
  location: "Asia/Tokyo"  # 有効なタイムゾーン
  format: "2006-01-02 15:04:05 JST"
```

**有効なタイムゾーン例**:
- `UTC`
- `Asia/Tokyo`
- `America/New_York`
- `Europe/London`

#### **問題13**: `AI service connection failed`
```
❌ エラー: failed to connect to AI service
```

**原因**: AI処理サービスが起動していない
**解決**:
```bash
# AI機能無効化（一時的解決）
# beaver.yml
ai:
  features:
    summarization: false
    categorization: false
    troubleshooting: false
```

## 🔧 デバッグツール

### **詳細ログ有効化**
```bash
# 環境変数設定
export BEAVER_DEBUG=true

# ログレベル設定
export BEAVER_LOG_LEVEL=debug

# 実行
beaver build
```

### **設定確認コマンド**
```bash
# 完全な設定確認
beaver status --verbose

# Token確認（セキュリティに注意）
beaver status --check-auth

# API制限確認
beaver status --rate-limit
```

### **手動テストコマンド**
```bash
# GitHub API直接テスト
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/repo/issues

# Wiki clone テスト
git clone https://x-access-token:$GITHUB_TOKEN@github.com/owner/repo.wiki.git /tmp/test-wiki

# 設定ファイル構文チェック
beaver init --validate-only
```

## 🚀 パフォーマンス最適化

### **処理速度改善**
```yaml
# beaver.yml - パフォーマンス設定
sources:
  github:
    max_issues: 50      # 処理するIssue数制限
    include_closed_issues: false  # クローズ済みIssue除外

processing:
  ai_enhancement: false  # AI処理無効化（高速化）
  batch_size: 10        # バッチサイズ調整
```

### **ネットワーク最適化**
```bash
# Git設定最適化
git config --global http.postBuffer 524288000
git config --global http.maxRequestBuffer 100M
```

## 📊 問題の早期発見

### **ヘルスチェックスクリプト**
```bash
#!/bin/bash
# health-check.sh

echo "🏥 Beaver ヘルスチェック"

# 1. 設定ファイル確認
if [ -f "beaver.yml" ]; then
  echo "✅ beaver.yml 存在"
else
  echo "❌ beaver.yml 不存在"
fi

# 2. Token確認
if [ -n "$GITHUB_TOKEN" ]; then
  echo "✅ GITHUB_TOKEN 設定済み"
else
  echo "❌ GITHUB_TOKEN 未設定"
fi

# 3. GitHub接続確認
if curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user > /dev/null; then
  echo "✅ GitHub API接続成功"
else
  echo "❌ GitHub API接続失敗"
fi

# 4. Wiki存在確認
REPO=$(grep "repository:" beaver.yml | cut -d'"' -f2)
if curl -s -I "https://github.com/$REPO/wiki" | grep -q "200 OK"; then
  echo "✅ Wiki存在確認"
else
  echo "❌ Wiki未初期化"
fi
```

## 📞 サポート

### **問題報告時の情報**
```bash
# 以下の情報を含めてIssue報告してください

# 1. 環境情報
beaver --version
go version
git --version
uname -a

# 2. 設定情報（センシティブ情報は除く）
cat beaver.yml | sed 's/token.*/token: [REDACTED]/'

# 3. エラーログ
BEAVER_DEBUG=true beaver build 2>&1 | tail -50
```

### **GitHub Issues**
問題報告: [https://github.com/nyasuto/beaver/issues](https://github.com/nyasuto/beaver/issues)

**報告テンプレート**:
```markdown
## 問題の概要
[簡潔な問題説明]

## 再現手順
1. 
2. 
3. 

## 期待される動作
[期待していた結果]

## 実際の動作
[実際に起こった結果]

## 環境
- OS: 
- Beaver version: 
- Go version: 

## 追加情報
[ログ、設定ファイル等]
```

## 🎓 予防策

### **定期メンテナンス**
```bash
# 週次実行推奨
#!/bin/bash
# maintenance.sh

# 1. Token有効性確認
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 2. 設定ファイル検証
beaver init --validate-only

# 3. 一時ファイル清理
rm -rf /tmp/beaver-*

# 4. ログローテーション
find ~/.beaver/logs -name "*.log" -mtime +7 -delete
```

### **ベストプラクティス**
1. **Token定期更新** (90日毎)
2. **設定ファイルバックアップ**
3. **定期的なhealth check**
4. **Beaver version update**
5. **Wiki手動編集回避**

---

**🛠️ トラブルがあってもこのガイドで解決！安心してBeaverを使用してください。**