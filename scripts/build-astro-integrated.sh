#!/bin/bash

# Phase 0: Go + Astro 統合ビルドスクリプト
# このスクリプトはGoバックエンドからデータを生成し、Astroフロントエンドでビルドします

set -e  # エラー時に停止

echo "🚀 Phase 0: Go + Astro 統合ビルド開始"

# 1. Go バックエンドでデータ生成
echo "📊 Go: GitHub Issuesを取得してAstro用データを生成中..."
./bin/beaver build --astro-export

# 2. Astro フロントエンドのセットアップ確認
if [ ! -d "frontend/astro/node_modules" ]; then
    echo "📦 Astro: 依存関係をインストール中..."
    cd frontend/astro && npm install && cd ../..
fi

# 3. Astro ビルド実行
echo "🎨 Astro: 静的サイトをビルド中..."
cd frontend/astro && npm run build && cd ../..

# 4. ビルド結果確認
if [ -d "_site-astro" ]; then
    echo "✅ 統合ビルド完了!"
    echo "📁 出力ディレクトリ: _site-astro/"
    echo "📊 生成されたファイル数: $(find _site-astro -type f | wc -l)"
    
    # 主要ファイルの確認
    if [ -f "_site-astro/index.html" ]; then
        echo "✅ index.html 生成済み"
    fi
    
    if [ -f "frontend/astro/src/data/beaver.json" ]; then
        echo "✅ beaver.json データファイル生成済み"
        ISSUE_COUNT=$(jq '.issues | length' frontend/astro/src/data/beaver.json)
        echo "📊 処理されたIssue数: ${ISSUE_COUNT}"
    fi
else
    echo "❌ ビルドに失敗しました"
    exit 1
fi

echo "🦫 Phase 0 統合ビルド完了!"
echo ""
echo "次のステップ:"
echo "  📖 ローカル確認: cd frontend/astro && npm run preview"
echo "  🚀 GitHub Pages デプロイ: _site-astro/ 内容をコピー"