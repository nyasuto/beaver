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

interface ActionItem {
  text: string;
  issues: Issue[];
  type: 'critical' | 'stale' | 'bug' | 'feature' | 'none';
}

function getNextActions(issues: Issue[]): ActionItem[] {
  const actions: ActionItem[] = [];
  
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
    actions.push({
      text: `🚨 ${criticalIssues.length}件の緊急対応が必要`,
      issues: criticalIssues.slice(0, 5), // Show max 5 issues in hover
      type: 'critical'
    });
  }
  
  // Check for stale issues (no updates in 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleIssues = issues.filter(issue => 
    issue.state === 'open' && 
    (!issue.updated_at || new Date(issue.updated_at) < thirtyDaysAgo)
  );
  
  if (staleIssues.length > 0) {
    actions.push({
      text: `📅 ${staleIssues.length}件の長期停滞Issues要確認`,
      issues: staleIssues.slice(0, 5),
      type: 'stale'
    });
  }
  
  // Check for bugs
  const bugIssues = issues.filter(issue => {
    const labels = (issue.labels || []).join(' ').toLowerCase();
    return issue.state === 'open' && labels.includes('bug');
  });
  
  if (bugIssues.length > 0) {
    actions.push({
      text: `🐛 ${bugIssues.length}件のバグ修正待ち`,
      issues: bugIssues.slice(0, 5),
      type: 'bug'
    });
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
    actions.push({
      text: `✨ ${featureIssues.length}件の新機能実装待ち`,
      issues: featureIssues.slice(0, 5),
      type: 'feature'
    });
  }
  
  if (actions.length === 0) {
    actions.push({
      text: '✅ 緊急対応事項はありません',
      issues: [],
      type: 'none'
    });
  }
  
  return actions.slice(0, 4); // Show max 4 actions
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ 
  issues, 
  statistics, 
  className = '' 
}) => {
  const [hoveredAction, setHoveredAction] = React.useState<number | null>(null);
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
        
        {/* 3列レイアウト - カード形式統一 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 推奨アクション - 2列分 */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-full">
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">📋</span>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">推奨アクション</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nextActions.map((action, index) => (
                  <div 
                    key={index} 
                    className="relative bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 border-l-4 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredAction(index)}
                    onMouseLeave={() => setHoveredAction(null)}
                  >
                    <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      {action.text}
                    </div>
                    
                    {/* Hover Preview */}
                    {hoveredAction === index && action.issues.length > 0 && (
                      <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 p-4">
                        <div className="text-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {action.type === 'critical' ? '🚨 緊急対応' : 
                               action.type === 'stale' ? '📅 長期停滞' :
                               action.type === 'bug' ? '🐛 バグ修正' :
                               action.type === 'feature' ? '✨ 新機能' : '詳細'}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {action.issues.length}件
                            </span>
                          </div>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {action.issues.map((issue) => (
                              <div
                                key={issue.id}
                                className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                onClick={() => window.open(issue.html_url, '_blank')}
                              >
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium">#{issue.number}</span>
                                  <span className={`px-1 py-0.5 rounded ${ 
                                    action.type === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                    action.type === 'stale' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                    action.type === 'bug' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  }`}>
                                    {action.type === 'critical' ? 'CRITICAL' :
                                     action.type === 'stale' ? 'STALE' :
                                     action.type === 'bug' ? 'BUG' :
                                     'FEATURE'}
                                  </span>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {issue.title}
                                </div>
                                {issue.labels && issue.labels.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {issue.labels.slice(0, 2).map((label) => (
                                      <span
                                        key={label}
                                        className="text-xs px-1 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                    {issue.labels.length > 2 && (
                                      <span className="text-xs text-gray-500">+{issue.labels.length - 2}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
                            <div className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                              クリックで Issue 詳細を表示 →
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 進捗サマリー - 1列分 */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-full">
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">📊</span>
                <h4 className="font-medium text-gray-800 dark:text-gray-200">進捗サマリー</h4>
              </div>
              <div className="space-y-4">
                {/* 日次進捗（活動がある場合のみ表示） */}
                {dailyMetrics.hasActivity && (
                  <div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                      🌟 本日（24h）
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
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
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    📈 今週
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                      <div className="font-bold text-green-600">{metrics.newThisWeek}</div>
                      <div className="text-gray-600 dark:text-gray-400">新規</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                      <div className="font-bold text-blue-600">{metrics.closedThisWeek}</div>
                      <div className="text-gray-600 dark:text-gray-400">完了</div>
                    </div>
                  </div>
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
                  {Math.round(statistics.health_score || 0)}%
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