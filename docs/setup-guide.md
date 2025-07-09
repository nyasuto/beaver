# 🚀 セットアップガイド

このガイドでは、Beaver Astro Edition の静的サイト生成とGitHub データ統合のセットアップ方法を説明します。

## 📋 必要な環境

- **Node.js**: v18.0.0 以上
- **npm**: v8.0.0 以上
- **GitHub Personal Access Token**: リポジトリにアクセス可能なトークン

## 🔧 初期セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/nyasuto/beaver.git
cd beaver
```

### 2. 依存関係のインストール

```bash
npm ci
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成します：

```bash
cp .env.example .env
```

`.env` ファイルを編集し、必要な設定を行います：

```env
# 必須設定
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_username_or_organization
GITHUB_REPO=your_repository_name

# オプション設定（通常は変更不要）
GITHUB_BASE_URL=https://api.github.com
SITE_TITLE=Beaver Astro Edition
SITE_DESCRIPTION=AI-first knowledge management system
```

## 🔑 GitHub Personal Access Token の取得

1. GitHub にログインし、[Personal Access Tokens](https://github.com/settings/tokens) ページにアクセス
2. **「Generate new token」** → **「Generate new token (classic)」** をクリック
3. トークンの設定：
   - **Name**: `Beaver Astro App` (任意の名前)
   - **Expiration**: `90 days` または `No expiration` (推奨)
   - **Select scopes**: 以下の権限を選択
     - `repo` (プライベートリポジトリの場合)
     - `public_repo` (パブリックリポジトリの場合)
     - `read:user` (ユーザー情報の取得)
4. **「Generate token」** をクリック
5. 生成されたトークンをコピーして `.env` ファイルに設定

## 📊 データ取得とビルド

### GitHub データの取得

初回または手動でデータを取得する場合：

```bash
npm run fetch-data
```

このコマンドを実行すると：
- `src/data/github/issues.json` - 全 Issue データ
- `src/data/github/metadata.json` - 統計情報とメタデータ
- `src/data/github/issues/` - 個別 Issue ファイル

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが `http://localhost:4321` で起動します。

### 本番ビルド

```bash
npm run build
```

または、データ取得を含むフルビルド：

```bash
npm run build:full
```

## 🏗️ ビルドプロセス

### 自動データ取得

ビルド時に自動的にデータを取得するため、以下の設定が組み込まれています：

```json
{
  "scripts": {
    "prebuild": "npm run fetch-data",
    "build": "astro build",
    "build:full": "npm run fetch-data && npm run build"
  }
}
```

### GitHub Actions での自動更新

`.github/workflows/update-data.yml` により、以下のタイミングでデータが自動更新されます：

- **毎日午前6時（JST）**: 定期的な更新
- **手動実行**: GitHub Actions の「Run workflow」から実行
- **main ブランチへのプッシュ**: スクリプトやスキーマが変更された場合

## 🚀 GitHub Pages へのデプロイ

### 1. リポジトリ設定

1. GitHub リポジトリの **Settings** → **Pages** にアクセス
2. **Source** を「GitHub Actions」に設定

### 2. 自動デプロイ

GitHub Actions が自動的に以下を実行します：

1. データの取得・更新
2. 静的サイトのビルド
3. GitHub Pages への デプロイ

### 3. 手動デプロイ

```bash
npm run deploy
```

## 🔍 トラブルシューティング

### データ取得エラー

**エラー**: `GitHub API エラー: 401 Unauthorized`
**解決策**: 
- GitHub トークンが正しく設定されているか確認
- トークンの有効期限が切れていないか確認
- 必要な権限が付与されているか確認

**エラー**: `Rate limit exceeded`
**解決策**: 
- GitHub API のレート制限に達しています
- 時間をおいて再実行してください

### ビルドエラー

**エラー**: `データファイルが見つかりません`
**解決策**:
1. `npm run fetch-data` でデータを取得
2. `.env` ファイルの設定を確認
3. GitHub トークンの権限を確認

### 型エラー

**エラー**: `TypeScript errors during build`
**解決策**:
1. `npm run type-check` で詳細なエラーを確認
2. 必要に応じて型定義を更新

## 📚 開発ワークフロー

### 日常的な開発

```bash
# 開発サーバー起動
npm run dev

# データ更新
npm run fetch-data

# 品質チェック
npm run quality

# 本番ビルド
npm run build
```

### 新機能開発

1. **フィーチャーブランチ作成**: `git checkout -b feat/new-feature`
2. **開発とテスト**: `npm run dev` で開発
3. **品質チェック**: `npm run quality` で確認
4. **プルリクエスト**: GitHub で PR 作成
5. **マージ後**: 自動でデータ更新・デプロイ

## 🔒 セキュリティ

### 環境変数の管理

- `.env` ファイルは Git にコミットしない
- GitHub Secrets を使用してトークンを管理
- 不要になったトークンは削除

### アクセス制御

- 必要最小限の権限のみ付与
- 定期的なトークンの更新
- 不審なアクセスログの監視

## 📞 サポート

問題が発生した場合：

1. **ログの確認**: コンソール出力を確認
2. **Issue の作成**: GitHub リポジトリで Issue を作成
3. **ドキュメントの確認**: 関連ドキュメントを参照

---

**このガイドに従って正常にセットアップが完了すれば、GitHub データを活用した静的サイトが自動生成されます。**