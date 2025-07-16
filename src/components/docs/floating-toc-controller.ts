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
 * - Hierarchical section folding/expanding
 */

import type { DocSection } from '../../lib/types/docs.js';
import {
  buildTOCHierarchy,
  toggleSection,
  expandSectionAndParents,
  expandAll,
  collapseAll,
  saveTOCState,
  loadTOCState,
  type HierarchicalSection,
} from '../../lib/utils/toc-hierarchy.js';

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
  /** Enable hierarchical collapse/expand */
  enableCollapsible?: boolean;
  /** Document ID for state persistence */
  documentId?: string;
}

export class FloatingTOCController {
  private floatingTOC: HTMLElement | null = null;
  private tocToggle: HTMLElement | null = null;
  private tocContent: HTMLElement | null = null;
  private mobileTocToggle: HTMLElement | null = null;
  private mobileTocOverlay: HTMLElement | null = null;
  private mobileTocClose: HTMLElement | null = null;
  private tabletTocClose: HTMLElement | null = null;
  private resizeHandle: HTMLElement | null = null;

  private isCollapsed = false;
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;
  private scrollTimeout: number | undefined;

  // Hierarchical TOC state
  private tocHierarchy: HierarchicalSection[] = [];
  private originalSections: DocSection[] = [];

  private options: Required<TOCControllerOptions>;

  constructor(options: TOCControllerOptions = {}) {
    this.options = {
      scrollOffset: 100,
      animationDuration: 300,
      enableResize: true,
      resizeConstraints: { min: 200, max: 400 },
      enableCollapsible: true,
      documentId: window.location.pathname,
      ...options,
    };
  }

  /**
   * Initialize the TOC controller
   */
  public initialize(): void {
    const isDebugMode =
      typeof window !== 'undefined' && window.location.search.includes('debug=toc');

    if (isDebugMode) {
      console.log('🚀 [ToC Debug] Initializing FloatingTOC controller with collapsible support');
    }

    this.findElements();
    this.initializeHierarchicalTOC();
    this.setupEventListeners();
    this.updateActiveSection();

    if (isDebugMode) {
      console.log('✅ [ToC Debug] FloatingTOC controller initialized:', {
        floatingTOCFound: !!this.floatingTOC,
        mobileTOCFound: !!this.mobileTocToggle,
        tocLinksCount: document.querySelectorAll('.toc-link, .mobile-toc-link, .tablet-toc-link')
          .length,
        headingsWithId: document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
          .length,
        allHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        hierarchySections: this.tocHierarchy.length,
        collapsibleEnabled: this.options.enableCollapsible,
      });
    }
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
    this.tabletTocClose = document.getElementById('tablet-toc-close');
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
    this.tabletTocClose?.addEventListener('click', this.hideMobileTOC);
    this.mobileTocOverlay?.addEventListener('click', this.handleOverlayClick);

    // Expand/Collapse buttons
    document
      .getElementById('toc-expand-all')
      ?.addEventListener('click', () => this.expandAllSections());
    document
      .getElementById('toc-collapse-all')
      ?.addEventListener('click', () => this.collapseAllSections());
    document
      .getElementById('mobile-toc-expand-all')
      ?.addEventListener('click', () => this.expandAllSections());
    document
      .getElementById('mobile-toc-collapse-all')
      ?.addEventListener('click', () => this.collapseAllSections());
    document
      .getElementById('tablet-toc-expand-all')
      ?.addEventListener('click', () => this.expandAllSections());
    document
      .getElementById('tablet-toc-collapse-all')
      ?.addEventListener('click', () => this.collapseAllSections());

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
    this.tabletTocClose?.removeEventListener('click', this.hideMobileTOC);
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
    const tocLinks = document.querySelectorAll('.toc-link, .mobile-toc-link, .tablet-toc-link');

    tocLinks.forEach(link => {
      link.addEventListener('click', this.handleTocLinkClick);
    });

    // Mobile and tablet TOC links also close the overlay
    const mobileTocLinks = document.querySelectorAll('.mobile-toc-link, .tablet-toc-link');
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
    const isDebugMode =
      typeof window !== 'undefined' && window.location.search.includes('debug=toc');

    if (isDebugMode) {
      console.log('🔗 [ToC Debug] Link clicked:', {
        anchor,
        href: link.getAttribute('href'),
        linkElement: link,
      });
    }

    if (anchor) {
      const target = document.getElementById(anchor);

      if (isDebugMode) {
        console.log('🎯 [ToC Debug] Target search result:', {
          anchor,
          targetElement: target,
          targetExists: !!target,
          allIdsInDOM: Array.from(document.querySelectorAll('[id]')).map(el => el.id),
        });
      }

      if (target) {
        const offset = 100; // Account for fixed headers (64px header + 36px margin)
        const targetPosition = target.offsetTop - offset;

        if (isDebugMode) {
          console.log('📜 [ToC Debug] Scrolling to target:', {
            anchor,
            targetOffsetTop: target.offsetTop,
            offset,
            finalPosition: targetPosition,
            currentScrollY: window.scrollY,
          });
        }

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });

        // Update active section after scroll
        setTimeout(() => {
          this.updateActiveSection();
        }, 100);
      } else if (isDebugMode) {
        console.warn('⚠️ [ToC Debug] Target element not found:', {
          anchor,
          availableIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id),
          tocSections: Array.from(document.querySelectorAll('.toc-link')).map(link => ({
            anchor: link.getAttribute('data-anchor'),
            href: link.getAttribute('href'),
          })),
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
    const tocLinks = document.querySelectorAll('.toc-link, .mobile-toc-link, .tablet-toc-link');

    let currentSection: Element | null = null;
    const scrollTop = window.scrollY + this.options.scrollOffset;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top + window.scrollY <= scrollTop) {
        currentSection = section;
      }
    });

    // Smart expand current section if collapsible is enabled
    if (currentSection && this.options.enableCollapsible) {
      const sectionElement = currentSection as HTMLElement;
      const sectionId = sectionElement.id;
      if (sectionId) {
        this.expandCurrentSection(sectionId);
      }
    }

    // Update active states
    tocLinks.forEach(link => {
      const anchor = link.getAttribute('data-anchor');
      if (currentSection && (currentSection as HTMLElement).id === anchor) {
        link.classList.add('text-blue-600', 'bg-blue-50', 'font-medium');
        link.classList.remove('text-gray-600', 'text-gray-700');
      } else {
        link.classList.remove('text-blue-600', 'bg-blue-50', 'font-medium');
        if (
          link.classList.contains('mobile-toc-link') ||
          link.classList.contains('tablet-toc-link')
        ) {
          link.classList.add('text-gray-700');
        } else {
          link.classList.add('text-gray-600');
        }
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
      return;
    }

    // Handle TOC navigation when focused
    const activeElement = document.activeElement;
    if (!activeElement || !this.isTOCElement(activeElement)) {
      return;
    }

    // TOC-specific keyboard shortcuts
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.navigateTOC('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.navigateTOC('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.collapseFocusedSection();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.expandFocusedSection();
        break;
      case 'Home':
        e.preventDefault();
        this.focusFirstTOCItem();
        break;
      case 'End':
        e.preventDefault();
        this.focusLastTOCItem();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeElement.classList.contains('toc-section-toggle')) {
          (activeElement as HTMLElement).click();
        } else {
          (activeElement as HTMLElement).click();
        }
        break;
    }
  };

  /**
   * Check if element is part of TOC
   */
  private isTOCElement(element: Element): boolean {
    return element.closest('#floating-toc, #mobile-toc-overlay') !== null;
  }

  /**
   * Navigate TOC with arrow keys
   */
  private navigateTOC(direction: 'up' | 'down'): void {
    const focusableElements = this.getFocusableTOCElements();
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);

    if (currentIndex === -1) return;

    const nextIndex =
      direction === 'up'
        ? Math.max(0, currentIndex - 1)
        : Math.min(focusableElements.length - 1, currentIndex + 1);

    focusableElements[nextIndex]?.focus();
  }

  /**
   * Get all focusable TOC elements
   */
  private getFocusableTOCElements(): HTMLElement[] {
    const selectors = [
      '#floating-toc .toc-link',
      '#floating-toc .toc-section-toggle',
      '#mobile-toc-overlay .mobile-toc-link',
      '#mobile-toc-overlay .tablet-toc-link',
      '#mobile-toc-overlay .toc-section-toggle',
    ];

    const elements: HTMLElement[] = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      found.forEach(el => elements.push(el as HTMLElement));
    });

    return elements.filter(el => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  /**
   * Focus first TOC item
   */
  private focusFirstTOCItem(): void {
    const elements = this.getFocusableTOCElements();
    elements[0]?.focus();
  }

  /**
   * Focus last TOC item
   */
  private focusLastTOCItem(): void {
    const elements = this.getFocusableTOCElements();
    elements[elements.length - 1]?.focus();
  }

  /**
   * Collapse focused section
   */
  private collapseFocusedSection(): void {
    const activeElement = document.activeElement;
    if (!activeElement) return;

    const sectionToggle = activeElement
      .closest('.toc-section-container')
      ?.querySelector('.toc-section-toggle') as HTMLElement;
    if (sectionToggle && sectionToggle.getAttribute('aria-expanded') === 'true') {
      sectionToggle.click();
    }
  }

  /**
   * Expand focused section
   */
  private expandFocusedSection(): void {
    const activeElement = document.activeElement;
    if (!activeElement) return;

    const sectionToggle = activeElement
      .closest('.toc-section-container')
      ?.querySelector('.toc-section-toggle') as HTMLElement;
    if (sectionToggle && sectionToggle.getAttribute('aria-expanded') === 'false') {
      sectionToggle.click();
    }
  }

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

  /**
   * Initialize hierarchical TOC structure
   */
  private initializeHierarchicalTOC(): void {
    if (!this.options.enableCollapsible) return;

    // Extract sections from DOM
    this.originalSections = this.extractSectionsFromDOM();

    // Build hierarchy
    this.tocHierarchy = buildTOCHierarchy(this.originalSections);

    // Load saved state
    this.tocHierarchy = loadTOCState(this.tocHierarchy, this.options.documentId);

    // Render hierarchical TOC
    this.renderHierarchicalTOC();
  }

  /**
   * Extract sections from DOM
   */
  private extractSectionsFromDOM(): DocSection[] {
    const sections: DocSection[] = [];
    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const title = heading.textContent?.trim() || '';
      const anchor = heading.id;

      sections.push({
        id: `section-${index}`,
        title,
        level,
        anchor,
      });
    });

    return sections;
  }

  /**
   * Render hierarchical TOC structure
   */
  private renderHierarchicalTOC(): void {
    const tocContainers = [
      this.tocContent,
      document.querySelector('#mobile-toc-overlay nav ul'),
      document.querySelector('#mobile-toc-overlay .hidden.md\\:block nav ul'),
    ];

    tocContainers.forEach(container => {
      if (container) {
        this.renderTOCInContainer(container as HTMLElement);
      }
    });
  }

  /**
   * Render TOC in specific container
   */
  private renderTOCInContainer(container: HTMLElement): void {
    container.innerHTML = '';
    this.renderSections(this.tocHierarchy, container, 0);
  }

  /**
   * Render sections recursively
   */
  private renderSections(
    sections: HierarchicalSection[],
    container: HTMLElement,
    depth: number
  ): void {
    sections.forEach(section => {
      const li = document.createElement('li');
      li.style.marginLeft = `${depth * 0.75}rem`;

      // Create section container
      const sectionContainer = document.createElement('div');
      sectionContainer.className = 'toc-section-container';

      // Create toggle button for sections with children
      if (section.children.length > 0) {
        const toggleButton = document.createElement('button');
        toggleButton.className = `toc-section-toggle inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded`;
        toggleButton.setAttribute('aria-expanded', section.expanded.toString());
        toggleButton.setAttribute(
          'aria-label',
          `${section.expanded ? '折りたたむ' : '展開する'}: ${section.title}`
        );
        toggleButton.setAttribute('aria-controls', `toc-section-${section.id}`);
        toggleButton.setAttribute('data-section-id', section.id);
        toggleButton.setAttribute('tabindex', '0');
        toggleButton.innerHTML = `
          <svg class="w-3 h-3 transition-transform ${section.expanded ? 'rotate-90' : ''}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
          </svg>
        `;

        toggleButton.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.handleSectionToggle(section.id);
        });

        sectionContainer.appendChild(toggleButton);
      }

      // Create section link
      const link = document.createElement('a');
      link.href = `#${section.anchor}`;
      link.className = `block py-1 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 toc-link focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`;
      link.setAttribute('data-anchor', section.anchor);
      link.setAttribute('data-level', section.level.toString());
      link.setAttribute('aria-label', `${section.title}へ移動`);
      link.setAttribute('tabindex', '0');

      const span = document.createElement('span');
      span.className =
        section.level === 1 ? 'font-medium' : section.level === 2 ? 'font-normal' : 'text-sm';
      span.textContent = section.title;

      link.appendChild(span);
      sectionContainer.appendChild(link);
      li.appendChild(sectionContainer);

      // Add children if expanded
      if (section.children.length > 0 && section.expanded) {
        const childrenContainer = document.createElement('ul');
        childrenContainer.className = 'toc-children space-y-1 mt-1';
        childrenContainer.setAttribute('id', `toc-section-${section.id}`);
        childrenContainer.setAttribute('role', 'group');
        childrenContainer.setAttribute('aria-labelledby', `toc-section-${section.id}-label`);
        this.renderSections(section.children, childrenContainer, depth + 1);
        li.appendChild(childrenContainer);
      }

      container.appendChild(li);
    });
  }

  /**
   * Handle section toggle
   */
  private handleSectionToggle = (sectionId: string): void => {
    this.tocHierarchy = toggleSection(this.tocHierarchy, sectionId);
    this.renderHierarchicalTOC();
    this.setupTocLinks(); // Re-setup event listeners

    // Save state
    saveTOCState(this.tocHierarchy, this.options.documentId);

    const isDebugMode =
      typeof window !== 'undefined' && window.location.search.includes('debug=toc');
    if (isDebugMode) {
      console.log('🔄 [ToC Debug] Section toggled:', { sectionId, hierarchy: this.tocHierarchy });
    }
  };

  /**
   * Smart expand current section
   */
  private expandCurrentSection(currentAnchor: string): void {
    if (!this.options.enableCollapsible) return;

    const currentSection = this.originalSections.find(s => s.anchor === currentAnchor);
    if (currentSection) {
      this.tocHierarchy = expandSectionAndParents(this.tocHierarchy, currentSection.id);
      this.renderHierarchicalTOC();
      this.setupTocLinks();
      saveTOCState(this.tocHierarchy, this.options.documentId);
    }
  }

  /**
   * Public method to expand all sections
   */
  public expandAllSections(): void {
    if (!this.options.enableCollapsible) return;

    this.tocHierarchy = expandAll(this.tocHierarchy);
    this.renderHierarchicalTOC();
    this.setupTocLinks();
    saveTOCState(this.tocHierarchy, this.options.documentId);
  }

  /**
   * Public method to collapse all sections
   */
  public collapseAllSections(): void {
    if (!this.options.enableCollapsible) return;

    this.tocHierarchy = collapseAll(this.tocHierarchy);
    this.renderHierarchicalTOC();
    this.setupTocLinks();
    saveTOCState(this.tocHierarchy, this.options.documentId);
  }
}
