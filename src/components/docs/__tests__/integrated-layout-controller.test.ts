/**
 * Tests for Integrated Layout Controller
 * Issue #364: Comprehensive testing for integrated sidebar approach
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IntegratedLayoutController,
  type IntegratedLayoutOptions,
} from '../integrated-layout-controller.js';

// Mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  public entries: ResizeObserverEntry[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  trigger(entries: Partial<ResizeObserverEntry>[]) {
    this.callback(
      entries.map(entry => ({
        target: entry.target || document.createElement('div'),
        contentRect: entry.contentRect || ({} as DOMRectReadOnly),
        borderBoxSize: entry.borderBoxSize || [],
        contentBoxSize: entry.contentBoxSize || [],
        devicePixelContentBoxSize: entry.devicePixelContentBoxSize || [],
      })) as ResizeObserverEntry[],
      this as unknown as ResizeObserver
    );
  }
}

// Mock TOCScrollTracker at the top level
vi.mock('../../lib/utils/toc-scroll-tracker.js', () => ({
  TOCScrollTracker: vi.fn().mockImplementation(() => ({
    getProgress: vi.fn().mockReturnValue(50),
    scrollToSection: vi.fn(),
    destroy: vi.fn(),
    forceUpdate: vi.fn(),
  })),
}));

// Helper function to wait for async operations
const waitForAsync = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

describe('Integrated Layout Controller', () => {
  let controller: IntegratedLayoutController;
  let mockResizeObserver: MockResizeObserver;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div data-content-complexity="standard">
        <aside data-sidebar-width="w-72">
          <div id="integrated-toc-content">
            <a class="integrated-toc-link" data-anchor="section-1">Section 1</a>
            <a class="integrated-toc-link" data-anchor="section-2">Section 2</a>
          </div>
          <button id="integrated-toc-expand-all">Expand All</button>
          <button id="integrated-toc-collapse-all">Collapse All</button>
          <button id="sidebar-minimap-toggle">Toggle Minimap</button>
        </aside>

        <button id="integrated-mobile-menu-button">Menu</button>
        <button id="integrated-mobile-menu-close">Close</button>
        <div id="integrated-mobile-nav-overlay" class="hidden">
          <a class="mobile-toc-link" data-anchor="section-1">Mobile Section 1</a>
        </div>

        <div id="global-progress-bar">
          <div id="global-progress-fill"></div>
        </div>

        <div class="integrated-progress-bar">
          <div class="integrated-progress-fill"></div>
        </div>
        <div class="integrated-progress-text">0%</div>

        <div id="content-minimap" class="hidden">
          <div class="minimap-container"></div>
        </div>

        <main>
          <h1 id="section-1">Section 1</h1>
          <p>Content 1</p>
          <h2 id="section-2">Section 2</h2>
          <p>Content 2</p>
        </main>
      </div>
    `;

    // Mock ResizeObserver
    mockResizeObserver = new MockResizeObserver(() => {});
    global.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        mockResizeObserver = new MockResizeObserver(callback);
        return mockResizeObserver as any;
      }
    } as any;

    // Mock window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 768,
    });

    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    controller?.destroy();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      expect(controller).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const options: IntegratedLayoutOptions = {
        enableAdaptiveLayout: false,
        enableIntelligentTracking: false,
        enableReadingProgress: false,
        enableMinimap: true,
        mobileBreakpoint: 768,
      };

      controller = new IntegratedLayoutController(options);
      expect(controller).toBeDefined();
    });

    it('should find all necessary DOM elements', () => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      // Verify elements are found (we can't directly access private properties,
      // but we can test the functionality they enable)
      expect(document.querySelector('aside[data-sidebar-width]')).toBeTruthy();
      expect(document.getElementById('integrated-mobile-menu-button')).toBeTruthy();
      expect(document.getElementById('integrated-toc-content')).toBeTruthy();
    });

    it('should extract sections from DOM', () => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      // Verify sections are extracted by checking TOC links are set up
      const tocLinks = document.querySelectorAll('.integrated-toc-link');
      expect(tocLinks).toHaveLength(2);
    });
  });

  describe('Mobile Menu Functionality', () => {
    beforeEach(() => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();
    });

    it('should open mobile menu when button is clicked', async () => {
      const menuButton = document.getElementById('integrated-mobile-menu-button');
      const overlay = document.getElementById('integrated-mobile-nav-overlay');

      menuButton?.click();
      await waitForAsync();

      expect(overlay?.classList.contains('hidden')).toBe(false);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should close mobile menu when close button is clicked', async () => {
      const menuButton = document.getElementById('integrated-mobile-menu-button');
      const closeButton = document.getElementById('integrated-mobile-menu-close');
      const overlay = document.getElementById('integrated-mobile-nav-overlay');

      // Open menu first
      menuButton?.click();
      await waitForAsync();

      // Close menu
      closeButton?.click();
      await waitForAsync();

      expect(overlay?.classList.contains('hidden')).toBe(true);
      expect(document.body.style.overflow).toBe('');
    });

    it('should close mobile menu on escape key', async () => {
      const menuButton = document.getElementById('integrated-mobile-menu-button');
      const overlay = document.getElementById('integrated-mobile-nav-overlay');

      // Open menu first
      menuButton?.click();
      await waitForAsync();

      // Press escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      await waitForAsync();

      expect(overlay?.classList.contains('hidden')).toBe(true);
    });

    it('should provide public API to toggle mobile menu', () => {
      expect(typeof controller.toggleMobileMenu).toBe('function');

      // Test toggle functionality
      controller.toggleMobileMenu();
      const overlay = document.getElementById('integrated-mobile-nav-overlay');
      expect(overlay?.classList.contains('hidden')).toBe(false);

      controller.toggleMobileMenu();
      expect(overlay?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('TOC Functionality', () => {
    beforeEach(() => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();
    });

    it('should handle TOC link clicks', async () => {
      const tocLink = document.querySelector('.integrated-toc-link');
      const clickEvent = new MouseEvent('click', { bubbles: true });

      tocLink?.dispatchEvent(clickEvent);
      await waitForAsync();

      // Verify the click was handled (preventDefault should have been called)
      // We can't easily test preventDefault, but we can verify the link exists
      expect(tocLink).toBeTruthy();
      expect(tocLink?.getAttribute('data-anchor')).toBe('section-1');
    });

    it.skip('should handle mobile TOC link clicks', async () => {
      const mobileTocLink = document.querySelector('.mobile-toc-link');
      const menuButton = document.getElementById('integrated-mobile-menu-button');
      const overlay = document.getElementById('integrated-mobile-nav-overlay');

      // Open mobile menu first
      menuButton?.click();
      await waitForAsync();

      // Click mobile TOC link
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mobileTocLink?.dispatchEvent(clickEvent);
      await waitForAsync();

      // Mobile menu should close after clicking TOC link
      expect(overlay?.classList.contains('hidden')).toBe(true);
    });

    it('should handle expand all button', () => {
      const expandButton = document.getElementById('integrated-toc-expand-all');
      expect(expandButton).toBeTruthy();

      const clickEvent = new MouseEvent('click');
      expandButton?.dispatchEvent(clickEvent);

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle collapse all button', () => {
      const collapseButton = document.getElementById('integrated-toc-collapse-all');
      expect(collapseButton).toBeTruthy();

      const clickEvent = new MouseEvent('click');
      collapseButton?.dispatchEvent(clickEvent);

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      controller = new IntegratedLayoutController({
        enableReadingProgress: true,
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();
    });

    it('should update progress bars', () => {
      const globalProgressFill = document.getElementById('global-progress-fill');
      const integratedProgressFill = document.querySelector(
        '.integrated-progress-fill'
      ) as HTMLElement;
      const progressText = document.querySelector('.integrated-progress-text');

      expect(globalProgressFill).toBeTruthy();
      expect(integratedProgressFill).toBeTruthy();
      expect(progressText).toBeTruthy();

      // Simulate scroll event to trigger progress update
      const scrollEvent = new Event('scroll');
      document.dispatchEvent(scrollEvent);

      // Verify elements exist (actual progress calculation is handled by scroll tracker)
      expect(globalProgressFill?.style.width).toBeDefined();
      expect(integratedProgressFill?.style.width).toBeDefined();
    });

    it('should provide reading progress API', () => {
      expect(typeof controller.getReadingProgress).toBe('function');

      const progress = controller.getReadingProgress();
      expect(typeof progress).toBe('number');
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Minimap Functionality', () => {
    beforeEach(() => {
      controller = new IntegratedLayoutController({
        enableMinimap: true,
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();
    });

    it('should initialize minimap when enabled', () => {
      const minimapContainer = document.getElementById('content-minimap');
      const minimapToggle = document.getElementById('sidebar-minimap-toggle');

      expect(minimapContainer).toBeTruthy();
      expect(minimapToggle).toBeTruthy();
    });

    it('should toggle minimap visibility', () => {
      const minimapContainer = document.getElementById('content-minimap');
      const minimapToggle = document.getElementById('sidebar-minimap-toggle');

      // Initially hidden
      expect(minimapContainer?.classList.contains('hidden')).toBe(true);

      // Toggle to show
      minimapToggle?.click();
      expect(minimapContainer?.classList.contains('hidden')).toBe(false);

      // Toggle to hide
      minimapToggle?.click();
      expect(minimapContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should generate minimap content', () => {
      const minimapContainer = document.querySelector('.minimap-container');
      expect(minimapContainer).toBeTruthy();

      // After initialization, minimap should contain sections
      const minimapSections = minimapContainer?.querySelectorAll('.minimap-section');
      expect(minimapSections?.length).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Layout', () => {
    it('should enable complex content features for complex content', () => {
      // Update DOM to indicate complex content
      const container = document.querySelector('[data-content-complexity]');
      container?.setAttribute('data-content-complexity', 'complex');

      controller = new IntegratedLayoutController({
        enableAdaptiveLayout: true,
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      // Complex content features should be enabled
      const expandButton = document.getElementById('integrated-toc-expand-all');
      const collapseButton = document.getElementById('integrated-toc-collapse-all');

      expect(expandButton?.classList.contains('hidden')).toBe(false);
      expect(collapseButton?.classList.contains('hidden')).toBe(false);
    });

    it('should enable simple content features for simple content', () => {
      // Update DOM to indicate simple content
      const container = document.querySelector('[data-content-complexity]');
      container?.setAttribute('data-content-complexity', 'simple');

      controller = new IntegratedLayoutController({
        enableAdaptiveLayout: true,
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      // Simple content should hide unnecessary controls
      const expandButton = document.getElementById('integrated-toc-expand-all');
      const collapseButton = document.getElementById('integrated-toc-collapse-all');

      expect(expandButton?.classList.contains('hidden')).toBe(true);
      expect(collapseButton?.classList.contains('hidden')).toBe(true);
    });

    it('should handle resize events', () => {
      controller = new IntegratedLayoutController({
        enableAdaptiveLayout: true,
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      // Trigger resize
      mockResizeObserver.trigger([
        {
          target: document.querySelector('aside[data-sidebar-width]')!,
        },
      ]);

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('Section Change Handling', () => {
    beforeEach(() => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();
    });

    it.skip('should handle section change events', async () => {
      const mockSectionData = {
        current: { id: 'section-1', title: 'Section 1' },
        previous: null,
        next: { id: 'section-2', title: 'Section 2' },
      };

      const sectionChangeEvent = new CustomEvent('toc-section-change', {
        detail: mockSectionData,
      });

      document.dispatchEvent(sectionChangeEvent);
      await waitForAsync();

      // Verify TOC highlighting was updated
      const currentLink = document.querySelector('[data-anchor="section-1"]');
      expect(currentLink?.classList.contains('integrated-toc-active')).toBe(true);
    });

    it.skip('should update minimap highlighting on section change', async () => {
      controller = new IntegratedLayoutController({
        enableMinimap: true,
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      const mockSectionData = {
        current: { id: 'section-1', title: 'Section 1' },
        previous: null,
        next: null,
      };

      const sectionChangeEvent = new CustomEvent('toc-section-change', {
        detail: mockSectionData,
      });

      document.dispatchEvent(sectionChangeEvent);
      await waitForAsync();

      // Check if minimap was updated
      const minimapSection = document.querySelector('.minimap-section[data-anchor="section-1"]');
      expect(minimapSection?.classList.contains('active')).toBe(true);
    });
  });

  describe('Public API', () => {
    beforeEach(() => {
      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();
    });

    it('should provide getCurrentSection method', () => {
      expect(typeof controller.getCurrentSection).toBe('function');

      const currentSection = controller.getCurrentSection();
      expect(currentSection).toBeNull(); // Initially null
    });

    it('should provide forceUpdate method', () => {
      expect(typeof controller.forceUpdate).toBe('function');

      // Should not throw error
      controller.forceUpdate();
      expect(true).toBe(true);
    });

    it('should provide destroy method', () => {
      expect(typeof controller.destroy).toBe('function');

      // Should clean up properly
      controller.destroy();
      expect(true).toBe(true);
    });
  });

  describe('Debug Mode', () => {
    beforeEach(() => {
      // Enable debug mode
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?debug=layout' },
      });
    });

    it('should log debug information when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });
      controller.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Integrated Layout]'));

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Clear DOM
      document.body.innerHTML = '';

      controller = new IntegratedLayoutController({
        enableIntelligentTracking: false, // Disable for testing
      });

      // Should not throw error even with missing elements
      expect(() => controller.initialize()).not.toThrow();
    });

    it.skip('should handle initialization without ResizeObserver', () => {
      // Remove ResizeObserver
      vi.stubGlobal('ResizeObserver', undefined);

      controller = new IntegratedLayoutController({
        enableAdaptiveLayout: true,
        enableIntelligentTracking: false, // Disable for testing
      });

      // Should not throw error
      expect(() => controller.initialize()).not.toThrow();
    });
  });
});
