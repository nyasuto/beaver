import React from 'react';
import UrgentTasks from './UrgentTasks';
import QuickSearch from './QuickSearch';
import CategoryShortcuts from './CategoryShortcuts';
import type { Issue, Statistics } from '../types/beaver';

interface DeveloperDashboardProps {
  issues: Issue[];
  statistics: Statistics;
  className?: string;
}

function getWorkflowMetrics(issues: Issue[]) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const thisWeekIssues = issues.filter(issue => 
    new Date(issue.created_at) >= oneWeekAgo
  );
  
  const recentlyUpdated = issues.filter(issue => 
    issue.updated_at && new Date(issue.updated_at) >= oneWeekAgo
  );
  
  const openIssues = issues.filter(issue => issue.state === 'open');
  const closedThisWeek = issues.filter(issue => 
    issue.state === 'closed' && 
    issue.updated_at && 
    new Date(issue.updated_at) >= oneWeekAgo
  );

  return {
    newThisWeek: thisWeekIssues.length,
    recentlyUpdated: recentlyUpdated.length,
    totalOpen: openIssues.length,
    closedThisWeek: closedThisWeek.length,
    weeklyVelocity: closedThisWeek.length > 0 ? closedThisWeek.length : 0
  };
}

function getDailyMetrics(issues: Issue[]) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const newToday = issues.filter(issue => 
    new Date(issue.created_at) >= twentyFourHoursAgo
  );
  
  const updatedToday = issues.filter(issue => 
    issue.updated_at && new Date(issue.updated_at) >= twentyFourHoursAgo
  );
  
  const closedToday = issues.filter(issue => 
    issue.state === 'closed' && 
    issue.updated_at && 
    new Date(issue.updated_at) >= twentyFourHoursAgo
  );
  
  const hasActivity = newToday.length > 0 || updatedToday.length > 0 || closedToday.length > 0;
  
  return {
    newToday: newToday.length,
    updatedToday: updatedToday.length,
    closedToday: closedToday.length,
    hasActivity
  };
}

function getNextActions(issues: Issue[]): string[] {
  const actions: string[] = [];
  
  // Check for critical/high priority issues
  const criticalIssues = issues.filter(issue => {
    const labels = (issue.labels || []).join(' ').toLowerCase();
    return issue.state === 'open' && (
      labels.includes('critical') || 
      labels.includes('urgent') || 
      labels.includes('high')
    );
  });
  
  if (criticalIssues.length > 0) {
    actions.push(`🚨 ${criticalIssues.length}件の緊急対応が必要`);
  }
  
  // Check for stale issues (no updates in 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleIssues = issues.filter(issue => 
    issue.state === 'open' && 
    (!issue.updated_at || new Date(issue.updated_at) < thirtyDaysAgo)
  );
  
  if (staleIssues.length > 0) {
    actions.push(`📅 ${staleIssues.length}件の長期停滞Issues要確認`);
  }
  
  // Check for bugs
  const bugIssues = issues.filter(issue => {
    const labels = (issue.labels || []).join(' ').toLowerCase();
    return issue.state === 'open' && labels.includes('bug');
  });
  
  if (bugIssues.length > 0) {
    actions.push(`🐛 ${bugIssues.length}件のバグ修正待ち`);
  }
  
  // Check for feature requests
  const featureIssues = issues.filter(issue => {
    const labels = (issue.labels || []).join(' ').toLowerCase();
    return issue.state === 'open' && (
      labels.includes('feature') || 
      labels.includes('enhancement')
    );
  });
  
  if (featureIssues.length > 0) {
    actions.push(`✨ ${featureIssues.length}件の新機能実装待ち`);
  }
  
  if (actions.length === 0) {
    actions.push('✅ 緊急対応事項はありません');
  }
  
  return actions.slice(0, 4); // Show max 4 actions
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ 
  issues, 
  statistics, 
  className = '' 
}) => {
  const metrics = getWorkflowMetrics(issues);
  const dailyMetrics = getDailyMetrics(issues);
  const nextActions = getNextActions(issues);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Quick Actions Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            🎯 今日のアクション
          </h3>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {new Date().toLocaleDateString('ja-JP', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* 推奨アクション - 横並びに */}
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
              📋 推奨アクション
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nextActions.map((action, index) => (
                <div key={index} className="text-sm text-blue-700 dark:text-blue-300 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  {action}
                </div>
              ))}
            </div>
          </div>
          
          {/* 進捗情報を横並びに */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 日次進捗（活動がある場合のみ表示） */}
            {dailyMetrics.hasActivity && (
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  🌟 本日の進捗（24h）
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="font-bold text-green-600">{dailyMetrics.newToday}</div>
                    <div className="text-gray-600 dark:text-gray-400">新規</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="font-bold text-blue-600">{dailyMetrics.updatedToday}</div>
                    <div className="text-gray-600 dark:text-gray-400">更新</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="font-bold text-purple-600">{dailyMetrics.closedToday}</div>
                    <div className="text-gray-600 dark:text-gray-400">完了</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 週次進捗 */}
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                📊 今週の進捗
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="font-bold text-green-600">{metrics.newThisWeek}</div>
                  <div className="text-gray-600 dark:text-gray-400">新規</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="font-bold text-blue-600">{metrics.closedThisWeek}</div>
                  <div className="text-gray-600 dark:text-gray-400">完了</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Urgent Tasks */}
          <UrgentTasks issues={issues} />
          
          {/* Quick Search */}
          <QuickSearch issues={issues} />
        </div>
        
        {/* Right Column */}
        <div className="space-y-8">
          {/* Category Shortcuts */}
          <CategoryShortcuts issues={issues} />
          
          {/* Workflow Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              📈 ワークフロー統計
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {metrics.totalOpen}
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">
                  アクティブIssue
                </div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.weeklyVelocity}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  今週の完了数
                </div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {metrics.recentlyUpdated}
                </div>
                <div className="text-sm text-purple-800 dark:text-purple-300">
                  最近更新
                </div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {Math.round((statistics.health_score || 0) * 100)}%
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-300">
                  プロジェクト健全度
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default DeveloperDashboard;