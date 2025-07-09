#!/usr/bin/env tsx

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fetchGitHubIssues } from '../src/lib/github/issues.js';
import { GitHubConfigSchema } from '../src/lib/schemas/config.js';
import { z } from 'zod';

/**
 * GitHub API からデータを取得し、静的ファイルとして保存するスクリプト
 * 
 * 使用法:
 * - npm run fetch-data
 * - tsx scripts/fetch-github-data.ts
 * 
 * 必要な環境変数:
 * - GITHUB_TOKEN: GitHub Personal Access Token
 * - GITHUB_OWNER: リポジトリのオーナー名
 * - GITHUB_REPO: リポジトリ名
 */

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_OWNER: z.string().min(1, 'GITHUB_OWNER is required'),
  GITHUB_REPO: z.string().min(1, 'GITHUB_REPO is required'),
});

/**
 * 環境変数の検証
 */
function validateEnvironment() {
  const env = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
  };

  try {
    return EnvSchema.parse(env);
  } catch (error) {
    console.error('❌ 環境変数の設定が不正です:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\n以下の環境変数を設定してください:');
    console.error('  - GITHUB_TOKEN: GitHub Personal Access Token');
    console.error('  - GITHUB_OWNER: リポジトリのオーナー名');
    console.error('  - GITHUB_REPO: リポジトリ名');
    process.exit(1);
  }
}

/**
 * ディレクトリが存在しない場合は作成
 */
function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    console.log(`📁 ディレクトリを作成しました: ${dirPath}`);
  }
}

/**
 * データを JSON ファイルとして保存
 */
function saveJsonFile(filePath: string, data: any, description: string) {
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 ${description}を保存しました: ${filePath}`);
  } catch (error) {
    console.error(`❌ ${description}の保存に失敗しました:`, error);
    throw error;
  }
}

/**
 * GitHub API からデータを取得して静的ファイルとして保存
 */
async function fetchAndSaveGitHubData() {
  console.log('🚀 GitHub データの取得を開始します...');
  
  // 環境変数の検証
  const env = validateEnvironment();
  
  // GitHub 設定の作成
  const config = GitHubConfigSchema.parse({
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    baseUrl: 'https://api.github.com',
  });

  try {
    // データディレクトリの作成
    const dataDir = join(process.cwd(), 'src/data/github');
    ensureDirectoryExists(dataDir);

    // GitHub Issues の取得
    console.log('📥 GitHub Issues を取得中...');
    const issuesResult = await fetchGitHubIssues(config);
    
    if (!issuesResult.success) {
      throw new Error(`GitHub API エラー: ${issuesResult.error.message}`);
    }

    const issues = issuesResult.data;
    console.log(`✅ ${issues.length} 件の Issue を取得しました`);

    // Issues データの保存
    saveJsonFile(
      join(dataDir, 'issues.json'),
      issues,
      'Issues データ'
    );

    // 個別 Issue ファイルの保存
    const issuesDir = join(dataDir, 'issues');
    ensureDirectoryExists(issuesDir);

    for (const issue of issues) {
      saveJsonFile(
        join(issuesDir, `${issue.number}.json`),
        issue,
        `Issue #${issue.number}`
      );
    }

    // 統計情報の計算
    const openIssues = issues.filter(i => i.state === 'open');
    const closedIssues = issues.filter(i => i.state === 'closed');
    const labelCounts = issues.reduce((acc, issue) => {
      issue.labels.forEach(label => {
        acc[label.name] = (acc[label.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // メタデータの保存
    const metadata = {
      lastUpdated: new Date().toISOString(),
      repository: {
        owner: config.owner,
        name: config.repo,
      },
      statistics: {
        total: issues.length,
        open: openIssues.length,
        closed: closedIssues.length,
        labels: Object.keys(labelCounts).length,
      },
      labelCounts,
      lastIssue: issues.length > 0 ? issues[0] : null,
    };

    saveJsonFile(
      join(dataDir, 'metadata.json'),
      metadata,
      'メタデータ'
    );

    // 成功メッセージ
    console.log('\n🎉 GitHub データの取得と保存が完了しました!');
    console.log(`📊 統計情報:`);
    console.log(`   - 総 Issue 数: ${metadata.statistics.total}`);
    console.log(`   - オープン: ${metadata.statistics.open}`);
    console.log(`   - クローズ: ${metadata.statistics.closed}`);
    console.log(`   - ラベル数: ${metadata.statistics.labels}`);
    console.log(`   - 最終更新: ${new Date(metadata.lastUpdated).toLocaleString('ja-JP')}`);

  } catch (error) {
    console.error('❌ データ取得中にエラーが発生しました:', error);
    
    // デバッグ情報の表示
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      if (error.stack) {
        console.error('スタックトレース:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

// スクリプトの実行
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAndSaveGitHubData();
}

export { fetchAndSaveGitHubData };