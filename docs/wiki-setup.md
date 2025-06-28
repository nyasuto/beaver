# 📖 GitHub Wiki セットアップガイド

> Beaver用GitHub Wiki初期化とPersonal Access Token設定の完全ガイド

## 🎯 概要

BeaverはGit clone方式でGitHub Wikiを更新するため、事前にWikiの初期化とPersonal Access Tokenの設定が必要です。このガイドでは、それらの手順を詳しく説明します。

## 📋 前提条件

- GitHubアカウント
- リポジトリの管理者権限
- Web ブラウザ

## 🚀 Wiki初期化手順

### **ステップ1: GitHubリポジトリのWikiページにアクセス**

1. GitHubでリポジトリページを開く
2. タブメニューの「Wiki」をクリック

```
https://github.com/your-username/your-repo → Wiki タブ
```

### **ステップ2: 初回ページ作成**

WikiがまだないとGitHubは以下のメッセージを表示します:

```
Wikis provide a place in your repository to lay out the roadmap of your 
project, show the current status, and document software better, together.
```

**「Create the first page」ボタンをクリック**

### **ステップ3: ホームページ作成**

1. **Page title**: `Home` のまま（変更不要）
2. **Content**: 適当な内容を入力（Beaverが自動で上書きします）
   ```markdown
   # Welcome to the Wiki
   
   This wiki will be automatically updated by Beaver.
   ```
3. **「Save Page」をクリック**

### **ステップ4: Wiki初期化完了確認**

✅ WikiのURLが有効になったことを確認:
```
https://github.com/your-username/your-repo/wiki
```

## 🔑 Personal Access Token設定

### **ステップ1: GitHub Settingsにアクセス**

1. GitHubの右上アバター → **Settings**
2. 左サイドバー → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**

### **ステップ2: 新しいTokenを作成**

1. **「Generate new token」** → **「Generate new token (classic)」**
2. **Note**: `Beaver Wiki Access` （識別用）
3. **Expiration**: `90 days` （推奨）

### **ステップ3: 必要な権限を選択**

✅ **必須権限**:
- `repo` - Full control of private repositories
  - ✅ `repo:status` - Access commit status
  - ✅ `repo_deployment` - Access deployment status  
  - ✅ `public_repo` - Access public repositories
  - ✅ `repo:invite` - Access repository invitations

✅ **推奨権限**:
- `read:org` - Read org and team membership

❌ **不要な権限** (セキュリティ向上のため選択しない):
- `admin:*` - 管理権限全般
- `delete_repo` - リポジトリ削除
- `write:packages` - パッケージ書き込み

### **ステップ4: Tokenを生成・保存**

1. **「Generate token」をクリック**
2. **⚠️ 重要**: 表示されたTokenをコピーして安全に保存
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. **このTokenは二度と表示されません**

## ⚙️ Beaver設定

### **環境変数設定**

```bash
# .env ファイルまたはシェル設定
export GITHUB_TOKEN="ghp_your_token_here"
```

### **beaver.yml設定**

```yaml
project:
  name: "あなたのプロジェクト名"
  repository: "your-username/your-repo"

sources:
  github:
    issues: true
    commits: true
    prs: true

output:
  wiki:
    platform: "github"
    templates: "default"
    
timezone:
  location: "Asia/Tokyo"
  format: "2006-01-02 15:04:05 JST"
```

## ✅ セットアップ確認

### **テスト実行**

```bash
# Token認証テスト
beaver status

# Wiki初期化確認
beaver build
```

### **成功時の出力例**

```
✅ 設定ファイル読み込み完了: beaver.yml
✅ GitHub API接続テスト成功
✅ リポジトリアクセス確認: your-username/your-repo
✅ Wiki repository clone成功
📝 Wiki更新完了: 3ページ生成
🔗 Wiki URL: https://github.com/your-username/your-repo/wiki
```

## 🔧 トラブルシューティング

### **よくある問題と解決法**

#### **問題1**: `Wiki repository not found (404)`

**原因**: Wikiが初期化されていない
**解決**: 上記「Wiki初期化手順」を実行

#### **問題2**: `Permission denied (403)`

**原因**: Personal Access Tokenの権限不足
**解決**: 
1. Tokenの権限確認（`repo`が必要）
2. 新しいTokenを生成

#### **問題3**: `Repository not accessible`

**原因**: リポジトリ名の間違い
**解決**: `beaver.yml`の`repository`設定を確認

#### **問題4**: `Git clone failed`

**原因**: Wikiページが存在しない
**解決**: GitHub Web UIで少なくとも1ページ作成

### **デバッグコマンド**

```bash
# 詳細ログで実行
BEAVER_DEBUG=true beaver build

# 設定確認
beaver status --verbose

# Token確認（セキュリティに注意）
echo $GITHUB_TOKEN | head -c 10
```

## 🔒 セキュリティ注意事項

### **Token管理**

1. **Tokenを共有しない**
2. **定期的にローテーション** (90日推奨)
3. **最小権限の原則**を守る
4. **使用しないTokenは削除**

### **Repository設定**

1. **Wiki権限**: リポジトリの協力者のみに制限
2. **公開リポジトリ**: Wikiも公開されることに注意
3. **プライベートリポジトリ**: Wikiもプライベートです

## 📚 参考リンク

- [GitHub Wiki Documentation](https://docs.github.com/en/communities/documenting-your-project-with-wikis)
- [Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Git Clone Wiki Repositories](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages#adding-or-editing-wiki-pages-locally)

## 💡 ヒント

### **チーム開発の場合**

1. **共有Token**: 専用サービスアカウントの使用を推奨
2. **権限管理**: 最小限の権限でTokenを作成
3. **ドキュメント**: チーム内でsetup手順を共有

### **CI/CD統合**

```yaml
# GitHub Actions例
env:
  GITHUB_TOKEN: ${{ secrets.BEAVER_GITHUB_TOKEN }}
```

---

**🦫 これでBeaverでGitHub Wikiを使用する準備が完了です！**