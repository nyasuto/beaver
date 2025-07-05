# Components Package

このパッケージには、Beaverの全ページで共通して使用されるUIコンポーネントが含まれています。

## Header Component

全ページで統一されたヘッダーバナーを提供します。

### 使用方法

```go
package main

import (
    "github.com/nyasuto/beaver/pkg/components"
)

func generatePage() string {
    headerGen := components.NewHeaderGenerator()
    
    // 基本的な使用法
    options := components.HeaderOptions{
        CurrentPage: "coverage",  // 現在のページ (home, issues, coverage, etc.)
        BaseURL:     "../",       // ナビゲーションのベースURL
    }
    
    header := headerGen.GenerateHeader(options)
    
    // HTMLテンプレートに組み込む
    html := `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Your Page</title>
    ` + headerGen.GetTailwindCSSCDN() + `
    <style>
        ` + headerGen.GetHeaderCSS() + `
        /* Your custom styles */
    </style>
</head>
<body>
    ` + header + `
    <!-- Your page content -->
</body>
</html>`
    
    return html
}
```

### 追加ナビゲーション項目

```go
options := components.HeaderOptions{
    CurrentPage: "custom",
    BaseURL:     "../",
    ExtraNavItems: []components.NavItem{
        {Label: "GitHub", URL: "https://github.com/nyasuto/beaver", IsExternal: true},
        {Label: "API", URL: "../api/", IsExternal: false},
    },
}
```

### 対応ページ

- `home` - ホームページ
- `issues` - Issuesページ  
- `coverage` - カバレッジダッシュボード
- その他 - カスタムページ（ハイライトなし）

### 特徴

- **統一されたデザイン**: メインサイトと同じTailwind CSSベースのデザイン
- **レスポンシブ**: モバイル対応
- **ダークモード対応**: 自動的にダークモードを検出
- **柔軟なナビゲーション**: 追加のナビゲーション項目をサポート
- **アクティブページハイライト**: 現在のページを視覚的に強調

### 依存関係

- Tailwind CSS (CDN経由)
- 現代的なブラウザ (CSS Grid, Flexbox対応)

## 今後の拡張

このパッケージには以下のコンポーネントを追加予定:

- **Footer Component**: 統一されたフッター
- **Navigation Component**: より高度なナビゲーション機能
- **Theme Component**: テーマ切り替え機能
- **Alert Component**: 通知・アラートコンポーネント