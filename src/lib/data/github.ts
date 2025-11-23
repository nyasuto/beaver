/**
 * GitHub 静的データ読み込み機能
 *
 * scripts/fetch-github-data.ts で生成された静的データを
 * 型安全に読み込むためのユーティリティ関数群
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { IssueSchema } from '@/lib/schemas/github';
import { z } from 'zod';

// メタデータのスキーマ定義
const MetadataSchema = z.object({
  lastUpdated: z.string().datetime(),
  repository: z.object({
    owner: z.string(),
    name: z.string(),
  }),
  statistics: z.object({
    issues: z.object({
      total: z.number(),
      open: z.number(),
      closed: z.number(),
    }),
    pullRequests: z.object({
      total: z.number(),
      open: z.number(),
      closed: z.number(),
    }),
    labels: z.number(),
  }),
  labelCounts: z.record(z.string(), z.number()),
  lastIssue: IssueSchema.nullable(),
  lastPullRequest: z.any().optional().nullable(), // Pull Request schema is complex, allow flexible validation
});

const IssuesArraySchema = z.array(IssueSchema);

export type GitHubMetadata = z.infer<typeof MetadataSchema>;
export type GitHubIssue = z.infer<typeof IssueSchema>;

/**
 * データファイルのパスを取得
 */
function getDataPath(filename: string): string {
  return join(process.cwd(), 'src/data/github', filename);
}

/**
 * JSON ファイルを安全に読み込む
 */
function readJsonFile<T>(filePath: string, schema: z.ZodSchema<T>): T {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`データファイルが見つかりません: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Zod スキーマによる検証
    return schema.parse(jsonData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('データ検証エラー:', error.issues);
      throw new Error(`データ形式が不正です: ${filePath}`);
    }
    throw error;
  }
}

/**
 * 全 Issue データを取得
 *
 * @returns 検証済みの Issue データ配列
 * @throws データファイルが存在しない、または形式が不正な場合
 */
export function getStaticIssues(): GitHubIssue[] {
  const filePath = getDataPath('issues.json');
  return readJsonFile(filePath, IssuesArraySchema);
}

/**
 * メタデータを取得
 *
 * @returns 検証済みのメタデータ
 * @throws データファイルが存在しない、または形式が不正な場合
 */
export function getStaticMetadata(): GitHubMetadata {
  const filePath = getDataPath('metadata.json');
  return readJsonFile(filePath, MetadataSchema);
}

/**
 * 特定の Issue を番号で取得
 *
 * @param issueNumber Issue 番号
 * @returns Issue データ、または undefined
 */
export function getStaticIssueById(issueNumber: number): GitHubIssue | undefined {
  const filePath = getDataPath(`issues/${issueNumber}.json`);

  try {
    return readJsonFile(filePath, IssueSchema);
  } catch {
    // 個別ファイルが見つからない場合は、全データから検索
    const issues = getStaticIssues();
    return issues.find(issue => issue.number === issueNumber);
  }
}

/**
 * Pull Request を除外して Issue のみを取得
 *
 * @returns Pull Request を除外した Issue データ配列
 */
export function getIssuesOnly(): GitHubIssue[] {
  const issues = getStaticIssues();
  return issues.filter(issue => !issue.pull_request);
}

/**
 * オープンな Issue のみを取得（Pull Request を除外）
 *
 * @returns オープンな Issue データ配列
 */
export function getOpenIssues(): GitHubIssue[] {
  const issues = getIssuesOnly();
  return issues.filter(issue => issue.state === 'open');
}

/**
 * クローズされた Issue のみを取得（Pull Request を除外）
 *
 * @returns クローズされた Issue データ配列
 */
export function getClosedIssues(): GitHubIssue[] {
  const issues = getIssuesOnly();
  return issues.filter(issue => issue.state === 'closed');
}

/**
 * 特定のラベルを持つ Issue を取得（Pull Request を除外）
 *
 * @param labelName ラベル名
 * @returns 指定されたラベルを持つ Issue データ配列
 */
export function getIssuesByLabel(labelName: string): GitHubIssue[] {
  const issues = getIssuesOnly();
  return issues.filter(issue => issue.labels.some(label => label.name === labelName));
}

/**
 * Issue を作成日時でソート
 *
 * @param issues Issue データ配列
 * @param order ソート順序 ('asc' | 'desc')
 * @returns ソート済みの Issue データ配列
 */
export function sortIssuesByDate(
  issues: GitHubIssue[],
  order: 'asc' | 'desc' = 'desc'
): GitHubIssue[] {
  return [...issues].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);

    if (order === 'asc') {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });
}

/**
 * Issue を更新日時でソート
 *
 * @param issues Issue データ配列
 * @param order ソート順序 ('asc' | 'desc')
 * @returns ソート済みの Issue データ配列
 */
export function sortIssuesByUpdatedDate(
  issues: GitHubIssue[],
  order: 'asc' | 'desc' = 'desc'
): GitHubIssue[] {
  return [...issues].sort((a, b) => {
    const dateA = new Date(a.updated_at);
    const dateB = new Date(b.updated_at);

    if (order === 'asc') {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });
}

/**
 * データの最終更新日時を取得
 *
 * @returns 最終更新日時の Date オブジェクト
 */
export function getLastUpdated(): Date {
  const metadata = getStaticMetadata();
  return new Date(metadata.lastUpdated);
}

/**
 * データが存在するかどうかを確認
 *
 * @returns データファイルが存在し、読み込み可能な場合 true
 */
export function hasStaticData(): boolean {
  try {
    const issuesPath = getDataPath('issues.json');
    const metadataPath = getDataPath('metadata.json');

    return existsSync(issuesPath) && existsSync(metadataPath);
  } catch {
    return false;
  }
}

/**
 * 現在の環境設定と静的データのリポジトリが一致するかを確認
 *
 * @returns リポジトリが一致する場合、または設定が見つからない場合 true
 */
export function isDataRepositoryMatched(): boolean {
  try {
    // 静的データが存在しない場合は一致していると見なす
    if (!hasStaticData()) {
      return true;
    }

    const metadata = getStaticMetadata();

    // 環境変数から現在の設定を取得
    const currentOwner = process.env['GITHUB_OWNER'] || 'nyasuto';
    const currentRepo = process.env['GITHUB_REPO'] || 'beaver';

    // リポジトリ情報が一致するかチェック
    return metadata.repository.owner === currentOwner && metadata.repository.name === currentRepo;
  } catch (error) {
    console.warn('リポジトリ一致確認でエラーが発生しました:', error);
    // エラーの場合は一致していると見なして警告を表示しない
    return true;
  }
}

/**
 * データの利用可能性を包括的にチェック
 *
 * @returns {object} データの状態情報
 */
export function getDataAvailabilityStatus() {
  const hasData = hasStaticData();
  const isMatched = isDataRepositoryMatched();

  return {
    hasStaticData: hasData,
    isRepositoryMatched: isMatched,
    isDataAvailable: hasData && isMatched,
    shouldShowWarning: hasData && !isMatched,
  };
}

/**
 * フォールバック用のサンプルデータを取得
 *
 * @returns サンプル Issue データ
 */
export function getFallbackIssues(): GitHubIssue[] {
  try {
    const fallbackPath = join(process.cwd(), 'src/data/fixtures/sample-issues.json');
    return readJsonFile(fallbackPath, IssuesArraySchema);
  } catch (error) {
    // フォールバックデータが GitHub API schema と合わない場合は空配列を返す

    console.warn('サンプルデータの読み込みに失敗しました。空のデータを使用します。', error);
    return [];
  }
}

/**
 * 安全にデータを取得（フォールバック付き）
 *
 * @returns Issue データ配列（取得できない場合はフォールバックデータ）
 */
export function getIssuesWithFallback(): GitHubIssue[] {
  try {
    return getStaticIssues();
  } catch (error) {
    console.warn('静的データの読み込みに失敗しました。フォールバックデータを使用します:', error);
    return getFallbackIssues();
  }
}

/**
 * Pull Request を除外した Issue のみを安全に取得（フォールバック付き）
 *
 * @returns Pull Request を除外した Issue データ配列
 */
export function getIssuesOnlyWithFallback(): GitHubIssue[] {
  const issues = getIssuesWithFallback();
  return issues.filter(issue => !issue.pull_request);
}
