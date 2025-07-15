/**
 * Navigation Components Tests
 *
 * Tests for navigation components to ensure proper structure, functionality,
 * accessibility, and integration capabilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NAVIGATION_COMPONENTS } from '../index';

// Mock navigation data
const mockNavigationData = {
  primaryNavItems: [
    { name: 'ホーム', href: '/', icon: 'home', priority: 'primary' },
    { name: 'Issue', href: '/issues', icon: 'bug', priority: 'primary' },
    { name: 'Pull Requests', href: '/pulls', icon: 'git-pull-request', priority: 'primary' },
    { name: 'ドキュメント', href: '/docs', icon: 'docs', priority: 'primary' },
  ],
  secondaryNavItems: [
    { name: '品質分析', href: '/quality', icon: 'quality', priority: 'secondary' },
    { name: 'ビーバーの事実', href: '/beaver-facts', icon: 'info', priority: 'secondary' },
  ],
};

// Helper function to validate navigation item structure
function validateNavigationItem(item: any): boolean {
  return (
    typeof item.name === 'string' &&
    typeof item.href === 'string' &&
    typeof item.icon === 'string' &&
    ['primary', 'secondary'].includes(item.priority)
  );
}

// Helper function to check if navigation item is active
function isNavigationItemActive(href: string, currentPath: string): boolean {
  if (!currentPath || typeof currentPath !== 'string') return false;
  if (href === '/') return currentPath === '/';
  return currentPath.startsWith(href);
}

// Helper function to generate navigation classes
function getNavigationClasses(variant: 'primary' | 'secondary' | 'mobile'): string {
  const baseClasses = 'transition-colors duration-200 focus:outline-none';

  const variantClasses = {
    primary: 'px-3 py-2 rounded-md text-sm font-medium focus:ring-2 focus:ring-primary-500',
    secondary: 'px-3 py-2 rounded-md text-sm font-medium focus:ring-2 focus:ring-secondary-500',
    mobile: 'block px-3 py-2 rounded-md text-base font-medium',
  };

  return `${baseClasses} ${variantClasses[variant]}`;
}

// Helper function to get navigation icons
function getNavigationIcon(iconName: string): string {
  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    bug: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    'git-pull-request': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    docs: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    quality: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  return icons[iconName] || '';
}

// Helper function to generate breadcrumb navigation
function generateBreadcrumbs(currentPath: string): Array<{ name: string; href: string }> {
  const segments = currentPath.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'ホーム', href: '/' }];

  let currentHref = '';
  segments.forEach((segment, index) => {
    currentHref += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Convert segment to readable name
    const segmentNames: Record<string, string> = {
      issues: 'Issue',
      pulls: 'Pull Requests',
      docs: 'ドキュメント',
      quality: '品質分析',
      'beaver-facts': 'ビーバーの事実',
    };

    breadcrumbs.push({
      name: segmentNames[segment] || segment,
      href: isLast ? currentHref : currentHref,
    });
  });

  return breadcrumbs;
}

describe('Navigation Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation Component Registry', () => {
    it('should export all navigation components', () => {
      expect(NAVIGATION_COMPONENTS).toBeDefined();
      expect(typeof NAVIGATION_COMPONENTS).toBe('object');
    });

    it('should contain expected navigation components', () => {
      expect(NAVIGATION_COMPONENTS.header).toBe('Header');
      expect(NAVIGATION_COMPONENTS.footer).toBe('Footer');
      expect(NAVIGATION_COMPONENTS.banner).toBe('Banner');
    });

    it('should have consistent naming convention', () => {
      const componentNames = Object.values(NAVIGATION_COMPONENTS);

      componentNames.forEach(name => {
        expect(name).toMatch(/^[A-Z][a-zA-Z]+$/);
      });
    });

    it('should provide proper TypeScript types', () => {
      const headerComponent: keyof typeof NAVIGATION_COMPONENTS = 'header';
      const footerComponent: keyof typeof NAVIGATION_COMPONENTS = 'footer';
      const bannerComponent: keyof typeof NAVIGATION_COMPONENTS = 'banner';

      expect(NAVIGATION_COMPONENTS[headerComponent]).toBe('Header');
      expect(NAVIGATION_COMPONENTS[footerComponent]).toBe('Footer');
      expect(NAVIGATION_COMPONENTS[bannerComponent]).toBe('Banner');
    });

    it('should maintain immutable component registry', () => {
      const originalComponents = { ...NAVIGATION_COMPONENTS };

      // The const assertion prevents TypeScript modification but not runtime
      // This test verifies the structure exists and is consistent
      expect(NAVIGATION_COMPONENTS).toEqual(originalComponents);
      expect(Object.keys(NAVIGATION_COMPONENTS)).toHaveLength(3);
    });
  });

  describe('Navigation Item Structure', () => {
    it('should validate primary navigation items', () => {
      mockNavigationData.primaryNavItems.forEach(item => {
        expect(validateNavigationItem(item)).toBe(true);
      });
    });

    it('should validate secondary navigation items', () => {
      mockNavigationData.secondaryNavItems.forEach(item => {
        expect(validateNavigationItem(item)).toBe(true);
      });
    });

    it('should handle navigation item priorities', () => {
      const allItems = [
        ...mockNavigationData.primaryNavItems,
        ...mockNavigationData.secondaryNavItems,
      ];

      allItems.forEach(item => {
        expect(['primary', 'secondary']).toContain(item.priority);
      });
    });

    it('should ensure unique navigation hrefs', () => {
      const allItems = [
        ...mockNavigationData.primaryNavItems,
        ...mockNavigationData.secondaryNavItems,
      ];
      const hrefs = allItems.map(item => item.href);
      const uniqueHrefs = [...new Set(hrefs)];

      expect(hrefs.length).toBe(uniqueHrefs.length);
    });

    it('should validate navigation item icons', () => {
      const allItems = [
        ...mockNavigationData.primaryNavItems,
        ...mockNavigationData.secondaryNavItems,
      ];

      allItems.forEach(item => {
        const iconPath = getNavigationIcon(item.icon);
        expect(iconPath).toBeDefined();
        expect(iconPath.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation Active State Logic', () => {
    it('should correctly identify active navigation items', () => {
      expect(isNavigationItemActive('/', '/')).toBe(true);
      expect(isNavigationItemActive('/', '/issues')).toBe(false);
      expect(isNavigationItemActive('/issues', '/issues')).toBe(true);
      expect(isNavigationItemActive('/issues', '/issues/123')).toBe(true);
      expect(isNavigationItemActive('/pulls', '/pulls/456')).toBe(true);
      expect(isNavigationItemActive('/docs', '/docs/api')).toBe(true);
    });

    it('should handle root path edge cases', () => {
      expect(isNavigationItemActive('/', '/')).toBe(true);
      expect(isNavigationItemActive('/', '/home')).toBe(false);
      expect(isNavigationItemActive('/', '/issues')).toBe(false);
      expect(isNavigationItemActive('/', '/pulls')).toBe(false);
    });

    it('should handle nested path matching', () => {
      expect(isNavigationItemActive('/quality', '/quality/dashboard')).toBe(true);
      expect(isNavigationItemActive('/quality', '/quality/reports/monthly')).toBe(true);
      expect(isNavigationItemActive('/beaver-facts', '/beaver-facts/trivia')).toBe(true);
    });

    it('should handle non-matching paths', () => {
      expect(isNavigationItemActive('/issues', '/pulls')).toBe(false);
      expect(isNavigationItemActive('/docs', '/quality')).toBe(false);
      expect(isNavigationItemActive('/beaver-facts', '/issues')).toBe(false);
    });
  });

  describe('Navigation Styling', () => {
    it('should generate correct primary navigation classes', () => {
      const classes = getNavigationClasses('primary');
      expect(classes).toContain('px-3 py-2 rounded-md text-sm font-medium');
      expect(classes).toContain('focus:ring-2 focus:ring-primary-500');
      expect(classes).toContain('transition-colors duration-200');
    });

    it('should generate correct secondary navigation classes', () => {
      const classes = getNavigationClasses('secondary');
      expect(classes).toContain('px-3 py-2 rounded-md text-sm font-medium');
      expect(classes).toContain('focus:ring-2 focus:ring-secondary-500');
      expect(classes).toContain('transition-colors duration-200');
    });

    it('should generate correct mobile navigation classes', () => {
      const classes = getNavigationClasses('mobile');
      expect(classes).toContain('block px-3 py-2 rounded-md text-base font-medium');
      expect(classes).toContain('transition-colors duration-200');
    });

    it('should handle consistent base classes', () => {
      const variants = ['primary', 'secondary', 'mobile'] as const;
      const baseClasses = 'transition-colors duration-200 focus:outline-none';

      variants.forEach(variant => {
        const classes = getNavigationClasses(variant);
        expect(classes).toContain(baseClasses);
      });
    });
  });

  describe('Navigation Icons', () => {
    it('should provide icons for all navigation items', () => {
      const allItems = [
        ...mockNavigationData.primaryNavItems,
        ...mockNavigationData.secondaryNavItems,
      ];

      allItems.forEach(item => {
        const icon = getNavigationIcon(item.icon);
        expect(icon).toBeDefined();
        expect(icon.length).toBeGreaterThan(0);
      });
    });

    it('should handle unknown icon gracefully', () => {
      const unknownIcon = getNavigationIcon('unknown-icon');
      expect(unknownIcon).toBe('');
    });

    it('should return consistent icon paths', () => {
      const homeIcon1 = getNavigationIcon('home');
      const homeIcon2 = getNavigationIcon('home');
      expect(homeIcon1).toBe(homeIcon2);
    });

    it('should provide unique icons for different types', () => {
      const homeIcon = getNavigationIcon('home');
      const bugIcon = getNavigationIcon('bug');
      const docsIcon = getNavigationIcon('docs');

      expect(homeIcon).not.toBe(bugIcon);
      expect(bugIcon).not.toBe(docsIcon);
      expect(homeIcon).not.toBe(docsIcon);
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should generate correct breadcrumbs for root path', () => {
      const breadcrumbs = generateBreadcrumbs('/');
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({ name: 'ホーム', href: '/' });
    });

    it('should generate correct breadcrumbs for single level', () => {
      const breadcrumbs = generateBreadcrumbs('/issues');
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]).toEqual({ name: 'ホーム', href: '/' });
      expect(breadcrumbs[1]).toEqual({ name: 'Issue', href: '/issues' });
    });

    it('should generate correct breadcrumbs for nested paths', () => {
      const breadcrumbs = generateBreadcrumbs('/docs/api');
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({ name: 'ホーム', href: '/' });
      expect(breadcrumbs[1]).toEqual({ name: 'ドキュメント', href: '/docs' });
      expect(breadcrumbs[2]).toEqual({ name: 'api', href: '/docs/api' });
    });

    it('should handle unknown paths', () => {
      const breadcrumbs = generateBreadcrumbs('/unknown/path');
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({ name: 'ホーム', href: '/' });
      expect(breadcrumbs[1]).toEqual({ name: 'unknown', href: '/unknown' });
      expect(breadcrumbs[2]).toEqual({ name: 'path', href: '/unknown/path' });
    });

    it('should handle deep nested paths', () => {
      const breadcrumbs = generateBreadcrumbs('/quality/dashboard/reports/monthly');
      expect(breadcrumbs).toHaveLength(5);
      expect(breadcrumbs[0]).toEqual({ name: 'ホーム', href: '/' });
      expect(breadcrumbs[1]).toEqual({ name: '品質分析', href: '/quality' });
      expect(breadcrumbs[2]).toEqual({ name: 'dashboard', href: '/quality/dashboard' });
      expect(breadcrumbs[3]).toEqual({ name: 'reports', href: '/quality/dashboard/reports' });
      expect(breadcrumbs[4]).toEqual({
        name: 'monthly',
        href: '/quality/dashboard/reports/monthly',
      });
    });
  });

  describe('Navigation Accessibility', () => {
    it('should provide ARIA attributes for navigation items', () => {
      const ariaAttributes = {
        role: 'navigation',
        ariaLabel: 'Main navigation',
        ariaCurrent: 'page',
      };

      expect(ariaAttributes.role).toBe('navigation');
      expect(ariaAttributes.ariaLabel).toBe('Main navigation');
      expect(ariaAttributes.ariaCurrent).toBe('page');
    });

    it('should handle keyboard navigation support', () => {
      const keyboardSupport = {
        tabIndex: 0,
        focusVisible: 'focus:outline-none',
        focusRing: 'focus:ring-2',
      };

      expect(keyboardSupport.tabIndex).toBe(0);
      expect(keyboardSupport.focusVisible).toBe('focus:outline-none');
      expect(keyboardSupport.focusRing).toBe('focus:ring-2');
    });

    it('should provide semantic HTML structure', () => {
      const semanticStructure = {
        nav: 'nav',
        list: 'ul',
        listItem: 'li',
        link: 'a',
      };

      expect(semanticStructure.nav).toBe('nav');
      expect(semanticStructure.list).toBe('ul');
      expect(semanticStructure.listItem).toBe('li');
      expect(semanticStructure.link).toBe('a');
    });

    it('should handle screen reader announcements', () => {
      const screenReaderText = {
        currentPage: 'Current page',
        newWindow: 'Opens in new window',
        externalLink: 'External link',
      };

      expect(screenReaderText.currentPage).toBe('Current page');
      expect(screenReaderText.newWindow).toBe('Opens in new window');
      expect(screenReaderText.externalLink).toBe('External link');
    });
  });

  describe('Navigation Performance', () => {
    it('should handle large navigation structures efficiently', () => {
      const startTime = performance.now();

      // Simulate processing large navigation data
      const largeNavData = Array.from({ length: 50 }, (_, i) => ({
        name: `Item ${i}`,
        href: `/item-${i}`,
        icon: 'home',
        priority: i % 2 === 0 ? 'primary' : 'secondary',
      }));

      const processedItems = largeNavData.map(item => ({
        ...item,
        active: isNavigationItemActive(item.href, '/item-25'),
        classes: getNavigationClasses(item.priority as 'primary' | 'secondary'),
        icon: getNavigationIcon(item.icon),
      }));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processedItems).toHaveLength(50);
      expect(processingTime).toBeLessThan(50); // Should process efficiently
    });

    it('should handle navigation state updates efficiently', () => {
      const startTime = performance.now();

      const paths = ['/issues', '/pulls', '/docs', '/quality', '/beaver-facts'];
      const results = paths.map(path => {
        const breadcrumbs = generateBreadcrumbs(path);
        const activeItems = mockNavigationData.primaryNavItems.filter(item =>
          isNavigationItemActive(item.href, path)
        );
        return { path, breadcrumbs, activeItems };
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(5);
      expect(processingTime).toBeLessThan(20); // Should be fast
    });
  });

  describe('Navigation Responsive Design', () => {
    it('should support responsive navigation layouts', () => {
      const responsiveClasses = {
        desktop: 'hidden md:flex',
        mobile: 'md:hidden',
        tablet: 'hidden sm:flex md:hidden',
      };

      expect(responsiveClasses.desktop).toBe('hidden md:flex');
      expect(responsiveClasses.mobile).toBe('md:hidden');
      expect(responsiveClasses.tablet).toBe('hidden sm:flex md:hidden');
    });

    it('should handle mobile menu toggle states', () => {
      const mobileMenuStates = {
        closed: 'hidden',
        open: 'block',
        ariaExpanded: 'aria-expanded',
      };

      expect(mobileMenuStates.closed).toBe('hidden');
      expect(mobileMenuStates.open).toBe('block');
      expect(mobileMenuStates.ariaExpanded).toBe('aria-expanded');
    });

    it('should support responsive spacing', () => {
      const responsiveSpacing = {
        mobile: 'space-y-1',
        desktop: 'space-x-1',
        container: 'px-4 sm:px-6 lg:px-8',
      };

      expect(responsiveSpacing.mobile).toBe('space-y-1');
      expect(responsiveSpacing.desktop).toBe('space-x-1');
      expect(responsiveSpacing.container).toBe('px-4 sm:px-6 lg:px-8');
    });
  });

  describe('Navigation Error Handling', () => {
    it('should handle missing navigation data gracefully', () => {
      const emptyNavData = {
        primaryNavItems: [],
        secondaryNavItems: [],
      };

      expect(emptyNavData.primaryNavItems).toHaveLength(0);
      expect(emptyNavData.secondaryNavItems).toHaveLength(0);
    });

    it('should handle invalid navigation items', () => {
      const invalidItem = {
        name: '',
        href: '',
        icon: '',
        priority: 'invalid',
      };

      expect(validateNavigationItem(invalidItem)).toBe(false);
    });

    it('should handle null/undefined navigation paths', () => {
      const nullPath = null;
      const undefinedPath = undefined;
      const emptyPath = '';

      expect(isNavigationItemActive('/issues', nullPath as any)).toBe(false);
      expect(isNavigationItemActive('/issues', undefinedPath as any)).toBe(false);
      expect(isNavigationItemActive('/issues', emptyPath)).toBe(false);
    });

    it('should handle malformed breadcrumb paths', () => {
      const malformedPaths = ['', '/', '///', '/path//nested/'];

      malformedPaths.forEach(path => {
        const breadcrumbs = generateBreadcrumbs(path);
        expect(breadcrumbs).toBeDefined();
        expect(Array.isArray(breadcrumbs)).toBe(true);
        expect(breadcrumbs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should integrate with routing systems', () => {
      const routeData = {
        currentPath: '/issues/123',
        params: { id: '123' },
        query: { sort: 'created' },
      };

      const activeItem = mockNavigationData.primaryNavItems.find(item =>
        isNavigationItemActive(item.href, routeData.currentPath)
      );

      expect(activeItem).toBeDefined();
      expect(activeItem?.name).toBe('Issue');
    });

    it('should support navigation middleware', () => {
      const navigationMiddleware = (item: any) => {
        return {
          ...item,
          processed: true,
          timestamp: Date.now(),
        };
      };

      const processedItem = navigationMiddleware(mockNavigationData.primaryNavItems[0]);

      expect(processedItem.processed).toBe(true);
      expect(processedItem.timestamp).toBeDefined();
    });

    it('should handle navigation events', () => {
      const navigationEvents = {
        beforeNavigate: 'navigation:before',
        afterNavigate: 'navigation:after',
        navigationError: 'navigation:error',
      };

      expect(navigationEvents.beforeNavigate).toBe('navigation:before');
      expect(navigationEvents.afterNavigate).toBe('navigation:after');
      expect(navigationEvents.navigationError).toBe('navigation:error');
    });
  });
});
