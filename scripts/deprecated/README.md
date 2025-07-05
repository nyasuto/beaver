# 🗂️ Deprecated Scripts

この フォルダには廃止予定のスクリプトが含まれています。

## ⚠️ 廃止スケジュール

**廃止日**: 2025年8月末（予定）

## 📋 廃止対象スクリプト

| スクリプト名 | 廃止理由 | 代替手段 |
|-------------|---------|---------|
| `build-astro-integrated.sh` | 重複機能 | `../build/build-integrated.sh` |
| `deployment.sh` | 機能統合済み | `../core/ci-beaver.sh` |
| `github-integration.sh` | 未使用 | GitHub CLI (`gh`) コマンド |
| `ci-checks.sh` | 重複機能 | `Makefile` targets |
| `release-builder.sh` | 機能統合済み | `../core/release.sh` |
| `beaver-automation.sh` | 機能統合済み | `../core/ci-beaver.sh` |
| `test-wiki-workflow.sh` | 移動予定 | `../testing/` (将来) |

## 🚨 重要な注意事項

**これらのスクリプトは現在使用されておらず、将来のバージョンで削除される予定です。**

新しい機能開発には代替手段を使用してください。

## 🔗 新しいスクリプト構造

```
scripts/
├── core/           # 重要なスクリプト
├── build/          # ビルド関連
├── testing/        # テスト関連
├── dev-tools/      # 開発ツール
└── deprecated/     # このフォルダ
```

詳細は [スクリプト整理ドキュメント](../../docs/scripts-reorganization.md) を参照してください。