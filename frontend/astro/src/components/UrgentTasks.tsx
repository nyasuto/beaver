import React from 'react';
import type { Issue } from '../types/beaver';
import { extractMarkdownSummary } from '../utils/markdown';

interface UrgentTasksProps {
  issues: Issue[];
  className?: string;
}

interface PriorityConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  action: string;
  icon: string;
}

const priorityConfig: Record<string, PriorityConfig> = {
  critical: {
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    action: '即時対応',
    icon: '🚨'
  },
  high: {
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    action: '今日中',
    icon: '⚠️'
  },
  medium: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    action: '今週中',
    icon: '📋'
  },
  low: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    action: '計画的に',
    icon: '📝'
  }
};

function getPriorityFromLabels(labels: string[]): string {
  if (!labels) return 'low';
  
  const labelText = labels.join(' ').toLowerCase();
  
  if (labelText.includes('critical') || labelText.includes('urgent')) return 'critical';
  if (labelText.includes('high') || labelText.includes('important')) return 'high';
  if (labelText.includes('medium') || labelText.includes('moderate')) return 'medium';
  
  return 'low';
}

function getUrgentTasks(issues: Issue[]): Issue[] {
  // Filter and sort issues by priority
  const issuesWithPriority = issues
    .filter(issue => issue.state === 'open')
    .map(issue => ({
      ...issue,
      priority: getPriorityFromLabels(issue.labels || [])
    }))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return issuesWithPriority.slice(0, 3);
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours}時間前`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}日前`;
  }
}

const UrgentTasks: React.FC<UrgentTasksProps> = ({ issues, className = '' }) => {
  const urgentTasks = getUrgentTasks(issues);

  if (urgentTasks.length === 0) {
    return (
      <div className={`bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            素晴らしい！緊急タスクはありません
          </h3>
          <p className="text-green-600 dark:text-green-400 text-sm">
            現在、緊急対応が必要なIssueはありません。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          🔥 緊急タスク Top 3
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {urgentTasks.length}件の緊急対応
        </div>
      </div>

      <div className="space-y-4">
        {urgentTasks.map((task, index) => {
          const priority = getPriorityFromLabels(task.labels || []);
          const config = priorityConfig[priority];
          
          return (
            <div
              key={task.id}
              className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer`}
              onClick={() => window.open(task.html_url, '_blank')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  window.open(task.html_url, '_blank');
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      #{task.number}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color} bg-white dark:bg-gray-800`}>
                      {config.action}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(task.created_at)}
                    </span>
                  </div>
                  
                  <h4 className={`font-semibold ${config.color} mb-2 line-clamp-2`}>
                    {task.title}
                  </h4>
                  
                  {task.body && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {extractMarkdownSummary(task.body, 120)}
                    </p>
                  )}
                  
                  {task.labels && task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {task.labels.slice(0, 3).map((label) => (
                        <span
                          key={label}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                        >
                          {label}
                        </span>
                      ))}
                      {task.labels.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                          +{task.labels.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            💡 <strong>Tip:</strong> クリックして詳細を確認
          </div>
          <a
            href={`${import.meta.env.BASE_URL}issues`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            全Issueを見る →
          </a>
        </div>
      </div>
    </div>
  );
};

export default UrgentTasks;