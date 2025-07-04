import React, { useState } from 'react';
import type { Issue } from '../types/beaver';
import { extractMarkdownSummary } from '../utils/markdown';

interface InteractiveIssueListProps {
  issues: Issue[];
  showAnalysis?: boolean;
  itemsPerPage?: number;
  className?: string;
}

const InteractiveIssueList: React.FC<InteractiveIssueListProps> = ({
  issues,
  showAnalysis = true,
  itemsPerPage = 10,
  className = ''
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');

  // Pagination logic
  const totalPages = Math.ceil(issues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIssues = issues.slice(startIndex, endIndex);

  // Helper functions
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const getStateColor = (state: string): string => {
    return state === 'open' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getUrgencyColor = (urgency: number): string => {
    if (urgency >= 50) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (urgency >= 20) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  // Priority label helper - currently unused but kept for future enhancement
  // const getPriorityLabel = (labels: string[]): string => {
  //   const priorityLabel = labels?.find(label => label.startsWith('priority:'));
  //   return priorityLabel ? priorityLabel.replace('priority:', '').trim() : '';
  // };

  const toggleIssueSelection = (issueId: number) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const selectAllCurrentPage = () => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      currentIssues.forEach(issue => newSet.add(issue.id));
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (issues.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center ${className}`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-bold mb-2">No Issues Found</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            📋 Issues ({issues.length})
          </h3>
          {selectedIssues.size > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {selectedIssues.size} selected
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Compact
            </button>
          </div>

          {/* Selection controls */}
          <div className="flex space-x-2">
            <button
              onClick={selectAllCurrentPage}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              Select Page
            </button>
            {selectedIssues.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-3">
        {currentIssues.map((issue) => (
          <div
            key={issue.id}
            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
              selectedIssues.has(issue.id) 
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            } ${viewMode === 'compact' ? 'py-2' : ''}`}
            onClick={() => toggleIssueSelection(issue.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Title and Issue Number */}
                <h4 className={`font-semibold ${viewMode === 'compact' ? 'text-base' : 'text-lg'} mb-2 truncate`}>
                  <a 
                    href={issue.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    #{issue.number} {issue.title}
                  </a>
                </h4>

                {/* Issue Metadata */}
                <div className={`flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 ${viewMode === 'compact' ? 'mb-1' : 'mb-2'}`}>
                  {/* State */}
                  <span className={`px-2 py-1 rounded-full text-xs ${getStateColor(issue.state)}`}>
                    {issue.state}
                  </span>
                  
                  {/* Author and Date */}
                  <span>by {issue.user.login}</span>
                  <span>{formatDate(issue.created_at)}</span>
                  
                  {/* Urgency Score */}
                  {showAnalysis && issue.analysis?.urgency_score && (
                    <span className={`px-2 py-1 rounded-full text-xs ${getUrgencyColor(issue.analysis.urgency_score)}`}>
                      Urgency: {issue.analysis.urgency_score}
                    </span>
                  )}
                </div>

                {/* Labels */}
                {issue.labels && issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {issue.labels.slice(0, viewMode === 'compact' ? 3 : 6).map((label) => (
                      <span 
                        key={label}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {label}
                      </span>
                    ))}
                    {viewMode === 'compact' && issue.labels.length > 3 && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        +{issue.labels.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Issue Body Preview */}
                {viewMode === 'detailed' && issue.body && (
                  <div className="mt-2">
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {extractMarkdownSummary(issue.body, 150)}
                    </p>
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              <div className="flex-shrink-0 ml-4">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedIssues.has(issue.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedIssues.has(issue.id) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, issues.length)} of {issues.length} issues
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            
            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 text-sm border rounded-lg ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveIssueList;