import React, { useState } from 'react';
import type { Issue } from '../types/beaver';

interface CategoryShortcutsProps {
  issues: Issue[];
  className?: string;
}

interface CategoryConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  filters: string[];
}

const categories: CategoryConfig[] = [
  {
    key: 'bug',
    name: 'Bugs',
    icon: '🐛',
    color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
    description: 'バグレポートと修正',
    filters: ['bug', 'error', 'defect', 'fix']
  },
  {
    key: 'feature',
    name: 'Features',
    icon: '✨',
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30',
    description: '新機能とアイデア',
    filters: ['feature', 'enhancement', 'new', 'add']
  },
  {
    key: 'critical',
    name: 'Critical',
    icon: '🚨',
    color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
    description: '緊急対応が必要',
    filters: ['critical', 'urgent', 'high', 'important', 'priority']
  },
  {
    key: 'docs',
    name: 'Documentation',
    icon: '📚',
    color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30',
    description: 'ドキュメント改善',
    filters: ['docs', 'documentation', 'readme', 'guide']
  },
  {
    key: 'test',
    name: 'Testing',
    icon: '🧪',
    color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
    description: 'テスト関連',
    filters: ['test', 'testing', 'spec', 'qa']
  },
  {
    key: 'deploy',
    name: 'Deploy',
    icon: '🚀',
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30',
    description: 'デプロイ・リリース',
    filters: ['deploy', 'deployment', 'release', 'ci/cd', 'build']
  },
  {
    key: 'performance',
    name: 'Performance',
    icon: '⚡',
    color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30',
    description: 'パフォーマンス改善',
    filters: ['performance', 'speed', 'optimization', 'slow']
  },
  {
    key: 'security',
    name: 'Security',
    icon: '🔒',
    color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
    description: 'セキュリティ対応',
    filters: ['security', 'vulnerability', 'auth', 'permission']
  }
];

function getCategoryIssues(issues: Issue[], category: CategoryConfig): Issue[] {
  return issues.filter(issue => {
    const searchText = `${issue.title} ${issue.body || ''} ${(issue.labels || []).join(' ')}`.toLowerCase();
    return category.filters.some(filter => searchText.includes(filter.toLowerCase()));
  });
}

function getStateDistribution(issues: Issue[]): { open: number; closed: number } {
  return issues.reduce(
    (acc, issue) => ({
      open: acc.open + (issue.state === 'open' ? 1 : 0),
      closed: acc.closed + (issue.state === 'closed' ? 1 : 0)
    }),
    { open: 0, closed: 0 }
  );
}

const CategoryShortcuts: React.FC<CategoryShortcutsProps> = ({ issues, className = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (category: CategoryConfig) => {
    const categoryIssues = getCategoryIssues(issues, category);
    
    if (categoryIssues.length === 0) {
      alert(`${category.name}カテゴリにはIssueがありません`);
      return;
    }

    // Navigate to issues page with filter (simplified for now)
    const baseUrl = import.meta.env.BASE_URL || '/';
    const issuesUrl = `${baseUrl}issues`;
    
    // Store filter preference in sessionStorage for the issues page to pick up
    sessionStorage.setItem('issueFilter', JSON.stringify({
      category: category.key,
      filters: category.filters,
      timestamp: Date.now()
    }));
    
    window.location.href = issuesUrl;
  };

  const handleShowPreview = (category: CategoryConfig) => {
    setSelectedCategory(selectedCategory === category.key ? null : category.key);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          📂 カテゴリショートカット
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          ワンクリックフィルタ
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {categories.map((category) => {
          const categoryIssues = getCategoryIssues(issues, category);
          const { open } = getStateDistribution(categoryIssues);
          const isSelected = selectedCategory === category.key;

          return (
            <div key={category.key} className="relative">
              <button
                onClick={() => handleCategoryClick(category)}
                onMouseEnter={() => handleShowPreview(category)}
                onMouseLeave={() => setSelectedCategory(null)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${category.color} ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''
                }`}
                disabled={categoryIssues.length === 0}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <div className="font-semibold text-sm mb-1">{category.name}</div>
                  <div className="text-xs opacity-75 mb-2">{category.description}</div>
                  
                  <div className="flex justify-center space-x-2 text-xs">
                    {open > 0 && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                        {open} Open
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Preview Tooltip */}
              {isSelected && categoryIssues.length > 0 && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-4">
                  <div className="text-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {category.icon} {category.name} プレビュー
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {categoryIssues.length}件
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {categoryIssues.slice(0, 5).map((issue) => (
                        <div
                          key={issue.id}
                          className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">#{issue.number}</span>
                            <span className={`px-1 py-0.5 rounded ${
                              issue.state === 'open' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                            }`}>
                              {issue.state}
                            </span>
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                            {issue.title}
                          </div>
                        </div>
                      ))}
                      
                      {categoryIssues.length > 5 && (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-2">
                          +{categoryIssues.length - 5}件のIssue
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
                      <div className="text-blue-600 dark:text-blue-400 font-medium">
                        クリックして全件表示 →
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {issues.filter(i => i.state === 'open').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Open Issues</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {issues.filter(i => i.state === 'closed').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Closed Issues</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {getCategoryIssues(issues, categories.find(c => c.key === 'critical')!).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {getCategoryIssues(issues, categories.find(c => c.key === 'bug')!).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Bugs</div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          💡 <strong>使い方:</strong> カテゴリをクリックでフィルタ適用、ホバーでプレビュー表示
        </div>
      </div>
    </div>
  );
};

export default CategoryShortcuts;