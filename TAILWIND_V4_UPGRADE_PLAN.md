# 🎨 TailwindCSS v4 升級計画と実装

## 📋 概要

現在のプロジェクトでは、Dependabot により TailwindCSS v3.4.17 から v4.1.11 への自動アップデートが実行されましたが、**メジャーバージョンアップに伴う破壊的変更**により、CI/CDパイプラインで失敗が発生しています。

**関連PR**: #62

## 🔍 現在の状況

### ✅ 現在の構成
- **TailwindCSS**: v4.1.11 (Dependabotにより更新済み)
- **Astro統合**: @astrojs/tailwind v6.0.2
- **設定ファイル**: `tailwind.config.mjs` (v4対応形式)
- **CSS**: 従来の `@tailwind` 記法使用

### ❌ 問題点
- **廃止されたプラグイン**: 以下のプラグインが v4 で削除
  - `@tailwindcss/typography` (v0.5.15)
  - `@tailwindcss/forms` (v0.5.9)
  - `@tailwindcss/aspect-ratio` (v0.4.2)
  - `@tailwindcss/container-queries` (v0.1.1)
- **設定ファイル**: `require()` 文がv4では動作しない
- **CSS記法**: `@import` 記法が推奨されている

## 🎯 升級計画

### Phase 1: 緊急対応（即座実行）
**目標**: CI/CDパイプラインの安定化

#### 1.1 現在のPR#62の対応
- [ ] PR#62 を一時的にクローズ
- [ ] TailwindCSS v3.4.17 への回帰実施
- [ ] CI/CDパイプラインの動作確認

#### 1.2 Dependabot設定の更新
- [ ] `.github/dependabot.yml` でTailwindCSS v4の自動更新を無効化
- [ ] TailwindCSS v3系の最新版への更新を継続

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    ignore:
      - dependency-name: "tailwindcss"
        versions: [">=4.0.0"]
```

#### 1.3 安定性確認
- [ ] `make quality` コマンドの実行確認
- [ ] `make build` コマンドの実行確認
- [ ] GitHub Actions の成功確認

### Phase 2: 段階的移行準備（1-2週間）
**目標**: TailwindCSS v4対応の準備とテスト

#### 2.1 専用ブランチでの作業開始
- [ ] `feature/tailwind-v4-upgrade` ブランチ作成
- [ ] 移行作業の開始

#### 2.2 プラグインの削除と依存関係の整理
- [ ] 不要なプラグインの削除
```bash
npm uninstall @tailwindcss/typography @tailwindcss/forms @tailwindcss/aspect-ratio @tailwindcss/container-queries
```

#### 2.3 設定ファイルの更新
- [ ] `tailwind.config.mjs` の plugins 配列を削除
- [ ] v4で廃止されたプラグイン設定の削除確認

```javascript
// tailwind.config.mjs (更新後)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 既存の設定を保持
    },
  },
  plugins: [], // 空配列に変更
};
```

#### 2.4 CSS記法の更新
- [ ] `src/styles/global.css` の更新
- [ ] `@tailwind` から `@import` への変更

```css
/* global.css (更新後) */
@import "tailwindcss";

/* 既存の @layer 設定はそのまま保持 */
@layer base {
  /* 現在の設定を保持 */
}
```

### Phase 3: 機能テストと検証（2-3週間）
**目標**: 全機能の動作確認とパフォーマンス検証

#### 3.1 コンポーネントの動作確認
- [ ] Banner コンポーネントの表示確認
- [ ] Chart コンポーネントの動作確認
- [ ] Navigation コンポーネントの動作確認
- [ ] ダークモード切り替えの動作確認

#### 3.2 レスポンシブデザインの確認
- [ ] モバイル表示の確認
- [ ] タブレット表示の確認
- [ ] デスクトップ表示の確認

#### 3.3 パフォーマンステスト
- [ ] ビルド時間の比較
- [ ] バンドルサイズの比較
- [ ] 初期化時間の比較

#### 3.4 品質チェック
- [ ] `make quality` での全チェック実行
- [ ] TypeScript型チェック
- [ ] ESLint チェック
- [ ] テスト実行

### Phase 4: 本番デプロイ準備（3-4週間）
**目標**: 本番環境への安全なデプロイ

#### 4.1 CI/CDパイプラインでの検証
- [ ] GitHub Actions での動作確認
- [ ] すべてのワークフローの成功確認
- [ ] デプロイプロセスの検証

#### 4.2 プルリクエストの作成
- [ ] 詳細な変更内容の説明
- [ ] Before/After スクリーンショット
- [ ] パフォーマンス比較データ

#### 4.3 レビューと承認
- [ ] コードレビュー
- [ ] 機能テスト
- [ ] 承認とマージ

## 📊 技術的詳細

### 破壊的変更の詳細

#### 1. プラグインの統合
| プラグイン | v3での状態 | v4での状態 |
|-----------|------------|------------|
| Typography | 外部プラグイン | コア統合 |
| Forms | 外部プラグイン | コア統合 |
| Aspect Ratio | 外部プラグイン | コア統合 |
| Container Queries | 外部プラグイン | コア統合 |

#### 2. 設定ファイルの変更
```javascript
// v3 (現在) - 動作しない
plugins: [
  require('@tailwindcss/typography'),
  require('@tailwindcss/forms'),
  require('@tailwindcss/aspect-ratio'),
  require('@tailwindcss/container-queries'),
],

// v4 (更新後) - 空配列
plugins: [],
```

#### 3. CSS記法の変更
```css
/* v3 (現在) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 (推奨) */
@import "tailwindcss";
```

### 影響を受けるファイル

#### 設定ファイル
- [ ] `package.json` - 依存関係の更新
- [ ] `tailwind.config.mjs` - プラグイン設定の削除
- [ ] `src/styles/global.css` - CSS記法の更新

#### 可能性のある影響
- [ ] `src/components/` - コンポーネントのスタイリング
- [ ] `src/pages/` - ページのスタイリング
- [ ] `src/layouts/` - レイアウトのスタイリング

## 🚨 リスク評価

### 🔴 高リスク
- **UIの崩れ**: 一部のスタイルが予期しない動作をする可能性
- **ビルド失敗**: 設定ミスによるビルドエラー

### 🟡 中リスク
- **パフォーマンス変化**: CSS生成アルゴリズムの変更
- **開発体験**: 新しい設定に慣れるまでの時間

### 🟢 低リスク
- **既存機能**: 基本的なTailwindCSS機能は維持
- **設定変更**: 設定ファイルの変更は比較的単純

## 🎯 成功指標

### 技術指標
- [ ] ビルド時間: <30秒 (現在と同等)
- [ ] バンドルサイズ: ±5% (現在と同等)
- [ ] 型チェック: 100% 成功
- [ ] テスト: 100% 成功

### 品質指標
- [ ] Lighthouse Score: >90 (現在と同等)
- [ ] アクセシビリティ: 現在のレベル維持
- [ ] レスポンシブ: 全デバイスで正常動作

## 📝 作業手順

### 1. 即座実行 (今日)
```bash
# 現在のPRをクローズ
gh pr close 62

# v3への回帰
npm install tailwindcss@^3.4.17
npm install

# 動作確認
make quality
make build
```

### 2. 段階的移行 (来週開始)
```bash
# 作業ブランチ作成
git checkout -b feature/tailwind-v4-upgrade

# プラグイン削除
npm uninstall @tailwindcss/typography @tailwindcss/forms @tailwindcss/aspect-ratio @tailwindcss/container-queries

# TailwindCSS v4インストール
npm install tailwindcss@^4.1.11

# 設定ファイル更新
# (手動でtailwind.config.mjsとglobal.cssを更新)

# テスト実行
make quality
make build
```

### 3. 検証とテスト
```bash
# 開発サーバー起動
make dev

# 全機能のテスト
# - UI表示確認
# - インタラクション確認
# - レスポンシブ確認

# 品質チェック
make quality
```

## 📅 スケジュール

| Phase | 期間 | 主な作業 |
|-------|------|----------|
| Phase 1 | 即座 | 緊急対応、v3回帰 |
| Phase 2 | 1週間 | 設定更新、プラグイン削除 |
| Phase 3 | 2週間 | 機能テスト、検証 |
| Phase 4 | 1週間 | 本番デプロイ準備 |

## 🔧 サポートとメンテナンス

### ドキュメント更新
- [ ] README.mdの更新
- [ ] CLAUDE.mdの更新
- [ ] 開発者向けガイドの更新

### 継続的メンテナンス
- [ ] TailwindCSS v4のアップデート対応
- [ ] 新機能の活用検討
- [ ] パフォーマンス最適化

## 💡 追加の改善提案

### 1. CSS最適化
- [ ] unused CSS の削除
- [ ] critical CSS の分離
- [ ] カスタムプロパティの活用

### 2. 開発体験向上
- [ ] 開発用スタイルガイドの作成
- [ ] コンポーネントライブラリの整理
- [ ] デザインシステムの構築

### 3. パフォーマンス向上
- [ ] JIT モードの活用
- [ ] 動的インポートの最適化
- [ ] バンドルサイズの最小化

---

**このIssueは [PR #62](https://github.com/nyasuto/beaver/pull/62) の解決と、TailwindCSS v4への段階的移行を目的としています。**

**担当者**: @nyasuto
**優先度**: 高 (CI/CDパイプラインの安定化が必要)
**ラベル**: `enhancement`, `dependencies`, `breaking-change`