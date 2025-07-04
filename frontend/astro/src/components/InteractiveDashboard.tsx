import React, { useState, useMemo, useCallback } from 'react';
import SearchComponent from './SearchComponent';
import InteractiveIssueList from './InteractiveIssueList';
import { OptimizedStatisticsDashboard } from './PerformanceOptimizations';
import { AccessibleTabs, SkipNavigation, AriaLiveRegion } from './AccessibilityEnhancements';
import type { Issue, Statistics } from '../types/beaver';

interface InteractiveDashboardProps {
  issues: Issue[];
  statistics: Statistics;
  className?: string;
}

const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({
  issues,
  statistics,
  className = ''
}) => {
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>(issues);
  const [activeView, setActiveView] = useState<'dashboard' | 'search' | 'analytics'>('dashboard');
  const [announceMessage, setAnnounceMessage] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Check for category filter from sessionStorage (from CategoryShortcuts)
  React.useEffect(() => {
    const storedFilter = sessionStorage.getItem('issueFilter');
    if (storedFilter) {
      try {
        const filterData = JSON.parse(storedFilter);
        // Check if filter is recent (within 1 minute)
        if (Date.now() - filterData.timestamp < 60000) {
          setCategoryFilter(filterData.category);
          // Clear the filter after applying
          sessionStorage.removeItem('issueFilter');
        }
      } catch (error) {
        console.warn('Failed to parse stored filter:', error);
      }
    }
  }, []);

  // Apply category filter to issues
  React.useEffect(() => {
    let filtered = issues;
    
    if (categoryFilter) {
      const categoryFilters: Record<string, string[]> = {
        bug: ['bug', 'error', 'defect', 'fix'],
        feature: ['feature', 'enhancement', 'new', 'add'],
        critical: ['critical', 'urgent', 'high', 'important', 'priority'],
        docs: ['docs', 'documentation', 'readme', 'guide'],
        test: ['test', 'testing', 'spec', 'qa'],
        deploy: ['deploy', 'deployment', 'release', 'ci/cd', 'build'],
        performance: ['performance', 'speed', 'optimization', 'slow'],
        security: ['security', 'vulnerability', 'auth', 'permission']
      };

      const filters = categoryFilters[categoryFilter];
      if (filters) {
        filtered = issues.filter(issue => {
          const searchText = `${issue.title} ${issue.body || ''} ${(issue.labels || []).join(' ')}`.toLowerCase();
          return filters.some(filter => searchText.includes(filter.toLowerCase()));
        });
      }
    }

    setFilteredIssues(filtered);
    
    if (categoryFilter && filtered.length > 0) {
      setAnnounceMessage(`${categoryFilter}カテゴリで${filtered.length}件のIssueが見つかりました`);
    }
  }, [issues, categoryFilter]);

  // Calculate filtered statistics
  const filteredStats = useMemo(() => {
    const openIssues = filteredIssues.filter(issue => issue.state === 'open').length;
    const closedIssues = filteredIssues.filter(issue => issue.state === 'closed').length;
    const totalFiltered = filteredIssues.length;
    
    // Calculate average urgency
    const urgencyScores = filteredIssues
      .map(issue => issue.analysis?.urgency_score || 0)
      .filter(score => score > 0);
    const avgUrgency = urgencyScores.length > 0 
      ? urgencyScores.reduce((sum, score) => sum + score, 0) / urgencyScores.length 
      : 0;

    // Calculate health score based on filtered data
    const resolutionRate = totalFiltered > 0 ? (closedIssues / totalFiltered) * 100 : 0;
    const urgencyFactor = Math.max(0, 100 - avgUrgency);
    const healthScore = (resolutionRate * 0.7) + (urgencyFactor * 0.3);

    return {
      total_issues: totalFiltered,
      open_issues: openIssues,
      closed_issues: closedIssues,
      health_score: healthScore,
      avg_urgency: avgUrgency,
      resolution_rate: resolutionRate
    };
  }, [filteredIssues]);

  // Get label distribution for analytics
  const labelDistribution = useMemo(() => {
    const labelCount: Record<string, number> = {};
    filteredIssues.forEach(issue => {
      if (issue.labels) {
        issue.labels.forEach(label => {
          labelCount[label] = (labelCount[label] || 0) + 1;
        });
      }
    });
    
    return Object.entries(labelCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }));
  }, [filteredIssues]);

  // Get urgency distribution
  const urgencyDistribution = useMemo(() => {
    const distribution = { high: 0, medium: 0, low: 0, none: 0 };
    filteredIssues.forEach(issue => {
      const urgency = issue.analysis?.urgency_score || 0;
      if (urgency >= 50) distribution.high++;
      else if (urgency >= 20) distribution.medium++;
      else if (urgency > 0) distribution.low++;
      else distribution.none++;
    });
    return distribution;
  }, [filteredIssues]);

  const handleFilteredIssues = useCallback((filtered: Issue[]) => {
    setFilteredIssues(filtered);
    // Announce filter results to screen readers
    const message = `Filtered to ${filtered.length} issue${filtered.length === 1 ? '' : 's'}`;
    setAnnounceMessage(message);
    // Clear message after announcement
    setTimeout(() => setAnnounceMessage(''), 1000);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveView(tabId as 'dashboard' | 'search' | 'analytics');
    const tabNames = {
      dashboard: 'Dashboard',
      search: 'Search & Filter', 
      analytics: 'Analytics'
    };
    setAnnounceMessage(`Switched to ${tabNames[tabId as keyof typeof tabNames]} tab`);
    setTimeout(() => setAnnounceMessage(''), 1000);
  }, []);

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number): string => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'search', label: 'Search & Filter', icon: '🔍' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <SkipNavigation />
      <AriaLiveRegion message={announceMessage} />
      
      {/* Navigation Tabs - Enhanced with accessibility */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <AccessibleTabs
          tabs={tabs}
          activeTab={activeView}
          onTabChange={handleTabChange}
          ariaLabel="Dashboard navigation"
        />
      </div>

      {/* Category Filter Banner */}
      {categoryFilter && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                🔍 フィルタ適用中: {categoryFilter}
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {filteredIssues.length}件のIssueが見つかりました
              </span>
            </div>
            <button
              onClick={() => setCategoryFilter(null)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              フィルタを解除
            </button>
          </div>
        </div>
      )}

      {/* Active View Content */}
      <main id="main-content" role="tabpanel" aria-labelledby={`tab-${activeView}`}>
      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quick Stats Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 mb-1">{filteredStats.total_issues}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Issues</div>
            {filteredStats.total_issues !== issues.length && (
              <div className="text-xs text-gray-500 mt-1">
                (filtered from {issues.length})
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 mb-1">{filteredStats.open_issues}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Open Issues</div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredStats.total_issues > 0 
                ? Math.round((filteredStats.open_issues / filteredStats.total_issues) * 100)
                : 0}% of filtered
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-600 mb-1">{filteredStats.closed_issues}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Closed Issues</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(filteredStats.resolution_rate)}% resolved
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className={`text-2xl font-bold mb-1 ${getHealthColor(filteredStats.health_score)}`}>
              {Math.round(filteredStats.health_score)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Health Score</div>
            <div className="text-xs text-gray-500 mt-1">
              {getHealthIcon(filteredStats.health_score)} 
              {filteredStats.avg_urgency > 0 && ` Avg urgency: ${Math.round(filteredStats.avg_urgency)}`}
            </div>
          </div>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="space-y-6">
          {/* Chart Dashboard - Optimized with lazy loading */}
          <OptimizedStatisticsDashboard statistics={statistics} />
          
          {/* Additional Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Label Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                🏷️ Top Labels (Filtered Data)
              </h3>
              <div className="space-y-3">
                {labelDistribution.length > 0 ? labelDistribution.map(({ label, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                      {label}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-20">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.max(10, (count / filteredStats.total_issues) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <div className="text-4xl mb-2">🏷️</div>
                    <p>No labels found in filtered issues</p>
                  </div>
                )}
              </div>
            </div>

            {/* Urgency Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                ⚡ Urgency Distribution (Filtered Data)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">🔴 High (50+)</span>
                  <span className="text-sm font-medium">{urgencyDistribution.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-600">🟡 Medium (20-49)</span>
                  <span className="text-sm font-medium">{urgencyDistribution.medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">🔵 Low (1-19)</span>
                  <span className="text-sm font-medium">{urgencyDistribution.low}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">⚪ None (0)</span>
                  <span className="text-sm font-medium">{urgencyDistribution.none}</span>
                </div>
              </div>

              {filteredStats.avg_urgency > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Average Urgency: <span className="font-medium">{Math.round(filteredStats.avg_urgency)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Component - Always visible but collapsible */}
      <SearchComponent 
        issues={issues} 
        onFilteredIssues={handleFilteredIssues}
        className={activeView !== 'search' ? 'opacity-75' : ''}
      />

      {/* Interactive Issue List */}
      <InteractiveIssueList 
        issues={filteredIssues}
        showAnalysis={true}
        itemsPerPage={10}
      />
      </main>
    </div>
  );
};

export default InteractiveDashboard;