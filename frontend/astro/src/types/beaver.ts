// Type definitions for Beaver data structures

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  created_at: string;
  updated_at: string;
  html_url: string;
  user: User;
  analysis?: Analysis;
}

export interface User {
  id: number;
  login: string;
  avatar_url?: string;
}

export interface Analysis {
  urgency_score?: number;
  category?: string;
  tags?: string[];
}

export interface Statistics {
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  health_score: number;
  trends?: Trends;
  timeline?: TimelineData[];
}

export interface TimelineData {
  week_start: string;
  created_count: number;
  closed_count: number;
  total_count: number;
}

export interface Trends {
  daily_activity?: DailyActivity[];
  weekly_summary?: WeeklySummary;
}

export interface DailyActivity {
  date: string;
  issues_created: number;
  issues_closed: number;
}

export interface WeeklySummary {
  created_this_week: number;
  closed_this_week: number;
  active_contributors: number;
}

export interface Navigation {
  toc: NavigationItem[];
}

export interface NavigationItem {
  title: string;
  anchor: string;
  children?: NavigationItem[];
}

export interface Metadata {
  generated_at: string;
  repository: string;
  version: string;
  build_info?: BuildInfo;
}

export interface BuildInfo {
  go_version?: string;
  commit_hash?: string;
  build_time?: string;
}

// Main data structure exported by Go backend
export interface BeaverData {
  issues: Issue[];
  statistics: Statistics;
  navigation: Navigation;
  metadata: Metadata;
}

// ==============================
// Phase 1 Extended Types for UI Components
// ==============================

// Component Props Interfaces
export interface IssueCardProps {
  issue: Issue;
  showAnalysis?: boolean;
  compact?: boolean;
  className?: string;
}

export interface StatisticsCardProps {
  statistics: Statistics;
  showTrends?: boolean;
  className?: string;
}

// Utility Types for Component State Management
export interface FilterOptions {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  category?: string;
  urgency?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface ViewOptions {
  sortBy?: 'created' | 'updated' | 'urgency' | 'title';
  sortOrder?: 'asc' | 'desc';
  groupBy?: 'state' | 'category' | 'priority' | 'none';
  itemsPerPage?: number;
  currentPage?: number;
}

// Search Functionality
export interface SearchState {
  query: string;
  filters: FilterOptions;
  view: ViewOptions;
  results?: Issue[];
  totalCount?: number;
}

// Configuration and Settings
export interface BeaverConfig {
  ui: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    showAnalysis: boolean;
    showTrends: boolean;
  };
  display: {
    itemsPerPage: number;
    defaultSort: ViewOptions['sortBy'];
    defaultGrouping: ViewOptions['groupBy'];
  };
  features: {
    search: boolean;
    filters: boolean;
    exportOptions: string[];
  };
}

// Component State Types
export interface ComponentState {
  loading: boolean;
  error?: string;
  data?: any;
}

export interface IssueListState extends ComponentState {
  issues: Issue[];
  filteredIssues: Issue[];
  search: SearchState;
  selection: number[];
}

export interface StatisticsState extends ComponentState {
  statistics: Statistics;
  trends?: Trends;
  comparison?: {
    previous: Statistics;
    change: {
      total_issues: number;
      open_issues: number;
      closed_issues: number;
      health_score: number;
    };
  };
}