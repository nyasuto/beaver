# ⚙️ 設定ガイド

Beaverの設定オプションとカスタマイズ方法について説明します。

## 🔧 環境変数

### 必須設定

```bash
# GitHub API アクセス
GITHUB_TOKEN=ghp_your_github_token_here

# リポジトリ設定（環境に応じて選択）
# Beaver環境
PUBLIC_SITE_URL=https://nyasuto.github.io/beaver
PUBLIC_REPOSITORY=nyasuto/beaver

# Hive環境  
# PUBLIC_SITE_URL=https://nyasuto.github.io/hive
# PUBLIC_REPOSITORY=nyasuto/hive
```

### オプション設定

```bash
# Codecov統合 (品質分析)
CODECOV_API_TOKEN=your_codecov_api_token_here  # 推奨
CODECOV_TOKEN=your_codecov_token_here          # レガシー対応

# GitHub API設定
GITHUB_BASE_URL=https://api.github.com        # デフォルト値
GITHUB_USER_AGENT=beaver-astro/1.0.0          # デフォルト値
```

## 📊 GitHub Issues分類設定

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

## 🎨 UIカスタマイズ

### テーマ設定

**`src/config/theme.ts`**

```typescript
export const theme = {
  colors: {
    primary: '#0066cc',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545'
  },
  fonts: {
    primary: '"Inter", sans-serif',
    mono: '"JetBrains Mono", monospace'
  }
};
```

### Tailwind CSS設定

**`tailwind.config.mjs`**

```javascript
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'beaver-blue': '#0066cc',
        'beaver-gray': '#6c757d'
      }
    }
  }
};
```

## 🔧 Astro設定

**`astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nyasuto.github.io',
  base: '/beaver', // or '/hive' for Hive environment
  build: {
    assets: 'assets'
  },
  integrations: [
    // React Islands
    react(),
    // Tailwind CSS
    tailwind()
  ]
});
```

## 📊 品質ダッシュボード設定

### Codecov統合

1. **Codecovトークン取得**
   - [Codecov](https://codecov.io) にログイン
   - Settings → Access → Generate Token

2. **環境変数設定**
   ```bash
   CODECOV_API_TOKEN=your_codecov_api_token_here
   ```

3. **GitHub Secretsに追加**
   - Repository Settings → Secrets and variables → Actions
   - `CODECOV_TOKEN` としてSecretに追加

### 品質閾値設定

**`src/config/quality.ts`**

```typescript
export const qualityConfig = {
  coverage: {
    minimum: 80,        // 最低カバレッジ%
    target: 90,         // 目標カバレッジ%
    excellent: 95       // 優秀カバレッジ%
  },
  alerts: {
    lowCoverage: true,  # 低カバレッジアラート
    trendAnalysis: true # トレンド分析
  }
};
```

## 🏷️ ラベル管理

### デフォルトラベル

```yaml
# config/labels.yaml
labels:
  priority:
    - name: "priority: critical"
      color: "d73a4a"
    - name: "priority: high" 
      color: "ff6b35"
    - name: "priority: medium"
      color: "ffab00"
    - name: "priority: low"
      color: "28a745"
      
  type:
    - name: "type: bug"
      color: "d73a4a"
    - name: "type: feature"
      color: "0052cc"
    - name: "type: enhancement"
      color: "84b6eb"
```

## 🚀 デプロイメント設定

### GitHub Pages設定

**`.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
      
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
      
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - run: npm ci
      - run: npm run build
      
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
          
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 環境別設定

**development (ローカル):**
```bash
NODE_ENV=development
PUBLIC_SITE_URL=http://localhost:3000/beaver
```

**staging:**
```bash
NODE_ENV=staging  
# Staging environment (adapt repository name as needed)
PUBLIC_SITE_URL=https://staging.nyasuto.github.io/beaver
```

**production:**
```bash
NODE_ENV=production
# Production environment (adapt repository name as needed)
PUBLIC_SITE_URL=https://nyasuto.github.io/beaver
```

## 🔒 セキュリティ設定

### GitHub Personal Access Token

**必要な権限:**
- `repo` - プライベートリポジトリアクセス（プライベートリポジトリの場合）
- `public_repo` - パブリックリポジトリアクセス（パブリックリポジトリのみの場合）
- `read:user` - ユーザー情報読み取り

**オプション権限:**
- `read:org` - 組織情報読み取り
- `admin:repo_hook` - Webhookの管理（将来の機能用）

### Secrets管理

**GitHub Repository Secrets:**
```bash
GITHUB_TOKEN          # GitHub Personal Access Token
CODECOV_TOKEN         # Codecov API Token
CODECOV_API_TOKEN     # Codecov API Token (新版)
```

**ローカル開発:**
```bash
# .env (Git管理対象外)
GITHUB_TOKEN=...
CODECOV_API_TOKEN=...
```

## 🎯 カスタマイズ例

### 独自分類ルールの追加

```yaml
# config/classification-rules.yaml
categories:
  performance:
    labels: ['performance', 'optimization', 'slow']
    keywords: ['slow', 'performance', 'optimization', 'memory']
    priority: medium
    color: '#ff9500'
    
  security:
    labels: ['security', 'vulnerability', 'cve']
    keywords: ['security', 'vulnerability', 'exploit', 'xss', 'sql']
    priority: critical
    color: '#dc3545'
```

### カスタム品質メトリクス

```typescript
// src/lib/quality/custom-metrics.ts
export interface CustomMetrics {
  codeComplexity: number;
  technicalDebt: number;
  maintainabilityIndex: number;
}

export async function calculateCustomMetrics(): Promise<CustomMetrics> {
  // カスタムメトリクス計算ロジック
  return {
    codeComplexity: 2.5,
    technicalDebt: 15,
    maintainabilityIndex: 85
  };
}
```

### 通知設定

```typescript
// src/config/notifications.ts
export const notificationConfig = {
  slack: {
    enabled: false,
    webhook: process.env.SLACK_WEBHOOK_URL
  },
  email: {
    enabled: false,
    recipients: ['team@example.com']
  },
  github: {
    enabled: true,
    createIssuesForAlerts: true
  }
};
```