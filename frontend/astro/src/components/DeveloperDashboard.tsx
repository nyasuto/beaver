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
        
        {/* メトリクス重視ダッシュボード - 4列グリッド */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* 緊急対応カード */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {nextActions.filter(action => action.includes('緊急')).length || 
               nextActions.filter(action => action.includes('件')).map(action => {
                 const match = action.match(/(\d+)件/);
                 return match ? parseInt(match[1]) : 0;
               }).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-red-800 dark:text-red-300 font-medium">🚨 緊急対応</div>
          </div>

          {/* 本日新規カード */}
          {dailyMetrics.hasActivity && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {dailyMetrics.newToday}
              </div>
              <div className="text-xs text-green-800 dark:text-green-300 font-medium">📈 本日新規</div>
            </div>
          )}

          {/* 本日完了カード */}
          {dailyMetrics.hasActivity && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dailyMetrics.closedToday}
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">✅ 本日完了</div>
            </div>
          )}

          {/* 今週の完了数カード */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.closedThisWeek}
            </div>
            <div className="text-xs text-purple-800 dark:text-purple-300 font-medium">🎯 今週完了</div>
          </div>
        </div>

        {/* 推奨アクション詳細 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <span className="text-lg mr-2">💡</span>
            <h4 className="font-semibold text-blue-800 dark:text-blue-200">推奨アクション</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nextActions.map((action, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-blue-100 dark:border-blue-900">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {action}
                </div>
              </div>
            ))}
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