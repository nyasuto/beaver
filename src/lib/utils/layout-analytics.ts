/**
 * Layout Analytics Utility
 *
 * Issue #382: Performance measurement for integrated documentation layout
 * Provides tools for measuring user interactions and performance metrics
 * for the integrated sidebar layout (legacy floating layout removed)
 */

export interface LayoutMetrics {
  layoutType: 'integrated' | 'adaptive';
  sessionId: string;
  userId?: string;

  // Performance metrics
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;

  // User interaction metrics
  tocInteractions: number;
  sectionNavigations: number;
  searchUsage: number;
  mobileMenuUsage: number;
  scrollDepth: number;
  readingTime: number;
  bounceRate: boolean;

  // Layout-specific metrics
  sidebarResizes?: number;
  minimapUsage?: number;
  progressBarViews?: number;

  // Content characteristics
  documentLength: number;
  sectionCount: number;
  contentComplexity: 'simple' | 'standard' | 'complex';

  // Device and context
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  timestamp: Date;
}

export interface ABTestConfig {
  testId: string;
  variants: {
    control: 'integrated';
    treatment: 'adaptive';
  };
  trafficSplit: number; // 0-1, percentage for treatment
  enabledForUsers?: string[];
  disabledForUsers?: string[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export class LayoutAnalytics {
  private metrics: Partial<LayoutMetrics>;
  private sessionId: string;
  private startTime: number;
  private interactions: Map<string, number> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private isDebugMode: boolean;

  constructor(layoutType: LayoutMetrics['layoutType']) {
    this.sessionId = this.generateSessionId();
    this.startTime = performance.now();
    this.isDebugMode =
      typeof window !== 'undefined' && window.location.search.includes('debug=analytics');

    this.metrics = {
      layoutType,
      sessionId: this.sessionId,
      timestamp: new Date(),
      tocInteractions: 0,
      sectionNavigations: 0,
      searchUsage: 0,
      mobileMenuUsage: 0,
      scrollDepth: 0,
      readingTime: 0,
      bounceRate: false,
    };

    this.initializeAnalytics();

    if (this.isDebugMode) {
      console.log('📊 [Layout Analytics] Initialized for layout:', layoutType);
    }
  }

  /**
   * Initialize analytics tracking
   */
  private initializeAnalytics(): void {
    this.collectDeviceInfo();
    this.initializePerformanceTracking();
    this.setupEventListeners();
    this.startReadingTimeTracking();
  }

  /**
   * Collect device and context information
   */
  private collectDeviceInfo(): void {
    if (typeof window === 'undefined') return;

    this.metrics.screenWidth = window.innerWidth;
    this.metrics.screenHeight = window.innerHeight;
    this.metrics.userAgent = navigator.userAgent;

    // Determine device type
    if (window.innerWidth < 768) {
      this.metrics.deviceType = 'mobile';
    } else if (window.innerWidth < 1024) {
      this.metrics.deviceType = 'tablet';
    } else {
      this.metrics.deviceType = 'desktop';
    }

    if (this.isDebugMode) {
      console.log('📱 [Layout Analytics] Device info collected:', {
        deviceType: this.metrics.deviceType,
        screenSize: `${this.metrics.screenWidth}x${this.metrics.screenHeight}`,
      });
    }
  }

  /**
   * Initialize performance tracking using Web APIs
   */
  private initializePerformanceTracking(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Track Core Web Vitals
      this.performanceObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.metrics.firstContentfulPaint = entry.startTime;
              }
              break;
            case 'largest-contentful-paint':
              this.metrics.largestContentfulPaint = entry.startTime;
              break;
            case 'layout-shift':
              if (!this.metrics.cumulativeLayoutShift) {
                this.metrics.cumulativeLayoutShift = 0;
              }
              this.metrics.cumulativeLayoutShift += (entry as any).value;
              break;
          }
        }
      });

      this.performanceObserver.observe({
        entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'],
      });

      // Track load time
      window.addEventListener('load', () => {
        this.metrics.loadTime = performance.now() - this.startTime;

        if (this.isDebugMode) {
          console.log('⚡ [Layout Analytics] Performance metrics collected:', {
            loadTime: this.metrics.loadTime,
            fcp: this.metrics.firstContentfulPaint,
            lcp: this.metrics.largestContentfulPaint,
            cls: this.metrics.cumulativeLayoutShift,
          });
        }
      });
    } catch (err) {
      console.warn('Performance tracking not available:', err);
    }
  }

  /**
   * Setup event listeners for user interactions
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // TOC interactions
    document.addEventListener('click', e => {
      const target = e.target as HTMLElement;

      if (
        target.classList.contains('toc-link') ||
        target.classList.contains('integrated-toc-link') ||
        target.classList.contains('mobile-toc-link')
      ) {
        this.trackTOCInteraction();
      }

      if (
        target.closest('#mobile-menu-button') ||
        target.closest('#integrated-mobile-menu-button')
      ) {
        this.trackMobileMenuUsage();
      }
    });

    // Section navigation tracking
    document.addEventListener('toc-section-change', () => {
      this.trackSectionNavigation();
    });

    // Search usage tracking
    document.addEventListener('input', e => {
      const target = e.target as HTMLElement;
      if (target.matches('input[type="search"], input[placeholder*="検索"]')) {
        this.trackSearchUsage();
      }
    });

    // Scroll depth tracking
    window.addEventListener('scroll', this.trackScrollDepth);

    // Window beforeunload for final metrics
    window.addEventListener('beforeunload', () => {
      this.finalizeMetrics();
    });

    // Page visibility for bounce rate
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.checkBounceRate();
      }
    });
  }

  /**
   * Start reading time tracking
   */
  private startReadingTimeTracking(): void {
    let isReading = true;
    let readingStartTime = Date.now();

    // Pause reading time when page is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (isReading) {
          this.metrics.readingTime! += Date.now() - readingStartTime;
          isReading = false;
        }
      } else {
        if (!isReading) {
          readingStartTime = Date.now();
          isReading = true;
        }
      }
    });

    // Update reading time periodically
    setInterval(() => {
      if (isReading && document.visibilityState === 'visible') {
        this.metrics.readingTime =
          (this.metrics.readingTime || 0) + (Date.now() - readingStartTime);
        readingStartTime = Date.now();
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Track TOC interaction
   */
  public trackTOCInteraction(): void {
    this.metrics.tocInteractions = (this.metrics.tocInteractions || 0) + 1;
    this.incrementInteraction('toc');

    if (this.isDebugMode) {
      console.log('🔗 [Layout Analytics] TOC interaction tracked:', this.metrics.tocInteractions);
    }
  }

  /**
   * Track section navigation
   */
  public trackSectionNavigation(): void {
    this.metrics.sectionNavigations = (this.metrics.sectionNavigations || 0) + 1;
    this.incrementInteraction('section-nav');

    if (this.isDebugMode) {
      console.log(
        '📍 [Layout Analytics] Section navigation tracked:',
        this.metrics.sectionNavigations
      );
    }
  }

  /**
   * Track search usage
   */
  public trackSearchUsage(): void {
    this.metrics.searchUsage = (this.metrics.searchUsage || 0) + 1;
    this.incrementInteraction('search');

    if (this.isDebugMode) {
      console.log('🔍 [Layout Analytics] Search usage tracked:', this.metrics.searchUsage);
    }
  }

  /**
   * Track mobile menu usage
   */
  public trackMobileMenuUsage(): void {
    this.metrics.mobileMenuUsage = (this.metrics.mobileMenuUsage || 0) + 1;
    this.incrementInteraction('mobile-menu');

    if (this.isDebugMode) {
      console.log('📱 [Layout Analytics] Mobile menu usage tracked:', this.metrics.mobileMenuUsage);
    }
  }

  /**
   * Track sidebar resize (for floating TOC)
   */
  public trackSidebarResize(): void {
    this.metrics.sidebarResizes = (this.metrics.sidebarResizes || 0) + 1;
    this.incrementInteraction('sidebar-resize');

    if (this.isDebugMode) {
      console.log('↔️ [Layout Analytics] Sidebar resize tracked:', this.metrics.sidebarResizes);
    }
  }

  /**
   * Track minimap usage (for integrated layout)
   */
  public trackMinimapUsage(): void {
    this.metrics.minimapUsage = (this.metrics.minimapUsage || 0) + 1;
    this.incrementInteraction('minimap');

    if (this.isDebugMode) {
      console.log('🗺️ [Layout Analytics] Minimap usage tracked:', this.metrics.minimapUsage);
    }
  }

  /**
   * Track progress bar views
   */
  public trackProgressBarView(): void {
    this.metrics.progressBarViews = (this.metrics.progressBarViews || 0) + 1;
    this.incrementInteraction('progress-bar');

    if (this.isDebugMode) {
      console.log(
        '📊 [Layout Analytics] Progress bar view tracked:',
        this.metrics.progressBarViews
      );
    }
  }

  /**
   * Track scroll depth
   */
  private trackScrollDepth = (): void => {
    const scrollTop = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / documentHeight) * 100);

    this.metrics.scrollDepth = Math.max(this.metrics.scrollDepth || 0, scrollPercent);
  };

  /**
   * Set content characteristics
   */
  public setContentCharacteristics(
    documentLength: number,
    sectionCount: number,
    complexity: LayoutMetrics['contentComplexity']
  ): void {
    this.metrics.documentLength = documentLength;
    this.metrics.sectionCount = sectionCount;
    this.metrics.contentComplexity = complexity;

    if (this.isDebugMode) {
      console.log('📄 [Layout Analytics] Content characteristics set:', {
        length: documentLength,
        sections: sectionCount,
        complexity,
      });
    }
  }

  /**
   * Check bounce rate
   */
  private checkBounceRate(): void {
    const minTimeOnPage = 30000; // 30 seconds
    const minInteractions = 2;

    const timeOnPage = Date.now() - this.startTime;
    const totalInteractions = Array.from(this.interactions.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    this.metrics.bounceRate = timeOnPage < minTimeOnPage && totalInteractions < minInteractions;

    if (this.isDebugMode) {
      console.log('🎯 [Layout Analytics] Bounce rate checked:', {
        timeOnPage: timeOnPage / 1000,
        interactions: totalInteractions,
        isBounce: this.metrics.bounceRate,
      });
    }
  }

  /**
   * Finalize metrics before page unload
   */
  private finalizeMetrics(): void {
    this.checkBounceRate();

    // Final reading time calculation
    if (document.visibilityState === 'visible') {
      this.metrics.readingTime = (this.metrics.readingTime || 0) + (Date.now() - this.startTime);
    }

    this.sendMetrics();
  }

  /**
   * Increment interaction counter
   */
  private incrementInteraction(type: string): void {
    const current = this.interactions.get(type) || 0;
    this.interactions.set(type, current + 1);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send metrics to analytics endpoint
   */
  private sendMetrics(): void {
    if (typeof window === 'undefined') return;

    try {
      // Use sendBeacon for reliable sending during page unload
      if (navigator.sendBeacon) {
        const data = JSON.stringify(this.metrics);
        navigator.sendBeacon('/api/analytics/layout', data);
      } else {
        // Fallback to fetch
        fetch('/api/analytics/layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.metrics),
          keepalive: true,
        }).catch(error => {
          console.warn('Failed to send analytics:', error);
        });
      }

      if (this.isDebugMode) {
        console.log('📤 [Layout Analytics] Metrics sent:', this.metrics);
      }
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  /**
   * Get current metrics (for debugging)
   */
  public getMetrics(): Partial<LayoutMetrics> {
    return { ...this.metrics };
  }

  /**
   * Destroy analytics tracking
   */
  public destroy(): void {
    this.performanceObserver?.disconnect();
    window.removeEventListener('scroll', this.trackScrollDepth);

    this.finalizeMetrics();

    if (this.isDebugMode) {
      console.log('🧹 [Layout Analytics] Destroyed');
    }
  }
}

/**
 * A/B Testing Utility
 */
export class ABTestManager {
  private static instance: ABTestManager;
  private testConfigs: Map<string, ABTestConfig> = new Map();
  private userAssignments: Map<string, string> = new Map();

  private constructor() {
    this.loadTestConfigs();
  }

  public static getInstance(): ABTestManager {
    if (!ABTestManager.instance) {
      ABTestManager.instance = new ABTestManager();
    }
    return ABTestManager.instance;
  }

  /**
   * Load test configurations
   */
  private loadTestConfigs(): void {
    // Updated test configuration for Issue #382
    const layoutTest: ABTestConfig = {
      testId: 'layout-comparison-382',
      variants: {
        control: 'integrated',
        treatment: 'adaptive',
      },
      trafficSplit: 0.3, // 30% adaptive, 70% integrated
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      isActive: false, // Disabled for now since integrated is the default
    };

    this.testConfigs.set(layoutTest.testId, layoutTest);
  }

  /**
   * Assign user to test variant
   */
  public assignUserToVariant(testId: string, userId?: string): string {
    const config = this.testConfigs.get(testId);
    if (!config || !config.isActive) {
      return 'control';
    }

    const now = new Date();
    if (now < config.startDate || now > config.endDate) {
      return 'control';
    }

    // Use session-based assignment if no user ID
    const assignmentKey = userId || this.getSessionId();

    // Check if user is explicitly enabled/disabled
    if (config.enabledForUsers?.includes(assignmentKey)) {
      return 'treatment';
    }
    if (config.disabledForUsers?.includes(assignmentKey)) {
      return 'control';
    }

    // Check existing assignment
    if (this.userAssignments.has(assignmentKey)) {
      return this.userAssignments.get(assignmentKey)!;
    }

    // New assignment based on traffic split
    const hash = this.hashString(assignmentKey + testId);
    const assignment = hash < config.trafficSplit ? 'treatment' : 'control';

    this.userAssignments.set(assignmentKey, assignment);

    // Store in localStorage for consistency
    try {
      localStorage.setItem(`ab_test_${testId}`, assignment);
    } catch {
      // Handle localStorage errors silently
    }

    return assignment;
  }

  /**
   * Get session ID for assignment
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    try {
      let sessionId = localStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    } catch {
      return `temp_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Hash string for consistent assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Check if user is in treatment group
   */
  public isInTreatment(testId: string, userId?: string): boolean {
    return this.assignUserToVariant(testId, userId) === 'treatment';
  }

  /**
   * Get active test configs
   */
  public getActiveTests(): ABTestConfig[] {
    const now = new Date();
    return Array.from(this.testConfigs.values()).filter(
      config => config.isActive && now >= config.startDate && now <= config.endDate
    );
  }
}

/**
 * Initialize layout analytics
 */
export function initializeLayoutAnalytics(
  layoutType: LayoutMetrics['layoutType']
): LayoutAnalytics {
  return new LayoutAnalytics(layoutType);
}

/**
 * Check if user should see adaptive layout (instead of default integrated)
 */
export function shouldUseAdaptiveLayout(userId?: string): boolean {
  const abTest = ABTestManager.getInstance();
  return abTest.isInTreatment('layout-comparison-382', userId);
}
