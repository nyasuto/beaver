/**
 * Issue Search Manager
 *
 * Provides comprehensive search, filtering, and sorting functionality for GitHub issues.
 * Extracted from Astro component to improve testability and reusability.
 */

export interface SearchFilters {
  state?: 'open' | 'closed' | 'all';
  labelCategories?: {
    priority: string[];
    type: string[];
    other: string[];
  };
  author?: string | undefined;
  assignee?: string | undefined;
}

export interface SearchOptions {
  query: string;
  filters: SearchFilters;
  sortBy: string;
  sortOrder: string;
}

export interface SearchResult {
  filteredElements: HTMLElement[];
  totalCount: number;
  searchTime: number;
}

/**
 * Manages search, filtering, and sorting functionality for issue lists
 */
export class IssueSearchManager {
  private allIssues: HTMLElement[];
  private currentFilters: SearchFilters = {
    state: 'all',
    labelCategories: { priority: [], type: [], other: [] },
  };
  private currentQuery = '';
  private currentSort = { by: 'created', order: 'desc' };
  private openLabelCounts: Record<string, number>;
  private allLabelCounts: Record<string, number>;

  constructor(issueSelector: string = '.issue-card') {
    this.allIssues = Array.from(document.querySelectorAll(issueSelector));
    this.currentFilters.state = 'open'; // デフォルトはopenのみ

    // ラベルカウントの初期化
    this.openLabelCounts = this.calculateLabelCountsFromDOM('open');
    this.allLabelCounts = this.calculateLabelCountsFromDOM('all');
  }

  /**
   * Initialize event listeners for search controls
   */
  public initializeEventListeners(): void {
    this.setupSearchInput();
    this.setupClearSearch();
    this.setupStatusFilter();
    this.setupLabelFilters();
    this.setupAuthorFilter();
    this.setupAssigneeFilter();
    this.setupSortSelect();
  }

  /**
   * Perform search with current settings
   */
  public performSearch(): SearchResult {
    const startTime = performance.now();

    // Text search
    let filteredIssues = this.filterByText();

    // Apply other filters
    filteredIssues = this.filterByState(filteredIssues);
    filteredIssues = this.filterByLabels(filteredIssues);
    filteredIssues = this.filterByAuthor(filteredIssues);
    filteredIssues = this.filterByAssignee(filteredIssues);

    // Sort results
    filteredIssues = this.sortIssues(filteredIssues);

    const searchTime = performance.now() - startTime;

    return {
      filteredElements: filteredIssues,
      totalCount: filteredIssues.length,
      searchTime,
    };
  }

  /**
   * Update label counts display
   */
  public updateLabelCounts(): void {
    const currentCounts =
      this.currentFilters.state === 'all'
        ? this.allLabelCounts
        : this.currentFilters.state === 'open'
          ? this.openLabelCounts
          : this.calculateLabelCountsFromDOM('closed');

    // ラベル数の表示を更新
    document.querySelectorAll('.label-filter').forEach(checkbox => {
      const labelName = (checkbox as HTMLInputElement).value;
      const countElement = checkbox.parentElement?.querySelector('.text-xs.text-muted');
      if (countElement) {
        const count = currentCounts[labelName] || 0;
        countElement.textContent = `(${count})`;
      }
    });
  }

  /**
   * Calculate label counts from DOM elements
   */
  private calculateLabelCountsFromDOM(state: 'open' | 'closed' | 'all'): Record<string, number> {
    const labelCounts: Record<string, number> = {};

    this.allIssues.forEach(issue => {
      const issueState = issue.getAttribute('data-state');
      if (state !== 'all' && issueState !== state) return;

      const labels = (issue.getAttribute('data-labels') || '').split(',');
      labels.forEach(label => {
        if (label.trim()) {
          labelCounts[label] = (labelCounts[label] || 0) + 1;
        }
      });
    });

    return labelCounts;
  }

  /**
   * Filter issues by text search
   */
  private filterByText(): HTMLElement[] {
    if (!this.currentQuery.trim()) return [...this.allIssues];

    return this.allIssues.filter(issue => {
      const title = issue.getAttribute('data-title') || '';
      const body = issue.getAttribute('data-body') || '';
      const author = issue.getAttribute('data-author') || '';
      const labels = issue.getAttribute('data-labels') || '';

      const searchText = `${title} ${body} ${author} ${labels}`.toLowerCase();
      const searchTerms = this.currentQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 0);

      return searchTerms.every(term => searchText.includes(term));
    });
  }

  /**
   * Filter issues by state
   */
  private filterByState(issues: HTMLElement[]): HTMLElement[] {
    if (!this.currentFilters.state || this.currentFilters.state === 'all') {
      return issues;
    }

    return issues.filter(issue => issue.getAttribute('data-state') === this.currentFilters.state);
  }

  /**
   * Filter issues by labels
   */
  private filterByLabels(issues: HTMLElement[]): HTMLElement[] {
    if (!this.currentFilters.labelCategories) return issues;

    const { priority, type, other } = this.currentFilters.labelCategories;

    return issues.filter(issue => {
      const issueLabels = (issue.getAttribute('data-labels') || '').split(',');

      // 各カテゴリの条件をチェック
      const priorityMatch =
        priority.length === 0 || priority.some(label => issueLabels.includes(label));
      const typeMatch = type.length === 0 || type.some(label => issueLabels.includes(label));
      const otherMatch = other.length === 0 || other.some(label => issueLabels.includes(label));

      // すべてのカテゴリの条件を満たす必要がある（AND条件）
      return priorityMatch && typeMatch && otherMatch;
    });
  }

  /**
   * Filter issues by author
   */
  private filterByAuthor(issues: HTMLElement[]): HTMLElement[] {
    if (!this.currentFilters.author) return issues;

    return issues.filter(
      issue =>
        issue.getAttribute('data-author')?.toLowerCase() ===
        this.currentFilters.author?.toLowerCase()
    );
  }

  /**
   * Filter issues by assignee
   */
  private filterByAssignee(issues: HTMLElement[]): HTMLElement[] {
    if (!this.currentFilters.assignee) return issues;

    return issues.filter(issue => {
      const assignees = (issue.getAttribute('data-assignees') || '').split(',');
      return assignees.some(
        assignee => assignee.toLowerCase() === this.currentFilters.assignee?.toLowerCase()
      );
    });
  }

  /**
   * Sort issues based on current sort settings
   */
  private sortIssues(issues: HTMLElement[]): HTMLElement[] {
    return issues.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (this.currentSort.by) {
        case 'created':
          aValue = new Date(a.getAttribute('data-created') || '').getTime();
          bValue = new Date(b.getAttribute('data-created') || '').getTime();
          break;
        case 'updated':
          aValue = new Date(a.getAttribute('data-updated') || '').getTime();
          bValue = new Date(b.getAttribute('data-updated') || '').getTime();
          break;
        case 'number':
          aValue = parseInt(a.getAttribute('data-number') || '0');
          bValue = parseInt(b.getAttribute('data-number') || '0');
          break;
        case 'priority':
          aValue = this.getPriorityValue(a);
          bValue = this.getPriorityValue(b);
          break;
        default:
          return 0;
      }

      const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return this.currentSort.order === 'desc' ? -result : result;
    });
  }

  /**
   * Get numeric priority value for sorting
   */
  private getPriorityValue(issue: HTMLElement): number {
    const priority = issue.getAttribute('data-priority') || '';
    switch (priority) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Check if any filters are active
   */
  private hasActiveFilters(): boolean {
    const hasLabelFilters =
      this.currentFilters.labelCategories &&
      (this.currentFilters.labelCategories.priority.length > 0 ||
        this.currentFilters.labelCategories.type.length > 0 ||
        this.currentFilters.labelCategories.other.length > 0);

    return (
      (this.currentFilters.state && this.currentFilters.state !== 'all') ||
      Boolean(hasLabelFilters) ||
      Boolean(this.currentFilters.author) ||
      Boolean(this.currentFilters.assignee)
    );
  }

  /**
   * Escape regular expression special characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Event listener setup methods
  private setupSearchInput(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      let searchTimeout: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentQuery = (e.target as HTMLInputElement).value;
          this.updateDisplay();
        }, 300); // Debounce 300ms
      });
    }
  }

  private setupClearSearch(): void {
    const clearSearch = document.getElementById('clear-search');
    const searchInput = document.getElementById('search-input') as HTMLInputElement;

    if (clearSearch && searchInput) {
      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        this.currentQuery = '';
        this.updateDisplay();
      });
    }
  }

  private setupStatusFilter(): void {
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    if (statusFilter) {
      statusFilter.addEventListener('change', e => {
        const value = (e.target as HTMLSelectElement).value;
        this.currentFilters.state = value as 'open' | 'closed' | 'all';
        this.updateLabelCounts();
        this.updateDisplay();
      });
    }
  }

  private setupLabelFilters(): void {
    const labelFilters = document.querySelectorAll('.label-filter');
    labelFilters.forEach(filter => {
      filter.addEventListener('change', () => {
        // 各カテゴリの選択されたラベルを収集
        const priorityLabels = Array.from(
          document.querySelectorAll('.label-filter[data-category="priority"]:checked')
        ).map(checkbox => (checkbox as HTMLInputElement).value);

        const typeLabels = Array.from(
          document.querySelectorAll('.label-filter[data-category="type"]:checked')
        ).map(checkbox => (checkbox as HTMLInputElement).value);

        const otherLabels = Array.from(
          document.querySelectorAll('.label-filter[data-category="other"]:checked')
        ).map(checkbox => (checkbox as HTMLInputElement).value);

        this.currentFilters.labelCategories = {
          priority: priorityLabels,
          type: typeLabels,
          other: otherLabels,
        };
        this.updateDisplay();
      });
    });
  }

  private setupAuthorFilter(): void {
    const authorFilter = document.getElementById('author-filter') as HTMLSelectElement;
    if (authorFilter) {
      authorFilter.addEventListener('change', e => {
        const value = (e.target as HTMLSelectElement).value;
        this.currentFilters.author = value === '' ? undefined : value;
        this.updateDisplay();
      });
    }
  }

  private setupAssigneeFilter(): void {
    const assigneeFilter = document.getElementById('assignee-filter') as HTMLSelectElement;
    if (assigneeFilter) {
      assigneeFilter.addEventListener('change', e => {
        const value = (e.target as HTMLSelectElement).value;
        this.currentFilters.assignee = value === '' ? undefined : value;
        this.updateDisplay();
      });
    }
  }

  private setupSortSelect(): void {
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        const [sortBy, sortOrder] = (e.target as HTMLSelectElement).value.split('-');
        this.currentSort = {
          by: sortBy as string,
          order: sortOrder as string,
        };
        this.updateDisplay();
      });
    }
  }

  /**
   * Update the display with search results
   */
  private updateDisplay(): void {
    const result = this.performSearch();
    this.updateIssueDisplay(result.filteredElements);
    this.highlightSearchTerms();
    this.updateResultsInfo(result.totalCount, result.searchTime);
  }

  /**
   * Update issue display in the DOM
   */
  private updateIssueDisplay(filteredIssues: HTMLElement[]): void {
    // Hide all issues first
    this.allIssues.forEach(issue => {
      issue.classList.add('hidden');
    });

    // Show filtered issues in sorted order
    const container = document.getElementById('issues-container');
    if (container) {
      // Clear container
      const existingIssues = container.querySelectorAll('.issue-card');
      existingIssues.forEach(issue => issue.remove());

      // Add filtered issues in correct order
      filteredIssues.forEach(issue => {
        issue.classList.remove('hidden');
        container.appendChild(issue);
      });
    }
  }

  /**
   * Highlight search terms in the results
   */
  private highlightSearchTerms(): void {
    if (!this.currentQuery.trim()) return;

    const searchTerms = this.currentQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);

    // Highlight in titles and bodies
    document.querySelectorAll('.issue-title, .issue-body').forEach(element => {
      if (element.textContent) {
        let highlightedText = element.textContent;

        searchTerms.forEach(term => {
          const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
          highlightedText = highlightedText.replace(
            regex,
            '<mark class="search-highlight">$1</mark>'
          );
        });

        element.innerHTML = highlightedText;
      }
    });
  }

  /**
   * Update results information display
   */
  private updateResultsInfo(count: number, searchTime: number): void {
    const resultsCount = document.getElementById('results-count');
    const searchTimeElement = document.getElementById('search-time');
    const paginationText = document.getElementById('pagination-text');
    const searchStats = document.getElementById('search-stats');
    const searchPerformance = document.getElementById('search-performance');

    if (resultsCount) {
      resultsCount.textContent = `${count} 件の Issue を表示中`;
    }

    if (paginationText) {
      const totalIssues = this.allIssues.length;
      if (count === totalIssues) {
        paginationText.textContent = `${count} 件の Issue を表示中`;
      } else {
        paginationText.textContent = `${totalIssues} 件中 ${count} 件の Issue を表示中`;
      }
    }

    if (searchTimeElement && this.currentQuery.trim()) {
      searchTimeElement.textContent = `(検索時間: ${searchTime.toFixed(1)}ms)`;
      searchTimeElement.classList.remove('hidden');
    } else if (searchTimeElement) {
      searchTimeElement.classList.add('hidden');
    }

    if (searchStats && searchPerformance) {
      if (this.currentQuery.trim() || this.hasActiveFilters()) {
        searchPerformance.textContent = `検索完了: ${searchTime.toFixed(1)}ms`;
        searchStats.classList.remove('hidden');
      } else {
        searchStats.classList.add('hidden');
      }
    }
  }
}
