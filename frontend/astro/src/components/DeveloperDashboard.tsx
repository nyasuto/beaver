import React from 'react';
import UrgentTasks from './UrgentTasks';
import QuickSearch from './QuickSearch';
import CategoryShortcuts from './CategoryShortcuts';
import type { Issue, Statistics, WorkflowMetrics, DailyMetrics, ActionItem } from '../types/beaver';

interface DeveloperDashboardProps {
  issues: Issue[];
  statistics: Statistics;
  className?: string;
}

// Legacy functions for fallback when backend data is not available
function getWorkflowMetricsFallback(issues: Issue[]) {
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
    new_this_week: thisWeekIssues.length,
    recently_updated: recentlyUpdated.length,
    total_open: openIssues.length,
    closed_this_week: closedThisWeek.length,
    weekly_velocity: closedThisWeek.length > 0 ? closedThisWeek.length : 0
  };
}

function getDailyMetricsFallback(issues: Issue[]) {
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
    new_today: newToday.length,
    updated_today: updatedToday.length,
    closed_today: closedToday.length,
    has_activity: hasActivity
  };
}

function getNextActionsFallback(issues: Issue[]): ActionItem[] {
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
  
  // Use backend data when available, fallback to frontend calculations
  const metrics = statistics.workflow_metrics || getWorkflowMetricsFallback(issues);
  const dailyMetrics = statistics.daily_metrics || getDailyMetricsFallback(issues);
  const nextActions = statistics.next_actions || getNextActionsFallback(issues);

  return (
    <div className={`space-y-8 ${className}`}>
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
                  {metrics.total_open}
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">
                  アクティブIssue
                </div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.weekly_velocity}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  今週の完了数
                </div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {metrics.recently_updated}
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