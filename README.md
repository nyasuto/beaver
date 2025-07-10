# 🦫 Beaver - AI知識ダム (Astro + TypeScript Edition)

**あなたのAI学習を永続的な知識に変換 - 流れ去る学びを堰き止めよう**

BeaverはAIエージェント開発の軌跡を自動的に整理された永続的な知識に変換します。散在するGitHub Issues、コミットログ、AI実験記録を構造化されたGitHub Pagesドキュメントに変換します。
散在する開発情報を永続的な知識ベースとして蓄積し、チームの学習を加速します。

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
- **Astro**: 静的サイト生成 + Island Architecture
- **TypeScript**: 型安全なコード品質
- **Octokit**: GitHub API 統合
- **Zod**: ランタイム型検証
- **Tailwind CSS**: ユーティリティファーストスタイリング

### 🔧 Core Features
- **Knowledge Base Generation**: Issues → 構造化 Wiki
- **Development Analytics**: パターン分析とメトリクス
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
CODECOV_TOKEN=your_codecov_token_here  # Codecov API token (Secret)
CODECOV_OWNER=your_github_username      # GitHub username
CODECOV_REPO=your_repository_name       # Repository name
```

## 🏗️ プロジェクト構造

```
beaver-astro/
├── src/
│   ├── components/          # Astro/React components
│   │   ├── ui/             # Base UI components
│   │   ├── charts/         # Data visualization
│   │   ├── navigation/     # Navigation components
│   │   └── layouts/        # Page layouts
│   ├── pages/              # Astro pages (routes)
│   │   ├── index.astro     # Homepage
│   │   ├── issues/         # Issues pages
│   │   ├── analytics/      # Analytics dashboard
│   │   ├── quality/        # Code quality dashboard
│   │   └── api/            # API endpoints
│   ├── lib/                # Core libraries
│   │   ├── github/         # GitHub API integration
│   │   ├── types/          # TypeScript type definitions
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── analytics/      # Data analysis logic
│   │   ├── quality/        # Code quality integration
│   │   └── utils/          # Utility functions
│   ├── styles/             # Global styles
│   └── data/               # Static data files
├── public/                 # Static assets
├── config/                 # Configuration files
├── scripts/                # Build and deployment scripts
└── docs/                   # Documentation
```

## 🚀 使用方法

### 基本的なワークフロー

1. **初期設定**
```bash
npm run setup
```

2. **GitHub Issues 取得**
```bash
npm run fetch:issues
```

3. **知識ベース生成**
```bash
npm run build
```

4. **デプロイ**
```bash
npm run deploy
```

### 開発コマンド

```bash
# 開発サーバー (ホットリロード)
npm run dev

# 型チェック
npm run type-check

# リント
npm run lint

# テスト
npm run test

# ビルド (本番用)
npm run build

# プレビュー (ビルド後)
npm run preview
```

## 🔧 設定

### メイン設定ファイル

**`config/beaver.config.ts`**
```typescript
import { defineConfig } from './lib/config';

export default defineConfig({
  github: {
    owner: 'your-org',
    repo: 'your-repo',
    token: process.env.GITHUB_TOKEN,
  },
  site: {
    title: 'Your Project Knowledge Base',
    description: 'AI-generated knowledge base',
    baseUrl: 'https://your-org.github.io/beaver',
  },
  analytics: {
    enabled: true,
    metricsCollection: ['issues', 'commits', 'contributors'],
  },
  ai: {
    classificationRules: './config/classification-rules.yaml',
    categoryMapping: './config/category-mapping.json',
  },
});
```

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

## 📊 Analytics & Insights

Beaver は以下の分析機能を提供します:

- **Issue Trends**: 作成・解決パターンの可視化
- **Development Velocity**: チームの開発速度メトリクス
- **Category Distribution**: Issue カテゴリの分布
- **Contributor Analysis**: 貢献者の活動パターン
- **Resolution Patterns**: 問題解決の傾向分析
- **Code Quality**: Codecov APIによるカバレッジ分析とモジュール品質

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
  CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}  # Repository Secrets で設定
  CODECOV_OWNER: ${{ vars.CODECOV_OWNER }}     # Repository Variables で設定
  CODECOV_REPO: ${{ vars.CODECOV_REPO }}       # Repository Variables で設定
```

### 設定手順

1. **GitHub Repository Settings**
   - Settings → Secrets and variables → Actions
   - **Secrets** (機密情報):
     - `CODECOV_TOKEN`: Codecov API token
   - **Variables** (非機密情報):
     - `CODECOV_OWNER`: GitHub ユーザー名
     - `CODECOV_REPO`: リポジトリ名

2. **Codecov Token 取得**
   - [Codecov](https://codecov.io) にログイン
   - Settings → Access → Generate Token
   - 取得したトークンを GitHub Secrets に設定

3. **ローカル開発**
   ```bash
   # .env ファイルに設定
   CODECOV_TOKEN=your_codecov_token_here
   CODECOV_OWNER=your_github_username
   CODECOV_REPO=your_repository_name
   ```

## 📈 パフォーマンス

- **静的サイト生成**: 高速な初期ロード
- **Island Architecture**: 必要最小限の JavaScript
- **画像最適化**: 自動リサイズ・フォーマット変換
- **CDN 配信**: GitHub Pages / Vercel Edge

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

## 🆘 サポート

- **Issues**: GitHub Issues で報告
- **Discussions**: GitHub Discussions で質問
- **Documentation**: `docs/` ディレクトリ
- **AI Agent Guide**: `CLAUDE.md`

## 🎯 ロードマップ

### Phase 1: Core Features (Current)
- [x] GitHub Issues 取得・分類
- [x] 基本的な知識ベース生成
- [x] Astro + TypeScript セットアップ

### Phase 2: Advanced Analytics
- [ ] リアルタイム分析ダッシュボード
- [ ] 高度な分類アルゴリズム
- [ ] インタラクティブ可視化

### Phase 3: Team Collaboration
- [ ] マルチリポジトリ対応
- [ ] チーム分析機能
- [ ] コラボレーション機能

### Phase 4: Enterprise Features
- [ ] API 提供
- [ ] プラグインシステム
- [ ] エンタープライズ認証

---

**Built with ❤️ by AI Agents and Human Developers**