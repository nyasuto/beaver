# 🦫 Beaver - AI知識ダム (Astro + TypeScript Edition)

**あなたのAI学習を永続的な知識に変換 - 流れ去る学びを堰き止めよう**

BeaverはAIエージェント開発の軌跡を自動的に整理された永続的な知識に変換します。散在するGitHub Issues、コミットログ、AI実験記録を構造化されたGitHub Pagesドキュメントに変換し、コード品質分析とチーム協働を支援します。

## 🎯 解決する課題

**エンジニアリングマネージャの日々の苦悩:**
- 📊 **ステークホルダー報告**: 技術的進捗をビジネス言語で説明するのが困難
- 🔍 **情報の散在**: 重要な議論や決定がIssueやコメントに埋もれて見つからない
- 👥 **知識の属人化**: 開発者が退職すると貴重な知見や経験が組織から失われる
- ⏰ **工数と価値のバランス**: ドキュメント整備は重要だが、開発時間とのトレードオフが課題

**AIエージェント開発特有の課題:**
- ✅ AIエージェントは高速で反復・学習する
- ✅ 開発はIssuesやPRで進行する
- ❌ **知識が流れの中で失われる**
- ❌ **学習の永続的記録がない**
- ❌ **チームの知識が断片化している**

**従来のアプローチの限界:**
```
🚫 従来の方法                        🤔 課題
技術ツール (Codecov, Jenkins)    → 非エンジニアには理解困難
GitHub Issues/PRコメント        → 議論が散在、検索・整理困難  
開発者個人の知識                 → 属人化、退職時に失われる
手作業のドキュメント作成          → 工数が重く、維持困難
```

**Beaverのソリューション - ステークホルダー別最適化:**
```
🔄 多層アプローチ                    👥 対象者
技術詳細 (CLI、ログ、デバッグ情報)   → 開発者
視覚的サマリー (スプレッドシート等)   → マネージャ・PM・QA
構造化Wiki (分類済み、検索可能)      → チーム全体・新規メンバー

Issues + Commits + AIログ → 🦫 Beaver → 各ステークホルダーに最適化された知識
```
## 🦫 Beaverによる自己プロジェクト運営

> **メタドキュメンテーション**: BeaverはBeaverプロジェクト自身の開発・運営にBeaverを活用しています

## 🚀 特徴

### ✨ AI-First Architecture
- **AI Agent 主導開発**: Claude Code による自動コード生成・最適化
- **スマート分類**: GitHub Issues の自動カテゴライゼーション
- **インテリジェント分析**: 開発パターンとトレンドの自動検出

### 🎯 Modern Tech Stack
- **Astro 5.11**: 静的サイト生成 + Island Architecture
- **TypeScript 5.6**: 型安全なコード品質
- **React 19.1**: インタラクティブコンポーネント
- **Octokit**: GitHub API 統合
- **Zod**: ランタイム型検証
- **Tailwind CSS**: ユーティリティファーストスタイリング
- **Chart.js**: データ可視化
- **Vitest**: 包括的テストフレームワーク

### 🔧 Core Features
- **Knowledge Base Generation**: Issues → 構造化 Wiki
- **Code Quality Dashboard**: Codecov API統合による品質分析
- **Interactive Visualization**: Chart.js による動的グラフ
- **GitHub Pages Deployment**: 自動デプロイメント
- **Real-time Updates**: インクリメンタル更新
- **Team Collaboration**: 共有知識ベース

## 📦 インストール

### 前提条件
- Node.js 18+
- npm or pnpm
- GitHub Personal Access Token

### セットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-org/beaver-astro
cd beaver-astro

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .env ファイルを編集してGitHub tokenを設定

# 開発サーバー起動
npm run dev
```

### 環境変数

```bash
# .env
GITHUB_TOKEN=ghp_your_github_token_here
PUBLIC_SITE_URL=https://your-org.github.io/beaver
PUBLIC_REPOSITORY=your-org/your-repo

# 品質分析ダッシュボード (オプション)
CODECOV_API_TOKEN=your_codecov_api_token_here  # Codecov API token (新版)
CODECOV_TOKEN=your_codecov_token_here          # Codecov token (レガシー対応)

# 注意: Codecovリンクはsrc/data/github/metadata.jsonから自動生成されます
# 手動設定は不要です（owner/repositoryは自動取得）
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

## 🚀 使用方法

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

## 🔧 設定

### GitHub Issues 分類設定

**`config/classification-rules.yaml`**
```yaml
categories:
  bug:
    labels: ['bug', 'issue', 'problem']
    keywords: ['error', 'fail', 'broken', 'not working']
    priority: high
    
  feature:
    labels: ['enhancement', 'feature', 'new']
    keywords: ['add', 'implement', 'create', 'need']
    priority: medium
    
  docs:
    labels: ['documentation', 'docs']
    keywords: ['document', 'readme', 'guide', 'tutorial']
    priority: low

urgency_scoring:
  high_priority_labels: ['critical', 'urgent', 'blocker']
  age_weight: 0.3
  label_weight: 0.7
```

## 📊 機能と洞察

Beaver は以下の機能を提供します:

### 🔍 品質分析ダッシュボード (`/quality`)
- **Overall Coverage**: 全体的なコードカバレッジメトリクス
- **Module Analysis**: モジュール単位のカバレッジ詳細
- **Top 5 Modules**: 対処が必要な上位5モジュール
- **Coverage History**: カバレッジ履歴とトレンド
- **Quality Recommendations**: AI搭載の改善提案
- **Dynamic Codecov Links**: リポジトリメタデータから自動生成されるCodecovへの直接リンク
- **Interactive Settings**: 閾値設定とフィルタリング機能

### 📋 Issue管理 (`/issues`)
- **Issue Listing**: フィルタリング・検索機能付き一覧
- **Label Management**: ラベル別の分類と統計
- **Status Tracking**: オープン/クローズ状態の追跡
- **Detail View**: 個別Issue詳細とメタデータ

### 🤖 AI分析機能
- **Smart Classification**: 自動カテゴライゼーション
- **Sentiment Analysis**: Issue感情分析
- **Effort Estimation**: 作業見積もり
- **Pattern Recognition**: 開発パターン認識

## 🤖 AI Agent Integration

このプロジェクトは AI Agent (Claude Code) による開発を前提として設計されています:

### AI-Friendly Architecture
- **明確な型定義**: Zod スキーマによる厳密な型チェック
- **モジュラー設計**: 独立したコンポーネント・関数
- **包括的テスト**: 自動テスト生成に最適化
- **詳細なドキュメント**: AI による理解・修正が容易

### 開発ガイドライン
詳細な AI Agent 開発ガイドラインは `CLAUDE.md` を参照してください。

## 🚢 デプロイメント

### GitHub Pages (推奨)

```bash
# GitHub Pages 自動デプロイ設定
npm run deploy:github

# 手動デプロイ
npm run build
npm run deploy:manual
```

### その他のプラットフォーム

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Cloudflare Pages**: 自動 Git 連携

## 🔐 セキュリティ

- GitHub Token は環境変数で管理
- Codecov Token は Secrets で管理 (API認証用)
- Zod による入力値検証
- セキュアなデフォルト設定
- 定期的な依存関係更新

### GitHub Actions での環境変数設定

```yaml
# .github/workflows/deploy.yml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  CODECOV_API_TOKEN: ${{ secrets.CODECOV_API_TOKEN }}  # Repository Secrets で設定 (推奨)
  CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}          # Repository Secrets で設定 (レガシー対応)
  
  # 注意: CODECOV_OWNER/CODECOV_REPOの手動設定は不要
  # リポジトリメタデータから自動取得されます
```

### 設定手順

1. **GitHub Repository Settings**
   - Settings → Secrets and variables → Actions
   - **Secrets** (機密情報):
     - `CODECOV_API_TOKEN`: Codecov API token (推奨)
     - `CODECOV_TOKEN`: Codecov token (レガシー対応)

2. **Codecov Token 取得**
   - [Codecov](https://codecov.io) にログイン
   - Settings → Access → Generate Token
   - 取得したトークンを GitHub Secrets に設定

3. **ローカル開発**
   ```bash
   # .env ファイルに設定
   CODECOV_API_TOKEN=your_codecov_api_token_here
   # または
   CODECOV_TOKEN=your_codecov_token_here
   
   # owner/repositoryは自動取得されるため設定不要
   ```

### 🔗 動的リンク生成機能

Beaver v2では、Codecovへのリンクが動的に生成されます：

- **自動URL生成**: `src/data/github/metadata.json` からリポジトリ情報を読み取り
- **設定不要**: 手動でowner/repository名を設定する必要なし  
- **環境対応**: 開発・本番環境で自動的に適切なURLを生成

### 🛠️ 技術的改善点

**最近の実装改善 (Issue #234対応):**

1. **TypeScript JSON モジュール対応**
   ```typescript
   // src/env.d.ts で JSON インポートを型安全に
   declare module '*.json' {
     const value: any;
     export default value;
   }
   ```

2. **CI/CD最適化**
   ```makefile
   # Makefile: CI環境での適切なフォーマットチェック
   quality: npm run format:check  # ファイル変更を防止
   ```

3. **動的URL生成パターン**
   ```typescript
   // 設定に依存しない柔軟な URL 生成
   const generateCodecovUrl = () => {
     const { owner, name } = githubMetadata.repository;
     return `https://codecov.io/gh/${owner}/${name}`;
   };
   ```

## 📈 パフォーマンス & 品質

### ⚡ パフォーマンス最適化
- **静的サイト生成**: 高速な初期ロード
- **Island Architecture**: 必要最小限の JavaScript
- **画像最適化**: 自動リサイズ・フォーマット変換
- **CDN 配信**: GitHub Pages / Vercel Edge

### 🧪 品質保証
- **包括的テスト**: 1843テスト (50テストファイル)
- **コードカバレッジ**: 57.85% (継続的改善中)
- **型安全性**: TypeScript 5.6 strict mode
- **コード品質**: ESLint + Prettier + Zod validation
- **CI/CD**: GitHub Actions自動化

## 🤝 コントリビューション

1. Fork this repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### AI Agent コントリビューション
AI Agent による開発では、`CLAUDE.md` のガイドラインに従ってください。

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🚀 GitHub Action として使用

Beaverは GitHub Action として他のリポジトリで簡単に使用できます。最低限の設定で AI 知識管理システムを導入可能です。

### 基本的な使用方法

```yaml
# .github/workflows/beaver.yml
name: Generate Knowledge Base with Beaver

on:
  push:
    branches: [ main ]
  issues:
    types: [opened, edited, closed, reopened, labeled, unlabeled]
  schedule:
    - cron: '0 6 * * *'  # 毎日午前6時に実行

jobs:
  knowledge-base:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    
    environment:
      name: github-pages
      url: ${{ steps.beaver.outputs.site-url }}
    
    steps:
      - name: Generate Beaver Knowledge Base
        id: beaver
        uses: nyasuto/beaver@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          codecov-token: ${{ secrets.CODECOV_TOKEN }}  # オプション
```

### 設定オプション

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `github-token` | ❌ | `${{ github.token }}` | GitHub API アクセス用トークン |
| `codecov-token` | ❌ | - | Codecov API トークン（品質分析用） |
| `enable-quality-dashboard` | ❌ | `true` | 品質ダッシュボードの有効化 |
| `deploy-to-pages` | ❌ | `true` | GitHub Pages への自動デプロイ |
| `site-subdirectory` | ❌ | `beaver` | サイトのサブディレクトリ名 |

### 必要な権限設定

```yaml
permissions:
  contents: read      # リポジトリ読み取り
  pages: write        # GitHub Pages デプロイ
  id-token: write     # GitHub Pages 認証
```

### 環境変数（オプション）

```bash
# Repository Settings → Secrets and variables → Actions
CODECOV_TOKEN=your_codecov_token_here  # 品質分析を有効にする場合
```

### 生成される成果物

- 📊 **知識ベースサイト**: `https://username.github.io/beaver/`
- 📋 **Issues 分析**: AI による自動分類・優先度付け
- 📈 **品質ダッシュボード**: コードカバレッジ・モジュール分析
- 🔍 **検索可能Wiki**: 構造化された開発知識

### 最小設定例

```yaml
# 最低限の設定（自動デプロイなし）
- uses: nyasuto/beaver@v1
```

これだけで Beaver があなたのリポジトリの Issues を分析し、知識ベースを生成します！

## 🆘 サポート

- **Issues**: GitHub Issues で報告
- **Discussions**: GitHub Discussions で質問
- **Documentation**: `docs/` ディレクトリ
- **AI Agent Guide**: `CLAUDE.md`

## 🎯 ロードマップ

### Phase 1: Core Features ✅ (完了)
- [x] GitHub Issues 取得・分類
- [x] 基本的な知識ベース生成
- [x] Astro + TypeScript セットアップ
- [x] 日本語ローカライゼーション
- [x] インタラクティブ品質ダッシュボード
- [x] Codecov API統合による品質分析
- [x] 包括的テストフレームワーク

### Phase 2: Advanced Quality Features ⚡ (進行中)
- [x] コード品質分析ダッシュボード
- [x] インタラクティブ可視化 (Chart.js)
- [x] 動的Codecovリンク生成
- [x] TypeScript JSON モジュール対応
- [x] GitHub Actions CI/CD最適化
- [ ] 高度な分類アルゴリズム
- [ ] パフォーマンス最適化
- [ ] セキュリティ分析

### Phase 3: GitHub Action & OSS Distribution 🚀 (完了)
- [x] GitHub Action 配布対応
- [x] 最小設定での簡単導入
- [x] クロスプラットフォーム対応
- [x] 自動リポジトリ情報取得
- [ ] GitHub Marketplace 公開
- [ ] マルチリポジトリ対応
- [ ] チーム分析機能

### Phase 4: Enterprise Features 🌟 (将来)
- [ ] API 提供
- [ ] プラグインシステム
- [ ] エンタープライズ認証
- [ ] 大規模データ対応

---

**Built with ❤️ by AI Agents and Human Developers**