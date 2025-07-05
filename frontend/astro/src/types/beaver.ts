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
  // New unified fields from backend - eliminates frontend duplication
  workflow_metrics?: WorkflowMetrics;
  daily_metrics?: DailyMetrics;
  next_actions?: ActionItem[];
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

// New interfaces that replace frontend duplicate calculations
export interface WorkflowMetrics {
  new_this_week: number;
  recently_updated: number;
  total_open: number;
  closed_this_week: number;
  weekly_velocity: number;
}

export interface DailyMetrics {
  new_today: number;
  updated_today: number;
  closed_today: number;
  has_activity: boolean;
}

export interface ActionItem {
  text: string;
  issues: Issue[];
  type: 'critical' | 'stale' | 'bug' | 'feature' | 'none';
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
// Coverage Dashboard Types
// ==============================

export interface CoverageData {
  project_name: string;
  generated_at: string;
  total_coverage: number;
  quality_rating: QualityRating;
  summary: CoverageSummary;
  package_stats: PackageCoverageStats[];
  file_coverage: FileCoverageStats[];
  recommendations: CoverageRecommendation[];
}

export interface QualityRating {
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  description: string;
  next_target: number;
}

export interface CoverageSummary {
  total_packages: number;
  tested_packages: number;
  untested_packages: number;
  total_files: number;
  tested_files: number;
}

export interface PackageCoverageStats {
  package_name: string;
  coverage: number;
  quality_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  covered_statements: number;
  total_statements: number;
  file_count: number;
}

export interface FileCoverageStats {
  file_name: string;
  package_name: string;
  coverage: number;
  complexity_score: number;
  covered_statements: number;
  total_statements: number;
}

export interface CoverageRecommendation {
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  affected_packages?: string[];
}

// Chart data structures for coverage visualization
export interface CoverageChartData {
  package_chart: {
    labels: string[];
    data: number[];
    grades: string[];
  };
  distribution_chart: {
    labels: string[];
    data: number[];
    colors: string[];
  };
}

// Component Props for Coverage
export interface CoverageStatsProps {
  data: CoverageData;
  className?: string;
}

export interface CoverageChartProps {
  chartData: CoverageChartData;
  type: 'package' | 'distribution';
  className?: string;
}

export interface CoverageTableProps {
  packages: PackageCoverageStats[];
  type: 'top-performers' | 'needs-attention';
  limit?: number;
  className?: string;
}

export interface CoverageRecommendationsProps {
  recommendations: CoverageRecommendation[];
  className?: string;
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