# 📚 Beaver Documentation

**開発者・利用者向けドキュメント集**

## 📋 ドキュメント一覧

### 🚀 利用者向け
- **[product-overview.md](./product-overview.md)** - プロダクト概要と価値提案
- **[local-development.md](./local-development.md)** - ローカル開発環境セットアップ
- **[configuration.md](./configuration.md)** - 設定・カスタマイズガイド
- **[deployment.md](./deployment.md)** - デプロイメント方法（各プラットフォーム対応）

### 🏗️ 開発者向け
- **[architecture.md](./architecture.md)** - システム全体設計とアーキテクチャ概要
- **[features.md](./features.md)** - 機能詳細と使用方法
- **[security.md](./security.md)** - セキュリティガイドとベストプラクティス

### 🔧 技術仕様
- **[API_SPECIFICATION.md](./API_SPECIFICATION.md)** - REST API仕様とエンドポイント詳細
- **[github-integration.md](./github-integration.md)** - GitHub API統合の技術実装

## 🚀 基本的な使用方法

**GitHub Actionとしての利用については、メインの[README.md](../README.md)をご覧ください。**

最低限の設定でBeaverを導入:
```yaml
- uses: nyasuto/beaver@v1
```

## 🗺️ ドキュメントナビゲーション

### 初回利用者
1. **[product-overview.md](./product-overview.md)** でBeaverの全体像を把握
2. **[README.md](../README.md)** でGitHub Actionの導入方法を確認

### 開発者・カスタマイザー
1. **[local-development.md](./local-development.md)** でローカル環境をセットアップ
2. **[architecture.md](./architecture.md)** で設計思想を理解
3. **[configuration.md](./configuration.md)** でカスタマイズ方法を学習
4. **[features.md](./features.md)** で詳細機能を把握

### 運用・デプロイ担当者
1. **[deployment.md](./deployment.md)** で各プラットフォームへのデプロイ方法を確認
2. **[security.md](./security.md)** でセキュリティ要件を理解
3. **[configuration.md](./configuration.md)** で運用設定を調整

### API開発者
1. **[API_SPECIFICATION.md](./API_SPECIFICATION.md)** でエンドポイント仕様を確認
2. **[github-integration.md](./github-integration.md)** でGitHub API連携を理解

## 📝 その他の情報

- **AI開発ガイドライン**: [`CLAUDE.md`](../CLAUDE.md)
- **プロジェクト概要**: [`README.md`](../README.md)