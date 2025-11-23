/**
 * Tests for TOC Scroll Tracker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TOCScrollTracker, type TOCScrollTrackerOptions } from '../toc-scroll-tracker.js';

// Helper function to wait for async operations
const waitForAsync = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Intersection Observer
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  public entries: IntersectionObserverEntry[] = [];
  private observedElements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.observedElements.push(element);
  }

  disconnect() {
    this.observedElements = [];
  }

  unobserve(element: Element) {
    const index = this.observedElements.indexOf(element);
    if (index > -1) {
      this.observedElements.splice(index, 1);
    }
  }

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    const fullEntries = entries.map(entry => ({
      isIntersecting: entry.isIntersecting || false,
      target: entry.target || document.createElement('div'),
      intersectionRatio: entry.intersectionRatio || 0,
      boundingClientRect: entry.boundingClientRect || ({} as DOMRectReadOnly),
      intersectionRect: entry.intersectionRect || ({} as DOMRectReadOnly),
      rootBounds: entry.rootBounds || null,
      time: entry.time || Date.now(),
    })) as IntersectionObserverEntry[];

    this.callback(fullEntries, this as unknown as IntersectionObserver);
  }
}

describe('TOC Scroll Tracker', () => {
  let mockObserver: MockIntersectionObserver;
  let tracker: TOCScrollTracker;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div>
        <h1 id="section-1">Section 1</h1>
        <p>Content 1</p>
        <h2 id="section-2">Section 2</h2>
        <p>Content 2</p>
        <h3 id="section-3">Section 3</h3>
        <p>Content 3</p>
      </div>
    `;

    // Mock Intersection Observer with proper callback handling
    global.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        mockObserver = new MockIntersectionObserver(callback);
        return mockObserver as any;
      }
    } as any;

    // Mock window properties
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    });

    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      value: vi.fn(),
    });

    // Mock URL search
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '' },
    });
  });

  afterEach(() => {
    tracker?.destroy();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      tracker = new TOCScrollTracker();
      expect(tracker).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const options: TOCScrollTrackerOptions = {
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0.5,
        debounceDelay: 200,
        enableProgress: false,
      };

      tracker = new TOCScrollTracker(options);
      expect(tracker).toBeDefined();
    });

    it('should create progress bar when enabled', () => {
      tracker = new TOCScrollTracker({ enableProgress: true });

      const progressBar = document.querySelector('.reading-progress-bar');
      expect(progressBar).toBeTruthy();
      expect(progressBar?.getAttribute('role')).toBe('progressbar');
      expect(progressBar?.getAttribute('aria-label')).toBe('読書進捗');
    });

    it('should not create progress bar when disabled', () => {
      tracker = new TOCScrollTracker({ enableProgress: false });

      const progressBar = document.querySelector('.reading-progress-bar');
      expect(progressBar).toBeFalsy();
    });
  });

  describe('Section Detection', () => {
    beforeEach(() => {
      tracker = new TOCScrollTracker();
    });

    it('should detect sections from DOM', () => {
      const sections = (tracker as any).sections;
      expect(sections).toHaveLength(3);
      expect(sections[0].id).toBe('section-1');
      expect(sections[0].title).toBe('Section 1');
      expect(sections[0].level).toBe(1);
    });

    it('should handle section change events', async () => {
      const eventSpy = vi.fn();
      document.addEventListener('toc-section-change', eventSpy);

      // Mock section element
      const sectionElement = document.getElementById('section-1')!;

      // Trigger intersection
      mockObserver.trigger([
        {
          target: sectionElement,
          isIntersecting: true,
        },
      ]);

      await waitForAsync();

      expect(eventSpy).toHaveBeenCalled();
      document.removeEventListener('toc-section-change', eventSpy);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      tracker = new TOCScrollTracker({ enableProgress: true });
    });

    it('should return 0 progress when no current section', () => {
      expect(tracker.getProgress()).toBe(0);
    });

    it('should calculate progress correctly', async () => {
      // Mock current section
      const sectionElement = document.getElementById('section-2')!;

      // Trigger intersection to set current section
      mockObserver.trigger([
        {
          target: sectionElement,
          isIntersecting: true,
        },
      ]);

      await waitForAsync();

      const progress = tracker.getProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('should update progress bar element', async () => {
      const sectionElement = document.getElementById('section-1')!;

      // Ensure progress bar exists first
      const progressBar = document.querySelector('.reading-progress-bar');
      expect(progressBar).toBeTruthy();

      mockObserver.trigger([
        {
          target: sectionElement,
          isIntersecting: true,
        },
      ]);

      await waitForAsync();

      // Check that ARIA attributes are updated
      expect(progressBar?.getAttribute('aria-valuenow')).toBeTruthy();
    });
  });

  describe('Smooth Scrolling', () => {
    beforeEach(() => {
      tracker = new TOCScrollTracker();
    });

    it('should scroll to section smoothly', () => {
      const scrollSpy = vi.spyOn(window, 'scrollTo');

      tracker.scrollToSection('section-2');

      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
        })
      );
    });

    it('should handle non-existent section gracefully', () => {
      const scrollSpy = vi.spyOn(window, 'scrollTo');

      tracker.scrollToSection('non-existent');

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  describe('Current Section Tracking', () => {
    beforeEach(() => {
      tracker = new TOCScrollTracker();
    });

    it('should return null when no current section', () => {
      expect(tracker.getCurrentSection()).toBeNull();
    });

    it('should track current section correctly', async () => {
      const sectionElement = document.getElementById('section-2')!;

      mockObserver.trigger([
        {
          target: sectionElement,
          isIntersecting: true,
        },
      ]);

      await waitForAsync();

      const currentSection = tracker.getCurrentSection();
      expect(currentSection?.id).toBe('section-2');
      expect(currentSection?.title).toBe('Section 2');
    });
  });

  describe('Force Update', () => {
    beforeEach(() => {
      tracker = new TOCScrollTracker();
    });

    it('should force update highlighting', () => {
      // Mock scroll position
      Object.defineProperty(window, 'scrollY', { value: 500 });

      // Mock getBoundingClientRect for sections
      const section2 = document.getElementById('section-2')!;
      vi.spyOn(section2, 'getBoundingClientRect').mockReturnValue({
        top: 50,
        bottom: 150,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 50,
        toJSON: () => ({}),
      });

      tracker.forceUpdate();

      // Should update current section based on scroll position
      expect(tracker.getCurrentSection()?.id).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup observers on destroy', () => {
      tracker = new TOCScrollTracker();
      const disconnectSpy = vi.spyOn(mockObserver, 'disconnect');

      tracker.destroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Debug Mode', () => {
    beforeEach(() => {
      // Enable debug mode
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?debug=toc' },
      });
    });

    it('should log debug information when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      tracker = new TOCScrollTracker();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TOC Tracker'));

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      tracker = new TOCScrollTracker({ enableProgress: true });
    });

    it('should set proper ARIA attributes on progress bar', () => {
      const progressBar = document.querySelector('.reading-progress-bar');

      expect(progressBar).toBeTruthy();
      expect(progressBar?.getAttribute('role')).toBe('progressbar');
      expect(progressBar?.getAttribute('aria-label')).toBe('読書進捗');
      expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should update ARIA values when progress changes', async () => {
      const sectionElement = document.getElementById('section-1')!;
      const progressBar = document.querySelector('.reading-progress-bar');
      expect(progressBar).toBeTruthy();

      mockObserver.trigger([
        {
          target: sectionElement,
          isIntersecting: true,
        },
      ]);

      await waitForAsync();

      const ariaValueNow = progressBar?.getAttribute('aria-valuenow');
      expect(ariaValueNow).toBeTruthy();
      if (ariaValueNow) {
        expect(parseFloat(ariaValueNow)).toBeGreaterThan(0);
      }
    });
  });
});
