/**
 * Documentation search component with real-time search
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { resolveUrl } from '../../lib/utils/url.js';

interface SearchResult {
  slug: string;
  title: string;
  description?: string;
  excerpt: string;
  category?: string;
  tags?: string[];
  readingTime: number;
}

interface SearchResponse {
  success: boolean;
  data?: {
    query: string;
    results: SearchResult[];
    total: number;
  };
  error?: string;
}

interface DocsSearchProps {
  placeholder?: string;
  maxResults?: number;
  language?: 'en' | 'ja';
  baseUrl?: string;
}

const DEFAULT_TRANSLATIONS = {
  en: {
    placeholder: 'Search documentation...',
    noResults: 'No results found',
    searching: 'Searching...',
  },
  ja: {
    placeholder: 'ドキュメントを検索...',
    noResults: '結果が見つかりません',
    searching: '検索中...',
  },
};

export default function DocsSearch({
  placeholder,
  maxResults: _maxResults = 10,
  language = 'ja',
  baseUrl = '/docs',
}: DocsSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Get translations
  const translations = DEFAULT_TRANSLATIONS[language] || DEFAULT_TRANSLATIONS.en;
  const searchPlaceholder = placeholder || translations.placeholder;

  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      window.location.href = `${baseUrl}/${result.slug}`;
    },
    [baseUrl]
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            navigateToResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          searchRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigateToResult]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        resolveUrl(`/api/docs/search?q=${encodeURIComponent(searchQuery)}`)
      );
      const data: SearchResponse = await response.json();

      if (data.success && data.data) {
        setResults(data.data.results);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="relative" ref={resultsRef}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={searchPlaceholder}
          className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />

        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.slug}
                  onClick={() => navigateToResult(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {highlightQuery(result.title, query)}
                      </h3>
                      {result.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {highlightQuery(result.description, query)}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {highlightQuery(result.excerpt, query)}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-xs text-gray-400">
                      {result.readingTime}分
                    </div>
                  </div>

                  {/* Tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !isLoading ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              {translations.noResults}
            </div>
          ) : null}

          {/* Search Tips */}
          {query.length > 0 && query.length < 2 && (
            <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
              💡 2文字以上入力して検索してください
            </div>
          )}

          {results.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
              💡 ↑↓ で選択、Enter で移動、Esc で閉じる
            </div>
          )}
        </div>
      )}
    </div>
  );
}
