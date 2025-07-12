# 🦫 Beaver - AI知識ダム

**あなたのAI学習を永続的な知識に変換する GitHub Action**

BeaverはGitHub Issues・コミット・AI実験記録を自動的に構造化されたGitHub Pagesドキュメントに変換し、コード品質分析とチーム協働を支援するGitHub Actionです。

## 🚀 クイックスタート

### ⚠️ 重要: 事前設定が必要です

**必須: GitHub Pages設定**
1. リポジトリの **Settings** タブに移動
2. 左サイドバーで **Pages** をクリック
3. **Source** を **Deploy from a branch** から **GitHub Actions** に変更
4. **Save** をクリック

⚠️ **この設定を忘れるとサイトが表示されません！**

### 最低限の設定

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
```

### 品質分析付き設定

```yaml
      - name: Generate Beaver Knowledge Base
        uses: nyasuto/beaver@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          codecov-token: ${{ secrets.CODECOV_API_TOKEN }}  # オプション
          enable-quality-dashboard: true
          deploy-to-pages: true
```

### 🎯 生成される成果物

- 📊 **知識ベースサイト**: `https://username.github.io/repository-name/`
- 📋 **AI Issues分析**: 自動分類・優先度付け・感情分析
- 📈 **品質ダッシュボード**: コードカバレッジ・モジュール分析
- 🔍 **検索可能Wiki**: 構造化された開発知識

### 🔧 追加設定

**品質分析を使用する場合:**
```bash
# Repository Settings → Secrets and variables → Actions
CODECOV_API_TOKEN=your_codecov_api_token_here
```

### 📋 設定オプション

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `github-token` | ❌ | `${{ github.token }}` | GitHub API アクセス用トークン |
| `codecov-token` | ❌ | - | Codecov API トークン（品質分析用、CODECOV_API_TOKEN） |
| `enable-quality-dashboard` | ❌ | `true` | 品質ダッシュボードの有効化 |
| `deploy-to-pages` | ❌ | `true` | GitHub Pages への自動デプロイ |

## ✨ 主な機能

- **AI Issues分析**: 自動分類・優先度付け・感情分析
- **品質ダッシュボード**: Codecov統合による品質分析
- **構造化Wiki**: 検索可能な開発知識ベース
- **自動デプロイ**: GitHub Pagesへの自動デプロイ
- **リアルタイム更新**: Issues変更時の自動更新

## 🤖 メタドキュメンテーション

> **BeaverはBeaverプロジェクト自身の開発・運営にBeaverを活用しています**

## 📚 詳細ドキュメント

- **[docs/](./docs/)** - 完全なドキュメント集
- **[local-development.md](./docs/local-development.md)** - ローカル開発環境セットアップ
- **[configuration.md](./docs/configuration.md)** - 設定・カスタマイズガイド
- **[deployment.md](./docs/deployment.md)** - デプロイメント方法
- **[features.md](./docs/features.md)** - 機能詳細
- **[security.md](./docs/security.md)** - セキュリティガイド

## 💬 FAQ

**Q: GitHub Pages が表示されない**  
A: Repository Settings → Pages → Source を "GitHub Actions" に設定してください

**Q: 品質ダッシュボードが表示されない**  
A: Repository Secrets に `CODECOV_TOKEN` を設定してください

**Q: カスタマイズしたい**  
A: [configuration.md](./docs/configuration.md) を参照してください

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

---

**Built with ❤️ by AI Agents and Human Developers**