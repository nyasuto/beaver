# 🛠️ ローカル開発ガイド

Beaverをローカル環境で開発・カスタマイズするためのセットアップガイドです。

## 📋 前提条件

- Node.js 18+
- npm or pnpm
- GitHub Personal Access Token

## 🚀 セットアップ

### 1. リポジトリクローン

```bash
# Beaver環境の場合
git clone https://github.com/nyasuto/beaver
cd beaver

# Hive環境の場合
git clone https://github.com/nyasuto/hive
cd hive
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. 環境変数設定

```bash
cp .env.example .env
```

`.env`ファイルを編集してGitHub tokenを設定:

```bash
# .env
GITHUB_TOKEN=ghp_your_github_token_here

# Beaver環境の場合
PUBLIC_SITE_URL=https://nyasuto.github.io/beaver
PUBLIC_REPOSITORY=nyasuto/beaver

# Hive環境の場合  
PUBLIC_SITE_URL=https://nyasuto.github.io/hive
PUBLIC_REPOSITORY=nyasuto/hive

# 品質分析ダッシュボード (オプション)
CODECOV_API_TOKEN=your_codecov_api_token_here  # Codecov API token (新版)
CODECOV_TOKEN=your_codecov_token_here          # Codecov token (レガシー対応)

# 注意: Codecovリンクはsrc/data/github/metadata.jsonから自動生成されます
# 手動設定は不要です（owner/repositoryは自動取得）
```

### 4. 開発サーバー起動

```bash
npm run dev
```

**重要**: 開発サーバーは `http://localhost:3000/beaver/` でアクセスできます（root pathではありません）。

## 💻 開発ワークフロー

### 基本的なワークフロー

1. **初期設定**
```bash
npm install
cp .env.example .env
# .env を編集してGitHub tokenを設定
```

2. **GitHub Issues 取得**
```bash
npm run fetch-data
```

3. **開発サーバー起動**
```bash
npm run dev
```

4. **品質チェック**
```bash
make quality  # または npm run lint && npm run type-check && npm run test
```

5. **本番ビルド & デプロイ**
```bash
npm run build
npm run deploy
```

### 開発コマンド

```bash
# 開発サーバー (ホットリロード)
npm run dev

# データ取得
npm run fetch-data

# 品質チェック
npm run lint
npm run format        # コード自動修正
npm run format:check  # フォーマットチェックのみ (CI用)
npm run type-check
npm run test

# ビルド (本番用)
npm run build

# プレビュー (ビルド後)
npm run preview

# デプロイ
npm run deploy
```

### Makefile コマンド (推奨)

```bash
# 開発環境セットアップ
make setup

# 品質チェック (lint + format + type-check + test)
make quality

# 品質チェック + 自動修正
make quality-fix

# 開発サーバー
make dev

# すべてのチェック
make all
```

## 🏗️ プロジェクト構造

```
beaver-astro/
├── src/
│   ├── components/          # Astro/React components
│   │   ├── ui/             # Base UI components (Button, Card, Modal, etc.)
│   │   ├── charts/         # Data visualization (Chart.js wrappers)
│   │   ├── navigation/     # Navigation components (Header, Footer)
│   │   ├── layouts/        # Page layouts (Base, Page, Dashboard)
│   │   └── dashboard/      # Dashboard-specific components
│   ├── pages/              # Astro pages (routes)
│   │   ├── index.astro     # Homepage (日本語ローカライズ済み)
│   │   ├── issues/         # Issues pages
│   │   │   ├── index.astro # Issues list with filters
│   │   │   └── [id].astro  # Individual issue details
│   │   ├── quality/        # Code quality dashboard (Codecov統合 + 動的リンク)
│   │   └── api/            # API endpoints
│   │       ├── github/     # GitHub API endpoints
│   │       └── config/     # Configuration endpoints
│   ├── lib/                # Core libraries
│   │   ├── github/         # GitHub API integration
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── quality/        # Code quality integration (Codecov)
│   │   ├── data/           # Static data management
│   │   ├── config/         # Environment configuration
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── styles/             # Global styles
│   └── data/               # Static data files
│       ├── github/         # GitHub data cache
│       ├── config/         # Configuration files
│       └── fixtures/       # Sample data
├── public/                 # Static assets
├── scripts/                # Build and deployment scripts
├── Makefile               # Development workflow automation
└── docs/                   # Documentation
```

## 🤖 AI Agent Integration

このプロジェクトは AI Agent (Claude Code) による開発を前提として設計されています:

### AI-Friendly Architecture
- **明確な型定義**: Zod スキーマによる厳密な型チェック
- **モジュラー設計**: 独立したコンポーネント・関数
- **包括的テスト**: 自動テスト生成に最適化
- **詳細なドキュメント**: AI による理解・修正が容易

### 開発ガイドライン
詳細な AI Agent 開発ガイドラインは `CLAUDE.md` を参照してください。

## 🧪 テスト

```bash
# すべてのテスト実行
npm run test

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモード
npm run test:watch
```

## 🔧 トラブルシューティング

### よくある問題

**開発サーバーでページが表示されない:**
- URL が `http://localhost:3000/beaver/` になっているか確認
- root path (`http://localhost:3000/`) では404エラーになります

**GitHub API エラー:**
- `.env` ファイルの `GITHUB_TOKEN` が正しく設定されているか確認
- トークンに適切な権限があるか確認

**ビルドエラー:**
- TypeScript型エラーがないか `npm run type-check` で確認
- 依存関係を最新化: `npm update`