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