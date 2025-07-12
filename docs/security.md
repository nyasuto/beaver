# 🔐 セキュリティガイド

Beaverのセキュリティ機能、ベストプラクティス、および脅威対策について説明します。

## 🎯 セキュリティ概要

Beaverは以下のセキュリティ原則に基づいて設計されています：

- **最小権限の原則** - 必要最小限の権限のみ要求
- **多層防御** - 複数のセキュリティレイヤーで保護
- **セキュアバイデザイン** - 設計段階からセキュリティを考慮
- **透明性** - セキュリティ機能を明確に文書化

## 🔑 認証とアクセス制御

### GitHub Personal Access Token

**必要な権限（最小構成）:**
```bash
# パブリックリポジトリの場合
public_repo      # パブリックリポジトリアクセス
read:user        # ユーザー情報読み取り

# プライベートリポジトリの場合  
repo             # フルリポジトリアクセス
read:user        # ユーザー情報読み取り
```

**オプション権限:**
```bash
read:org         # 組織情報読み取り（組織のリポジトリの場合）
admin:repo_hook  # Webhook管理（将来機能用）
```

### トークン管理ベストプラクティス

```bash
# ✅ 良い例 - 環境変数で管理
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# ❌ 悪い例 - コードに直接記述
const token = "ghp_xxxxxxxxxxxxxxxxxxxx"; // 絶対に避ける
```

**トークンローテーション:**
```bash
# 定期的なトークン更新（推奨：3ヶ月毎）
1. 新しいトークンを生成
2. 環境変数を更新
3. 古いトークンを無効化
4. 動作確認
```

## 🔒 機密情報管理

### 環境変数設定

**ローカル開発:**
```bash
# .env (Git管理対象外)
GITHUB_TOKEN=ghp_your_token_here
CODECOV_TOKEN=your_codecov_token_here

# .env.example (Git管理対象)
GITHUB_TOKEN=your_github_token_here
CODECOV_TOKEN=your_codecov_token_here
```

**本番環境:**
```bash
# GitHub Actions Secrets
GITHUB_TOKEN          # GitHub Personal Access Token
CODECOV_TOKEN         # Codecov API Token
CODECOV_API_TOKEN     # Codecov API Token (新版)

# GitHub Actions Variables (公開可能)
PUBLIC_SITE_URL       # サイトURL
PUBLIC_REPOSITORY     # リポジトリ名
```

### Secrets検出防止

```bash
# .gitignore で機密ファイルを除外
.env
.env.local
.env.production
secrets/
private/

# pre-commit フックで機密情報チェック
npm install --save-dev @commitlint/cli
```

## 🛡️ アプリケーションセキュリティ

### 入力値検証

**Zodスキーマによる厳密な検証:**
```typescript
import { z } from 'zod';

// GitHub Issue スキーマ
export const IssueSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  state: z.enum(['open', 'closed']),
  labels: z.array(z.object({
    name: z.string(),
    color: z.string().regex(/^[0-9a-fA-F]{6}$/)
  }))
});

// APIリクエスト検証
export const CreateIssueSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().max(65536).optional(),
  labels: z.array(z.string()).max(10).optional(),
  assignees: z.array(z.string()).max(10).optional()
});
```

### XSS対策

```typescript
// HTMLエスケープ
import { escape } from 'html-escaper';

export function sanitizeUserInput(input: string): string {
  return escape(input);
}

// Markdownサニタイゼーション
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeMarkdown(markdown: string): string {
  return DOMPurify.sanitize(markdown);
}
```

### CSRF対策

```typescript
// API Routeでのトークン検証
export async function POST({ request }: APIContext) {
  const contentType = request.headers.get('content-type');
  
  // Content-Type チェック
  if (!contentType?.includes('application/json')) {
    return new Response(
      JSON.stringify({ error: 'Invalid content type' }),
      { status: 400 }
    );
  }
  
  // 同一オリジン検証
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (!isValidOrigin(origin, referer)) {
    return new Response(
      JSON.stringify({ error: 'Invalid origin' }),
      { status: 403 }
    );
  }
}
```

## 🌐 HTTPSとネットワークセキュリティ

### HTTPS強制

**Astro設定:**
```javascript
// astro.config.mjs
export default defineConfig({
  server: {
    // 開発環境でもHTTPS（必要に応じて）
    https: process.env.NODE_ENV === 'development' ? false : true
  }
});
```

**セキュリティヘッダー:**
```typescript
// src/middleware/security.ts
export function securityHeaders(response: Response): Response {
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}
```

### Content Security Policy (CSP)

```html
<!-- public/index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.github.com https://codecov.io;
  font-src 'self' https://fonts.gstatic.com;
">
```

## 🔍 API セキュリティ

### レート制限

```typescript
// src/lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache<string, number>({
  max: 500,
  ttl: 60 * 1000, // 1分
});

export function checkRateLimit(identifier: string, limit: number = 60): boolean {
  const current = rateLimit.get(identifier) || 0;
  
  if (current >= limit) {
    return false;
  }
  
  rateLimit.set(identifier, current + 1);
  return true;
}

// API Route での使用
export async function GET({ request }: APIContext) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429 }
    );
  }
  
  // 正常処理
}
```

### GitHub API セキュリティ

```typescript
// src/lib/github/client.ts
import { Octokit } from '@octokit/rest';

export function createGitHubClient(token: string): Octokit {
  // トークン検証
  if (!token || !token.startsWith('ghp_')) {
    throw new Error('Invalid GitHub token format');
  }
  
  return new Octokit({
    auth: token,
    userAgent: 'beaver-astro/1.0.0',
    // タイムアウト設定
    request: {
      timeout: 10000,
    },
    // retry設定  
    retry: {
      doNotRetry: ['429'], // レート制限は再試行しない
    },
  });
}
```

## 🔐 依存関係セキュリティ

### 脆弱性スキャン

```bash
# npm audit で脆弱性チェック
npm audit

# 自動修正
npm audit fix

# package-lock.json で確定的インストール
npm ci
```

**GitHub Dependabot設定:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "team-lead"
    assignees:
      - "security-team"
```

### セキュアな依存関係管理

```json
{
  "scripts": {
    "security:audit": "npm audit --audit-level moderate",
    "security:update": "npm update && npm audit fix",
    "security:check": "npm outdated && npm audit"
  }
}
```

## 🚨 セキュリティモニタリング

### ログ記録

```typescript
// src/lib/security/logger.ts
export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_request';
  timestamp: Date;
  source: string;
  details: Record<string, any>;
}

export function logSecurityEvent(event: SecurityEvent): void {
  // 本番環境では外部ログサービスに送信
  if (process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY]', JSON.stringify(event));
  }
}

// 使用例
export async function handleAuthFailure(request: Request): Promise<void> {
  logSecurityEvent({
    type: 'auth_failure',
    timestamp: new Date(),
    source: request.headers.get('x-forwarded-for') || 'unknown',
    details: {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    }
  });
}
```

### 侵入検知

```typescript
// src/lib/security/detection.ts
export function detectSuspiciousActivity(request: Request): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const path = new URL(request.url).pathname;
  
  // 怪しいパターンの検出
  const suspiciousPatterns = [
    /bot|crawler|spider/i,
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempt
    /union.*select/i,  // SQL injection
  ];
  
  return suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || pattern.test(path)
  );
}
```

## 🛠️ セキュリティテスト

### 自動セキュリティテスト

```typescript
// __tests__/security/xss.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeUserInput } from '../../src/lib/security';

describe('XSS Prevention', () => {
  it('should escape HTML entities', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeUserInput(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });
  
  it('should handle empty input safely', () => {
    expect(sanitizeUserInput('')).toBe('');
    expect(sanitizeUserInput(null as any)).toBe('');
  });
});
```

### ペネトレーションテスト

```bash
# OWASP ZAP を使用したセキュリティテスト
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000/beaver \
  -J zap-report.json
```

## 📋 セキュリティチェックリスト

### 開発時チェックリスト

- [ ] 機密情報を環境変数で管理
- [ ] 入力値をZodスキーマで検証
- [ ] HTMLエスケープを実装
- [ ] HTTPS通信を強制
- [ ] セキュリティヘッダーを設定
- [ ] 依存関係の脆弱性をチェック
- [ ] レート制限を実装
- [ ] CSP ヘッダーを設定

### デプロイ時チェックリスト

- [ ] 本番環境でHTTPS有効
- [ ] セキュリティヘッダー確認
- [ ] 不要なファイルを除外
- [ ] 機密情報のローテーション
- [ ] モニタリング設定
- [ ] エラーハンドリング確認
- [ ] ログ設定確認

## 🚨 インシデント対応

### セキュリティインシデント対応プロセス

1. **検知・報告**
   - 自動モニタリング
   - 手動報告

2. **初期対応**
   ```bash
   # 影響範囲の特定
   # 緊急対策の実施
   # ステークホルダーへの通知
   ```

3. **詳細調査**
   - ログ分析
   - 影響評価
   - 根本原因分析

4. **修復・復旧**
   - 脆弱性修正
   - システム復旧
   - 動作確認

5. **事後対応**
   - 報告書作成
   - 再発防止策
   - プロセス改善

### 緊急連絡先

```typescript
// src/config/security.ts
export const securityConfig = {
  contacts: {
    securityTeam: 'security@example.com',
    emergencyPhone: '+1-555-0123',
    escalationPath: [
      'security-lead@example.com',
      'cto@example.com',
      'ceo@example.com'
    ]
  },
  
  responseTime: {
    critical: '1 hour',
    high: '4 hours', 
    medium: '1 day',
    low: '1 week'
  }
};
```

## 📚 参考資料

### セキュリティ標準

- **OWASP Top 10** - Webアプリケーション脆弱性
- **NIST Cybersecurity Framework** - セキュリティフレームワーク
- **CIS Controls** - セキュリティ管理策
- **SANS Top 25** - 最も危険なソフトウェアエラー

### 学習リソース

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security Guidelines](https://www.typescriptlang.org/docs/)