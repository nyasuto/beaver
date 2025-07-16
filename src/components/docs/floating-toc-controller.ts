/**
 * Floating TOC Controller
 *
 * Handles all floating table of contents functionality including:
 * - Desktop TOC collapse/expand
 * - Mobile TOC overlay
 * - Active section highlighting
 * - Smooth scrolling
 * - Resize functionality
 * - Keyboard navigation
 */

export interface TOCControllerOptions {
  /** Scroll offset for active section detection */
  scrollOffset?: number;
  /** Animation duration for smooth scrolling */
  animationDuration?: number;
  /** Enable resize functionality */
  enableResize?: boolean;
  /** Minimum and maximum width for resizing */
  resizeConstraints?: {
    min: number;
    max: number;
  };
}

export class FloatingTOCController {
  private floatingTOC: HTMLElement | null = null;
  private tocToggle: HTMLElement | null = null;
  private tocContent: HTMLElement | null = null;
  private mobileTocToggle: HTMLElement | null = null;
  private mobileTocOverlay: HTMLElement | null = null;
  private mobileTocClose: HTMLElement | null = null;
  private resizeHandle: HTMLElement | null = null;

  private isCollapsed = false;
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;
  private scrollTimeout: number | undefined;

  private options: Required<TOCControllerOptions>;

  constructor(options: TOCControllerOptions = {}) {
    this.options = {
      scrollOffset: 100,
      animationDuration: 300,
      enableResize: true,
      resizeConstraints: { min: 200, max: 400 },
      ...options,
    };
  }

  /**
   * Initialize the TOC controller
   */
  public initialize(): void {
    this.findElements();
    this.setupEventListeners();
    this.updateActiveSection();
  }

  /**
   * Cleanup event listeners
   */
  public destroy(): void {
    this.removeEventListeners();
  }

  /**
   * Find all necessary DOM elements
   */
  private findElements(): void {
    this.floatingTOC = document.getElementById('floating-toc');
    this.tocToggle = document.getElementById('toc-toggle');
    this.tocContent = document.getElementById('toc-content');
    this.mobileTocToggle = document.getElementById('mobile-toc-toggle');
    this.mobileTocOverlay = document.getElementById('mobile-toc-overlay');
    this.mobileTocClose = document.getElementById('mobile-toc-close');
    this.resizeHandle = document.getElementById('toc-resize-handle');
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    // Desktop TOC toggle
    this.tocToggle?.addEventListener('click', this.handleTocToggle);

    // Mobile TOC
    this.mobileTocToggle?.addEventListener('click', this.showMobileTOC);
    this.mobileTocClose?.addEventListener('click', this.hideMobileTOC);
    this.mobileTocOverlay?.addEventListener('click', this.handleOverlayClick);

    // TOC links
    this.setupTocLinks();

    // Scroll listener
    window.addEventListener('scroll', this.handleScroll);

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeydown);

    // Resize functionality
    if (this.options.enableResize && this.resizeHandle) {
      this.resizeHandle.addEventListener('mousedown', this.handleResizeStart);
    }
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    this.tocToggle?.removeEventListener('click', this.handleTocToggle);
    this.mobileTocToggle?.removeEventListener('click', this.showMobileTOC);
    this.mobileTocClose?.removeEventListener('click', this.hideMobileTOC);
    this.mobileTocOverlay?.removeEventListener('click', this.handleOverlayClick);

    window.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.handleResizeEnd);
  }

  /**
   * Handle desktop TOC toggle
   */
  private handleTocToggle = (): void => {
    this.isCollapsed = !this.isCollapsed;

    if (this.tocContent) {
      this.tocContent.style.display = this.isCollapsed ? 'none' : 'block';
    }

    if (this.tocToggle) {
      const icon = this.tocToggle.querySelector('svg');
      if (icon) {
        icon.style.transform = this.isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    }
  };

  /**
   * Show mobile TOC overlay
   */
  private showMobileTOC = (): void => {
    this.mobileTocOverlay?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  /**
   * Hide mobile TOC overlay
   */
  private hideMobileTOC = (): void => {
    this.mobileTocOverlay?.classList.add('hidden');
    document.body.style.overflow = '';
  };

  /**
   * Handle overlay click to close mobile TOC
   */
  private handleOverlayClick = (e: Event): void => {
    if (e.target === this.mobileTocOverlay) {
      this.hideMobileTOC();
    }
  };

  /**
   * Setup TOC link event listeners
   */
  private setupTocLinks(): void {
    const tocLinks = document.querySelectorAll('.toc-link, .mobile-toc-link');

    tocLinks.forEach(link => {
      link.addEventListener('click', this.handleTocLinkClick);
    });

    // Mobile TOC links also close the overlay
    const mobileTocLinks = document.querySelectorAll('.mobile-toc-link');
    mobileTocLinks.forEach(link => {
      link.addEventListener('click', this.hideMobileTOC);
    });
  }

  /**
   * Handle TOC link clicks for smooth scrolling
   */
  private handleTocLinkClick = (e: Event): void => {
    e.preventDefault();
    const link = e.currentTarget as HTMLElement;
    const anchor = link.getAttribute('data-anchor');

    if (anchor) {
      const target = document.getElementById(anchor);
      if (target) {
        const offset = 80; // Account for fixed headers
        const targetPosition = target.offsetTop - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }
    }
  };

  /**
   * Handle scroll events for active section highlighting
   */
  private handleScroll = (): void => {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = window.setTimeout(() => {
      this.updateActiveSection();
    }, 10);
  };

  /**
   * Update active section highlighting
   */
  private updateActiveSection(): void {
    const sections = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    const tocLinks = document.querySelectorAll('.toc-link, .mobile-toc-link');

    let currentSection: Element | null = null;
    const scrollTop = window.scrollY + this.options.scrollOffset;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top + window.scrollY <= scrollTop) {
        currentSection = section;
      }
    });

    // Update active states
    tocLinks.forEach(link => {
      const anchor = link.getAttribute('data-anchor');
      if (currentSection && currentSection.id === anchor) {
        link.classList.add('text-blue-600', 'bg-blue-50', 'font-medium');
        link.classList.remove('text-gray-600');
      } else {
        link.classList.remove('text-blue-600', 'bg-blue-50', 'font-medium');
        link.classList.add('text-gray-600');
      }
    });
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown = (e: KeyboardEvent): void => {
    // Escape key closes mobile TOC
    if (e.key === 'Escape' && !this.mobileTocOverlay?.classList.contains('hidden')) {
      this.hideMobileTOC();
    }
  };

  /**
   * Handle resize start
   */
  private handleResizeStart = (e: MouseEvent): void => {
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.floatingTOC?.offsetWidth || 256;
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', this.handleResize);
    document.addEventListener('mouseup', this.handleResizeEnd);
  };

  /**
   * Handle resize movement
   */
  private handleResize = (e: MouseEvent): void => {
    if (!this.isResizing || !this.floatingTOC) return;

    const diff = this.startX - e.clientX;
    const newWidth = Math.max(
      this.options.resizeConstraints.min,
      Math.min(this.options.resizeConstraints.max, this.startWidth + diff)
    );

    this.floatingTOC.style.width = `${newWidth}px`;
  };

  /**
   * Handle resize end
   */
  private handleResizeEnd = (): void => {
    this.isResizing = false;
    document.body.style.cursor = '';

    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.handleResizeEnd);
  };

  /**
   * Public method to manually update active section
   */
  public forceUpdateActiveSection(): void {
    this.updateActiveSection();
  }

  /**
   * Public method to toggle desktop TOC
   */
  public toggleDesktopTOC(): void {
    this.handleTocToggle();
  }

  /**
   * Public method to show mobile TOC
   */
  public openMobileTOC(): void {
    this.showMobileTOC();
  }

  /**
   * Public method to hide mobile TOC
   */
  public closeMobileTOC(): void {
    this.hideMobileTOC();
  }
}
