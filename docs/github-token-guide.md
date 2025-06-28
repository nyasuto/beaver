# 🔑 GitHub Personal Access Token設定ガイド

> Beaver用GitHub API認証のためのPersonal Access Token作成・管理ガイド

## 🎯 概要

BeaverはGitHub APIを使用してIssuesの取得とWikiの更新を行うため、適切な権限を持つPersonal Access Token (PAT)が必要です。このガイドでは、セキュアで最小権限のTokenを作成する方法を説明します。

## ⚡ クイックスタート

### **即座に始めたい方向け**

1. [GitHub Token作成ページ](https://github.com/settings/tokens/new)にアクセス
2. **Scopes**: `repo` と `read:org` を選択
3. **Expiration**: `90 days` を選択
4. **Generate token** をクリック
5. 生成されたTokenを `GITHUB_TOKEN` 環境変数に設定

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

## 📋 詳細な設定手順

### **ステップ1: GitHub Settingsにアクセス**

1. **GitHubにログイン**
2. 右上のアバター → **Settings**
3. 左サイドバー → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**

> 💡 **Fine-grained tokensとClassic tokensの違い**: 現在Beaverは**Classic tokens**を推奨

### **ステップ2: 新しいToken作成**

1. **「Generate new token」** → **「Generate new token (classic)」**
2. **Authentication**が要求される場合はパスワード入力

### **ステップ3: Token設定**

#### **基本設定**
- **Note**: `Beaver API Access` （用途識別のため）
- **Expiration**: `90 days` （セキュリティベストプラクティス）

#### **Scopes（権限）選択**

✅ **必須権限**:

| Scope | 説明 | Beaverでの用途 |
|-------|------|----------------|
| `repo` | Full control of private repositories | Issues取得、Wiki clone/push |
| `read:org` | Read org and team membership | 組織リポジトリへのアクセス |

📝 **`repo`に含まれる詳細権限**:
- `repo:status` - コミットステータスアクセス
- `repo_deployment` - デプロイメントステータス
- `public_repo` - パブリックリポジトリアクセス
- `repo:invite` - リポジトリ招待管理

❌ **不要な権限**（セキュリティのため選択しない）:
- `admin:*` - 管理者権限全般
- `delete_repo` - リポジトリ削除
- `write:packages` - パッケージ書き込み
- `workflow` - GitHub Actions管理
- `user:email` - メールアドレスアクセス

### **ステップ4: Token生成・保存**

1. **「Generate token」をクリック**
2. **⚠️ 重要**: 表示されたTokenをすぐにコピー
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. **安全な場所に保存**（パスワードマネージャー推奨）

> ⚠️ **警告**: Tokenは一度しか表示されません。紛失した場合は再生成が必要です。

## ⚙️ Token設定方法

### **方法1: 環境変数（推奨）**

#### **Unix/Linux/macOS**
```bash
# ~/.bashrc または ~/.zshrc に追加
export GITHUB_TOKEN="ghp_your_token_here"

# 設定反映
source ~/.bashrc
```

#### **Windows**
```cmd
# コマンドプロンプト
set GITHUB_TOKEN=ghp_your_token_here

# PowerShell
$env:GITHUB_TOKEN="ghp_your_token_here"
```

### **方法2: .envファイル**
```bash
# プロジェクトルートに .env ファイル作成
echo "GITHUB_TOKEN=ghp_your_token_here" > .env

# .gitignore に追加（重要！）
echo ".env" >> .gitignore
```

### **方法3: beaver.yml設定**
```yaml
# 推奨しません - Tokenがファイルに記録されるため
sources:
  github:
    token: "ghp_your_token_here"  # セキュリティリスク
```

## ✅ Token動作確認

### **認証テスト**
```bash
# Beaver経由での確認
beaver status

# curlでの直接確認
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

### **成功時の出力例**
```json
{
  "login": "your-username",
  "id": 12345,
  "type": "User",
  "site_admin": false
}
```

### **権限テスト**
```bash
# リポジトリアクセステスト
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-username/your-repo
```

## 🔐 セキュリティベストプラクティス

### **Token管理**

#### **DO（推奨）**
✅ 最小権限の原則を適用
✅ 定期的なローテーション（90日毎）
✅ 環境変数での管理
✅ 使用しないTokenの即座削除
✅ Token用途の明確な記録

#### **DON'T（非推奨）**
❌ TokenをGitリポジトリにコミット
❌ パブリックな場所での共有
❌ 無期限のExpiration設定
❌ 過剰な権限の付与
❌ 複数用途での同一Token使用

### **Token漏洩時の対応**

1. **即座にToken無効化**
   - GitHub Settings → Personal access tokens → 該当Token → Delete
2. **新しいToken生成**
3. **環境変数更新**
4. **Git履歴の確認**（コミットされていないか）

## 🏢 チーム・組織での利用

### **個人開発**
- 個人のPATを使用
- 個人リポジトリのみアクセス

### **チーム開発**
- **専用サービスアカウント**の作成を推奨
- チーム共有のToken使用
- 組織設定での権限管理

### **GitHub Actionsでの利用**
```yaml
# .github/workflows/beaver.yml
env:
  GITHUB_TOKEN: ${{ secrets.BEAVER_GITHUB_TOKEN }}

# Repository secrets での設定が必要
```

## 🔧 トラブルシューティング

### **よくある問題**

#### **問題1**: `401 Unauthorized`
**原因**: Token認証エラー
**解決**: 
```bash
# Token確認
echo $GITHUB_TOKEN

# 有効性確認
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

#### **問題2**: `403 Forbidden`
**原因**: 権限不足
**解決**: Tokenに `repo` 権限があるか確認

#### **問題3**: `404 Not Found`
**原因**: リポジトリアクセス権限なし
**解決**: リポジトリが存在し、アクセス権があるか確認

### **デバッグコマンド**
```bash
# Token情報確認（最初の10文字のみ表示）
echo $GITHUB_TOKEN | head -c 10

# API制限確認
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# 権限確認
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos
```

## 📊 GitHub API制限

### **Rate Limits**
- **認証済み**: 5,000 requests/hour
- **未認証**: 60 requests/hour
- **検索API**: 30 requests/minute

### **Beaverでの消費**
```bash
# 典型的な使用量
beaver build    # 約10-50 API calls
beaver status   # 約1-5 API calls
beaver fetch    # 約5-20 API calls
```

## 🔄 Token更新・ローテーション

### **定期更新手順**
1. **新しいToken生成**（既存Tokenは削除しない）
2. **新Tokenで動作テスト**
3. **環境変数更新**
4. **旧Token削除**

### **自動化例**
```bash
#!/bin/bash
# token-rotation.sh
echo "GitHub Token更新時期です"
echo "1. https://github.com/settings/tokens/new"
echo "2. 新Tokenで: export GITHUB_TOKEN=new_token"
echo "3. テスト: beaver status"
echo "4. 旧Token削除"
```

## 📚 参考リンク

- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub API Authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)
- [API Rate Limiting](https://docs.github.com/en/rest/rate-limit/rate-limit)
- [Token Security Best Practices](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)

---

**🔐 セキュアなToken管理でBeaverを安全に活用しましょう！**