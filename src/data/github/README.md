# GitHub データディレクトリ

このディレクトリには、GitHub API から取得した静的データが保存されます。

## ファイル構成

```
src/data/github/
├── README.md          # このファイル
├── issues.json        # 全 Issue データ
├── metadata.json      # メタデータ（統計情報、最終更新日時）
└── issues/            # 個別 Issue データ
    ├── 1.json         # Issue #1 のデータ
    ├── 2.json         # Issue #2 のデータ
    └── ...
```

## データ生成方法

データは以下のコマンドで生成・更新されます：

```bash
# データの取得と保存
npm run fetch-data

# または直接実行
tsx scripts/fetch-github-data.ts
```

## 必要な環境変数

```bash
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=repository_owner
GITHUB_REPO=repository_name
```

## 自動更新

GitHub Actions により以下のタイミングで自動更新されます：

- 毎日午前6時（JST）
- 手動実行
- Pull Request のマージ時

## データ利用方法

Astro ページからは以下のように利用します：

```typescript
import { getStaticIssues, getStaticMetadata } from '@/lib/data/github';

const issues = getStaticIssues();
const metadata = getStaticMetadata();
```

## 注意事項

- このディレクトリのファイルは自動生成されるため、手動で編集しないでください
- GitHub API のレート制限に注意してください
- 大量のデータがある場合は、適切なページネーション戦略を検討してください
