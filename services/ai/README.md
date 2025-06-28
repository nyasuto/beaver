# AI Classification Service

GitHub Issues自動分類用のPython AIサービス

## 概要

LangChain + OpenAI APIを使用したZero-shot分類エンジン。5つの基本カテゴリでGitHub Issuesを自動分類します。

## セットアップ

### 1. 環境設定
```bash
cd services/ai
cp .env.example .env
# .envファイルでOPENAI_API_KEYを設定
```

### 2. 起動
```bash
./start.sh
```

## API仕様

- `GET /health` - ヘルスチェック
- `POST /classify` - 単一Issue分類  
- `POST /batch-classify` - バッチ分類

## 分類カテゴリ

- `bug-fix` - バグ修正・エラー解決
- `feature-request` - 新機能・改善要求
- `architecture` - システム設計・構造
- `learning` - 学習・調査・研究
- `troubleshooting` - サポート・問題解決
EOF < /dev/null