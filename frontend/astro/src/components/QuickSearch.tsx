import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Issue } from '../types/beaver';

interface QuickSearchProps {
  issues: Issue[];
  className?: string;
}

interface SearchResult {
  issue: Issue;
  relevanceScore: number;
  matchType: 'title' | 'body' | 'label';
}

const frequentKeywords = [
  { keyword: 'bug', icon: '🐛', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { keyword: 'error', icon: '❌', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { keyword: 'feature', icon: '✨', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { keyword: 'enhancement', icon: '⚡', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  { keyword: 'docs', icon: '📚', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { keyword: 'deploy', icon: '🚀', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  { keyword: 'critical', icon: '🚨', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { keyword: 'test', icon: '🧪', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' }
];

function searchIssues(issues: Issue[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase();
  const results: SearchResult[] = [];

  issues.forEach(issue => {
    let relevanceScore = 0;
    let matchType: SearchResult['matchType'] = 'body';

    // Title match (highest priority)
    if (issue.title.toLowerCase().includes(searchTerm)) {
      relevanceScore += 10;
      matchType = 'title';
    }

    // Exact title match gets extra score
    if (issue.title.toLowerCase() === searchTerm) {
      relevanceScore += 15;
    }

    // Body match
    if (issue.body?.toLowerCase().includes(searchTerm)) {
      relevanceScore += 5;
      if (matchType === 'body') matchType = 'body';
    }

    // Label match
    if (issue.labels?.some(label => label.toLowerCase().includes(searchTerm))) {
      relevanceScore += 7;
      matchType = 'label';
    }

    // Issue number match
    if (issue.number.toString().includes(searchTerm)) {
      relevanceScore += 12;
      matchType = 'title';
    }

    // Boost score for open issues
    if (issue.state === 'open') {
      relevanceScore += 2;
    }

    // Boost score for recent issues
    const daysOld = (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 7) {
      relevanceScore += 3;
    } else if (daysOld < 30) {
      relevanceScore += 1;
    }

    if (relevanceScore > 0) {
      results.push({ issue, relevanceScore, matchType });
    }
  });

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '1時間未満';
  if (diffInHours < 24) return `${diffInHours}時間前`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}日前`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}ヶ月前`;
}

const QuickSearch: React.FC<QuickSearchProps> = ({ issues, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    return searchIssues(issues, query).slice(0, 8);
  }, [issues, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % searchResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? searchResults.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          window.open(searchResults[selectedIndex].issue.html_url, '_blank');
          setQuery('');
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleQuickKeyword = (keyword: string) => {
    setQuery(keyword);
    setIsOpen(true);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleResultClick = (issue: Issue) => {
    window.open(issue.html_url, '_blank');
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          ⚡ クイック検索
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {issues.length}件中から検索
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6" ref={resultsRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(e.target.value.length >= 2);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsOpen(query.length >= 2)}
            onKeyDown={handleKeyDown}
            placeholder="Issue番号、タイトル、ラベルで検索... (最低2文字)"
            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={result.issue.id}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors duration-150 ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleResultClick(result.issue)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        #{result.issue.number}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.issue.state === 'open' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                      }`}>
                        {result.issue.state === 'open' ? 'Open' : 'Closed'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(result.issue.created_at)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                      {result.issue.title}
                    </h4>
                    {result.issue.body && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {result.issue.body.slice(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex flex-col items-end">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {result.matchType === 'title' && '📝 タイトル'}
                      {result.matchType === 'body' && '📄 本文'}
                      {result.matchType === 'label' && '🏷️ ラベル'}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      関連度: {result.relevanceScore}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {isOpen && query.length >= 2 && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-2xl mb-2">🔍</div>
              <p>「{query}」に一致するIssueが見つかりませんでした</p>
            </div>
          </div>
        )}
      </div>

      {/* Frequent Keywords */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          🔥 よく使われるキーワード
        </h4>
        <div className="flex flex-wrap gap-2">
          {frequentKeywords.map(({ keyword, icon, color }) => (
            <button
              key={keyword}
              onClick={() => handleQuickKeyword(keyword)}
              className={`inline-flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm ${color}`}
            >
              <span>{icon}</span>
              <span>{keyword}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Tips */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          💡 <strong>検索のコツ:</strong> Issue番号(#123)、タイトル、ラベル名で検索できます。キーボードの ↑↓ で選択、Enter で開く
        </div>
      </div>
    </div>
  );
};

export default QuickSearch;