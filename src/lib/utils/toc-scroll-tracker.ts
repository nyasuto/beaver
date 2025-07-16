/**
 * TOC Scroll Tracker
 *
 * Advanced table of contents scroll tracking with Intersection Observer API
 * Provides real-time section highlighting and reading progress tracking
 */

export interface TOCScrollTrackerOptions {
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Intersection threshold */
  threshold?: number;
  /** Debounce delay for scroll events */
  debounceDelay?: number;
  /** Enable reading progress tracking */
  enableProgress?: boolean;
  /** Progress bar selector */
  progressBarSelector?: string;
}

export interface SectionEntry {
  id: string;
  element: HTMLElement;
  level: number;
  title: string;
  progress: number;
}

export class TOCScrollTracker {
  private observer!: IntersectionObserver;
  private sections: SectionEntry[] = [];
  private currentSection: SectionEntry | null = null;
  private previousSection: SectionEntry | null = null;
  private nextSection: SectionEntry | null = null;
  private progressBar: HTMLElement | null = null;
  private options: Required<TOCScrollTrackerOptions>;
  private isDebugMode: boolean;

  constructor(options: TOCScrollTrackerOptions = {}) {
    this.options = {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
      debounceDelay: 100,
      enableProgress: true,
      progressBarSelector: '.reading-progress-bar',
      ...options,
    };

    this.isDebugMode =
      typeof window !== 'undefined' && window.location.search.includes('debug=toc');

    this.initializeObserver();
    this.initializeSections();
    this.initializeProgressBar();
    this.startTracking();

    if (this.isDebugMode) {
      console.log('🔍 [TOC Tracker] Initialized with options:', this.options);
      console.log('📊 [TOC Tracker] Found sections:', this.sections.length);
    }
  }

  /**
   * Initialize Intersection Observer
   */
  private initializeObserver(): void {
    this.observer = new IntersectionObserver(
      entries => {
        this.handleIntersection(entries);
      },
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold,
      }
    );
  }

  /**
   * Initialize sections from DOM
   */
  private initializeSections(): void {
    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');

    this.sections = Array.from(headings).map((heading, _index) => {
      const element = heading as HTMLElement;
      const level = parseInt(element.tagName.charAt(1));
      const title = element.textContent?.trim() || '';

      return {
        id: element.id,
        element,
        level,
        title,
        progress: 0,
      };
    });

    if (this.isDebugMode) {
      console.log('📚 [TOC Tracker] Sections initialized:', this.sections);
    }
  }

  /**
   * Initialize reading progress bar
   */
  private initializeProgressBar(): void {
    if (!this.options.enableProgress) return;

    this.progressBar = document.querySelector(this.options.progressBarSelector);

    if (!this.progressBar) {
      // Create progress bar if it doesn't exist
      this.progressBar = document.createElement('div');
      this.progressBar.className = 'reading-progress-bar';
      this.progressBar.setAttribute('role', 'progressbar');
      this.progressBar.setAttribute('aria-label', '読書進捗');
      this.progressBar.setAttribute('aria-valuemin', '0');
      this.progressBar.setAttribute('aria-valuemax', '100');
      this.progressBar.setAttribute('aria-valuenow', '0');
      this.progressBar.innerHTML = '<div class="reading-progress-fill"></div>';
      document.body.appendChild(this.progressBar);

      if (this.isDebugMode) {
        console.log('📊 [TOC Tracker] Created progress bar');
      }
    } else {
      // Ensure existing progress bar has proper ARIA attributes
      this.progressBar.setAttribute('aria-valuemin', '0');
      this.progressBar.setAttribute('aria-valuemax', '100');
      this.progressBar.setAttribute('aria-valuenow', '0');
    }
  }

  /**
   * Start tracking sections
   */
  private startTracking(): void {
    this.sections.forEach(section => {
      this.observer.observe(section.element);
    });
  }

  /**
   * Handle intersection observer entries
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      const section = this.sections.find(s => s.element === entry.target);
      if (!section) return;

      if (entry.isIntersecting) {
        this.setCurrentSection(section);
      }
    });
  }

  /**
   * Set current section and update UI
   */
  private setCurrentSection(section: SectionEntry): void {
    if (this.currentSection?.id === section.id) return;

    this.previousSection = this.currentSection;
    this.currentSection = section;
    this.nextSection = this.getNextSection(section);

    this.updateTOCHighlight();
    this.updateProgress();

    if (this.isDebugMode) {
      console.log('🎯 [TOC Tracker] Current section changed:', {
        current: this.currentSection?.title,
        previous: this.previousSection?.title,
        next: this.nextSection?.title,
      });
    }

    // Dispatch custom event
    this.dispatchSectionChangeEvent();
  }

  /**
   * Get next section in sequence
   */
  private getNextSection(current: SectionEntry): SectionEntry | null {
    const currentIndex = this.sections.findIndex(s => s.id === current.id);
    return currentIndex < this.sections.length - 1 ? this.sections[currentIndex + 1] || null : null;
  }

  /**
   * Update TOC highlighting
   */
  private updateTOCHighlight(): void {
    // Clear all highlights
    const tocLinks = document.querySelectorAll('.toc-link, .mobile-toc-link, .tablet-toc-link');
    tocLinks.forEach(link => {
      link.classList.remove('toc-active', 'toc-nearby', 'toc-previous', 'toc-next');
      link.classList.remove('text-blue-600', 'bg-blue-50', 'font-medium');
      link.classList.remove('text-gray-500', 'bg-gray-50');
    });

    if (!this.currentSection) return;

    // Highlight current section
    const currentLinks = document.querySelectorAll(`[data-anchor="${this.currentSection.id}"]`);
    currentLinks.forEach(link => {
      link.classList.add('toc-active', 'text-blue-600', 'bg-blue-50', 'font-medium');
    });

    // Highlight nearby sections
    if (this.previousSection) {
      const prevLinks = document.querySelectorAll(`[data-anchor="${this.previousSection.id}"]`);
      prevLinks.forEach(link => {
        link.classList.add('toc-previous', 'text-gray-500', 'bg-gray-50');
      });
    }

    if (this.nextSection) {
      const nextLinks = document.querySelectorAll(`[data-anchor="${this.nextSection.id}"]`);
      nextLinks.forEach(link => {
        link.classList.add('toc-next', 'text-gray-500', 'bg-gray-50');
      });
    }
  }

  /**
   * Update reading progress
   */
  private updateProgress(): void {
    if (!this.options.enableProgress || !this.progressBar) return;

    const currentIndex = this.sections.findIndex(s => s.id === this.currentSection?.id);
    const progress =
      this.sections.length > 0 ? ((currentIndex + 1) / this.sections.length) * 100 : 0;

    const progressFill = this.progressBar.querySelector('.reading-progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
      this.progressBar.setAttribute('aria-valuenow', progress.toString());
      this.progressBar.setAttribute('aria-valuemin', '0');
      this.progressBar.setAttribute('aria-valuemax', '100');
    }

    if (this.isDebugMode) {
      console.log('📊 [TOC Tracker] Progress updated:', `${progress.toFixed(1)}%`);
    }
  }

  /**
   * Dispatch section change event
   */
  private dispatchSectionChangeEvent(): void {
    const event = new CustomEvent('toc-section-change', {
      detail: {
        current: this.currentSection,
        previous: this.previousSection,
        next: this.nextSection,
      },
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current section
   */
  public getCurrentSection(): SectionEntry | null {
    return this.currentSection;
  }

  /**
   * Get reading progress percentage
   */
  public getProgress(): number {
    if (this.sections.length === 0) return 0;
    const currentIndex = this.sections.findIndex(s => s.id === this.currentSection?.id);
    return currentIndex >= 0 ? ((currentIndex + 1) / this.sections.length) * 100 : 0;
  }

  /**
   * Scroll to section smoothly
   */
  public scrollToSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;

    const offset = 100; // Account for fixed headers
    const targetPosition = section.element.offsetTop - offset;

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });

    if (this.isDebugMode) {
      console.log('🎯 [TOC Tracker] Scrolling to section:', section.title);
    }
  }

  /**
   * Force update highlighting
   */
  public forceUpdate(): void {
    const scrollTop = window.scrollY + 100;
    let closestSection: SectionEntry | null = null;

    this.sections.forEach(section => {
      const rect = section.element.getBoundingClientRect();
      if (rect.top + window.scrollY <= scrollTop) {
        closestSection = section;
      }
    });

    if (closestSection) {
      this.setCurrentSection(closestSection);
    }
  }

  /**
   * Cleanup observer
   */
  public destroy(): void {
    this.observer.disconnect();

    if (this.isDebugMode) {
      console.log('🧹 [TOC Tracker] Destroyed');
    }
  }
}
