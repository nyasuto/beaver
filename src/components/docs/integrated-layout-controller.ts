/**
 * Integrated Layout Controller
 *
 * Issue #364: Enhanced documentation layout controller
 * Manages the integrated sidebar approach with:
 * - Intelligent TOC tracking
 * - Adaptive layout based on content complexity
 * - Mobile-optimized interactions
 * - Reading progress tracking
 * - Content minimap for complex documents
 */

import type { DocSection } from '../../lib/types/docs.js';
import {
  TOCScrollTracker,
  type TOCScrollTrackerOptions,
} from '../../lib/utils/toc-scroll-tracker.js';

export interface IntegratedLayoutOptions {
  /** Enable adaptive layout based on content complexity */
  enableAdaptiveLayout?: boolean;
  /** Enable intelligent scroll tracking */
  enableIntelligentTracking?: boolean;
  /** Enable reading progress tracking */
  enableReadingProgress?: boolean;
  /** Enable content minimap for complex documents */
  enableMinimap?: boolean;
  /** Scroll tracker options */
  scrollTrackerOptions?: TOCScrollTrackerOptions;
  /** Mobile menu breakpoint */
  mobileBreakpoint?: number;
}

export class IntegratedLayoutController {
  // Layout elements
  private sidebar: HTMLElement | null = null;
  private mainContent: HTMLElement | null = null;
  private mobileMenuButton: HTMLElement | null = null;
  private mobileMenuClose: HTMLElement | null = null;
  private mobileOverlay: HTMLElement | null = null;

  // TOC elements
  private integratedTocContent: HTMLElement | null = null;
  private tocExpandAllBtn: HTMLElement | null = null;
  private tocCollapseAllBtn: HTMLElement | null = null;

  // Progress elements
  private globalProgressBar: HTMLElement | null = null;
  private globalProgressFill: HTMLElement | null = null;
  private integratedProgressBar: HTMLElement | null = null;
  private integratedProgressFill: HTMLElement | null = null;
  private integratedProgressText: HTMLElement | null = null;

  // Minimap elements
  private minimapContainer: HTMLElement | null = null;
  private minimapToggle: HTMLElement | null = null;

  // State
  private isMobileMenuOpen = false;
  private isMinimapVisible = false;
  private currentSection: DocSection | null = null;
  private sections: DocSection[] = [];

  // Controllers
  private scrollTracker: TOCScrollTracker | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private options: Required<IntegratedLayoutOptions>;
  private isDebugMode: boolean;

  constructor(options: IntegratedLayoutOptions = {}) {
    this.options = {
      enableAdaptiveLayout: true,
      enableIntelligentTracking: true,
      enableReadingProgress: true,
      enableMinimap: false,
      scrollTrackerOptions: {},
      mobileBreakpoint: 1024,
      ...options,
    } as Required<IntegratedLayoutOptions>;

    this.isDebugMode =
      typeof window !== 'undefined' && window.location.search.includes('debug=layout');
  }

  /**
   * Initialize the integrated layout controller
   */
  public initialize(): void {
    if (this.isDebugMode) {
      console.log('🚀 [Integrated Layout] Initializing with options:', this.options);
    }

    this.findElements();
    this.extractSections();
    this.initializeScrollTracking();
    this.initializeMobileMenu();
    this.initializeTOCControls();
    this.initializeProgressTracking();
    this.initializeMinimap();
    this.initializeAdaptiveLayout();
    this.setupEventListeners();

    if (this.isDebugMode) {
      console.log('✅ [Integrated Layout] Initialized successfully:', {
        sectionsFound: this.sections.length,
        sidebarFound: !!this.sidebar,
        minimapEnabled: this.options.enableMinimap,
        adaptiveLayoutEnabled: this.options.enableAdaptiveLayout,
      });
    }
  }

  /**
   * Cleanup and destroy the controller
   */
  public destroy(): void {
    this.removeEventListeners();
    this.scrollTracker?.destroy();
    this.resizeObserver?.disconnect();

    if (this.isDebugMode) {
      console.log('🧹 [Integrated Layout] Destroyed');
    }
  }

  /**
   * Find all necessary DOM elements
   */
  private findElements(): void {
    // Layout elements
    this.sidebar = document.querySelector('aside[data-sidebar-width]');
    this.mainContent = document.querySelector('main');
    this.mobileMenuButton = document.getElementById('integrated-mobile-menu-button');
    this.mobileMenuClose = document.getElementById('integrated-mobile-menu-close');
    this.mobileOverlay = document.getElementById('integrated-mobile-nav-overlay');

    // TOC elements
    this.integratedTocContent = document.getElementById('integrated-toc-content');
    this.tocExpandAllBtn = document.getElementById('integrated-toc-expand-all');
    this.tocCollapseAllBtn = document.getElementById('integrated-toc-collapse-all');

    // Progress elements
    this.globalProgressBar = document.getElementById('global-progress-bar');
    this.globalProgressFill = document.getElementById('global-progress-fill');
    this.integratedProgressBar = document.querySelector('.integrated-progress-bar');
    this.integratedProgressFill = document.querySelector('.integrated-progress-fill');
    this.integratedProgressText = document.querySelector('.integrated-progress-text');

    // Minimap elements
    this.minimapContainer = document.getElementById('content-minimap');
    this.minimapToggle = document.getElementById('sidebar-minimap-toggle');
  }

  /**
   * Extract sections from the document
   */
  private extractSections(): void {
    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');

    this.sections = Array.from(headings).map((heading, index) => {
      const element = heading as HTMLElement;
      const level = parseInt(element.tagName.charAt(1));
      const title = element.textContent?.trim() || '';

      return {
        id: `section-${index}`,
        title,
        level,
        anchor: element.id,
      };
    });

    if (this.isDebugMode) {
      console.log('📚 [Integrated Layout] Extracted sections:', this.sections);
    }
  }

  /**
   * Initialize scroll tracking
   */
  private initializeScrollTracking(): void {
    if (!this.options.enableIntelligentTracking) return;

    this.scrollTracker = new TOCScrollTracker({
      enableProgress: this.options.enableReadingProgress,
      ...this.options.scrollTrackerOptions,
    });

    // Listen for section change events
    document.addEventListener('toc-section-change', this.handleSectionChange as EventListener);

    if (this.isDebugMode) {
      console.log('🎯 [Integrated Layout] Scroll tracking initialized');
    }
  }

  /**
   * Initialize mobile menu functionality
   */
  private initializeMobileMenu(): void {
    if (!this.mobileMenuButton || !this.mobileOverlay) return;

    const openMenu = () => {
      this.isMobileMenuOpen = true;
      this.mobileOverlay?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      if (this.isDebugMode) {
        console.log('📱 [Integrated Layout] Mobile menu opened');
      }
    };

    const closeMenu = () => {
      this.isMobileMenuOpen = false;
      this.mobileOverlay?.classList.add('hidden');
      document.body.style.overflow = '';

      if (this.isDebugMode) {
        console.log('📱 [Integrated Layout] Mobile menu closed');
      }
    };

    this.mobileMenuButton.addEventListener('click', openMenu);
    this.mobileMenuClose?.addEventListener('click', closeMenu);

    // Close on overlay click
    this.mobileOverlay.addEventListener('click', e => {
      if (e.target === this.mobileOverlay) {
        closeMenu();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isMobileMenuOpen) {
        closeMenu();
      }
    });
  }

  /**
   * Initialize TOC controls
   */
  private initializeTOCControls(): void {
    // Expand all sections
    this.tocExpandAllBtn?.addEventListener('click', () => {
      this.expandAllTOCSections();
    });

    // Collapse all sections
    this.tocCollapseAllBtn?.addEventListener('click', () => {
      this.collapseAllTOCSections();
    });

    // TOC link clicks
    this.setupTOCLinks();
  }

  /**
   * Setup TOC link event listeners
   */
  private setupTOCLinks(): void {
    const tocLinks = document.querySelectorAll('.integrated-toc-link, .mobile-toc-link');

    tocLinks.forEach(link => {
      link.addEventListener('click', this.handleTOCLinkClick);
    });
  }

  /**
   * Handle TOC link clicks
   */
  private handleTOCLinkClick = (e: Event): void => {
    e.preventDefault();
    const link = e.currentTarget as HTMLElement;
    const anchor = link.getAttribute('data-anchor');

    if (anchor && this.scrollTracker) {
      this.scrollTracker.scrollToSection(anchor);

      // Close mobile menu if open
      if (this.isMobileMenuOpen) {
        this.mobileOverlay?.classList.add('hidden');
        document.body.style.overflow = '';
        this.isMobileMenuOpen = false;
      }

      if (this.isDebugMode) {
        console.log('🔗 [Integrated Layout] TOC link clicked:', anchor);
      }
    }
  };

  /**
   * Initialize progress tracking
   */
  private initializeProgressTracking(): void {
    if (!this.options.enableReadingProgress) return;

    // Set up progress tracking
    document.addEventListener('scroll', this.updateProgress);

    if (this.isDebugMode) {
      console.log('📊 [Integrated Layout] Progress tracking initialized');
    }
  }

  /**
   * Update reading progress
   */
  private updateProgress = (): void => {
    if (!this.scrollTracker) return;

    const progress = this.scrollTracker.getProgress();

    // Update global progress bar
    if (this.globalProgressFill) {
      this.globalProgressFill.style.width = `${progress}%`;
    }

    // Update integrated progress bar
    if (this.integratedProgressFill) {
      this.integratedProgressFill.style.width = `${progress}%`;
    }

    // Update integrated progress text
    if (this.integratedProgressText) {
      this.integratedProgressText.textContent = `${Math.round(progress)}%`;
    }

    // Update progress bar ARIA attributes
    [this.globalProgressBar, this.integratedProgressBar].forEach(bar => {
      if (bar) {
        bar.setAttribute('aria-valuenow', progress.toString());
      }
    });
  };

  /**
   * Initialize content minimap for complex documents
   */
  private initializeMinimap(): void {
    if (!this.options.enableMinimap || !this.minimapContainer) return;

    this.generateMinimap();

    this.minimapToggle?.addEventListener('click', () => {
      this.toggleMinimap();
    });

    if (this.isDebugMode) {
      console.log('🗺️ [Integrated Layout] Minimap initialized');
    }
  }

  /**
   * Generate minimap content
   */
  private generateMinimap(): void {
    if (!this.minimapContainer) return;

    const minimapContent = this.minimapContainer.querySelector('.minimap-container');
    if (!minimapContent) return;

    const minimapHTML = this.sections
      .map(section => {
        const indent = (section.level - 1) * 8;
        return `
        <div 
          class="minimap-section" 
          data-anchor="${section.anchor}"
          style="margin-left: ${indent}px"
        >
          ${section.title}
        </div>
      `;
      })
      .join('');

    minimapContent.innerHTML = minimapHTML;

    // Add click handlers to minimap sections
    minimapContent.querySelectorAll('.minimap-section').forEach(section => {
      section.addEventListener('click', e => {
        const anchor = (e.currentTarget as HTMLElement).getAttribute('data-anchor');
        if (anchor && this.scrollTracker) {
          this.scrollTracker.scrollToSection(anchor);
        }
      });
    });
  }

  /**
   * Toggle minimap visibility
   */
  private toggleMinimap(): void {
    if (!this.minimapContainer) return;

    this.isMinimapVisible = !this.isMinimapVisible;

    if (this.isMinimapVisible) {
      this.minimapContainer.classList.remove('hidden');
    } else {
      this.minimapContainer.classList.add('hidden');
    }

    if (this.isDebugMode) {
      console.log('🗺️ [Integrated Layout] Minimap toggled:', this.isMinimapVisible);
    }
  }

  /**
   * Initialize adaptive layout
   */
  private initializeAdaptiveLayout(): void {
    if (!this.options.enableAdaptiveLayout) return;

    // Set up ResizeObserver for responsive adjustments
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      if (this.sidebar) {
        this.resizeObserver.observe(this.sidebar);
      }
    }

    // Initial layout adjustment
    this.adjustLayoutForContent();

    if (this.isDebugMode) {
      console.log('📐 [Integrated Layout] Adaptive layout initialized');
    }
  }

  /**
   * Handle resize events
   */
  private handleResize = (): void => {
    this.adjustLayoutForContent();
  };

  /**
   * Adjust layout based on content characteristics
   */
  private adjustLayoutForContent(): void {
    const container = document.querySelector('[data-content-complexity]');
    const complexity = container?.getAttribute('data-content-complexity');

    if (complexity === 'complex') {
      this.enableComplexContentFeatures();
    } else if (complexity === 'simple') {
      this.enableSimpleContentFeatures();
    } else {
      this.enableStandardContentFeatures();
    }
  }

  /**
   * Enable features for complex content
   */
  private enableComplexContentFeatures(): void {
    // Show all controls
    this.tocExpandAllBtn?.classList.remove('hidden');
    this.tocCollapseAllBtn?.classList.remove('hidden');

    if (this.options.enableMinimap) {
      this.minimapToggle?.classList.remove('hidden');
    }

    if (this.isDebugMode) {
      console.log('📚 [Integrated Layout] Complex content features enabled');
    }
  }

  /**
   * Enable features for simple content
   */
  private enableSimpleContentFeatures(): void {
    // Hide unnecessary controls for simple content
    this.tocExpandAllBtn?.classList.add('hidden');
    this.tocCollapseAllBtn?.classList.add('hidden');
    this.minimapToggle?.classList.add('hidden');

    if (this.isDebugMode) {
      console.log('📄 [Integrated Layout] Simple content features enabled');
    }
  }

  /**
   * Enable features for standard content
   */
  private enableStandardContentFeatures(): void {
    // Show basic controls
    this.tocExpandAllBtn?.classList.remove('hidden');
    this.tocCollapseAllBtn?.classList.remove('hidden');
    this.minimapToggle?.classList.add('hidden');

    if (this.isDebugMode) {
      console.log('📖 [Integrated Layout] Standard content features enabled');
    }
  }

  /**
   * Handle section change events from scroll tracker
   */
  private handleSectionChange = (event: CustomEvent): void => {
    const { current, previous, next } = event.detail;
    this.currentSection = current;

    // Update TOC highlighting
    this.updateTOCHighlighting(current, previous, next);

    // Update minimap highlighting
    this.updateMinimapHighlighting(current);

    if (this.isDebugMode) {
      console.log('🔄 [Integrated Layout] Section changed:', {
        current: current?.title,
        previous: previous?.title,
        next: next?.title,
      });
    }
  };

  /**
   * Update TOC highlighting
   */
  private updateTOCHighlighting(current: any, previous: any, next: any): void {
    // Clear all highlights
    const tocLinks = document.querySelectorAll('.integrated-toc-link, .mobile-toc-link');
    tocLinks.forEach(link => {
      link.classList.remove('integrated-toc-active', 'integrated-toc-nearby');
    });

    if (!current) return;

    // Highlight current section
    const currentLinks = document.querySelectorAll(`[data-anchor="${current.id}"]`);
    currentLinks.forEach(link => {
      link.classList.add('integrated-toc-active');
    });

    // Highlight nearby sections
    [previous, next].forEach(section => {
      if (section) {
        const nearbyLinks = document.querySelectorAll(`[data-anchor="${section.id}"]`);
        nearbyLinks.forEach(link => {
          link.classList.add('integrated-toc-nearby');
        });
      }
    });
  }

  /**
   * Update minimap highlighting
   */
  private updateMinimapHighlighting(current: any): void {
    if (!this.minimapContainer || !current) return;

    // Clear previous highlights
    const minimapSections = this.minimapContainer.querySelectorAll('.minimap-section');
    minimapSections.forEach(section => {
      section.classList.remove('active');
    });

    // Highlight current section
    const currentMinimapSection = this.minimapContainer.querySelector(
      `[data-anchor="${current.id}"]`
    );
    currentMinimapSection?.classList.add('active');
  }

  /**
   * Expand all TOC sections
   */
  private expandAllTOCSections(): void {
    // Implementation for expanding collapsible sections if needed
    if (this.isDebugMode) {
      console.log('📖 [Integrated Layout] Expanding all TOC sections');
    }
  }

  /**
   * Collapse all TOC sections
   */
  private collapseAllTOCSections(): void {
    // Implementation for collapsing sections if needed
    if (this.isDebugMode) {
      console.log('📚 [Integrated Layout] Collapsing all TOC sections');
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Already handled in individual initialization methods
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener('toc-section-change', this.handleSectionChange as EventListener);
    document.removeEventListener('scroll', this.updateProgress);
  }

  /**
   * Get current reading progress
   */
  public getReadingProgress(): number {
    return this.scrollTracker?.getProgress() || 0;
  }

  /**
   * Get current section
   */
  public getCurrentSection(): DocSection | null {
    return this.currentSection;
  }

  /**
   * Force update layout
   */
  public forceUpdate(): void {
    this.scrollTracker?.forceUpdate();
    this.adjustLayoutForContent();
  }

  /**
   * Toggle mobile menu (public API)
   */
  public toggleMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.mobileOverlay?.classList.add('hidden');
      document.body.style.overflow = '';
      this.isMobileMenuOpen = false;
    } else {
      this.mobileOverlay?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.isMobileMenuOpen = true;
    }
  }
}
