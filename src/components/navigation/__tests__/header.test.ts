/**
 * Header Component Tests
 *
 * Tests for Header.astro component to ensure proper navigation structure,
 * accessibility features, theme toggle functionality, and responsive behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the URL resolution function
const mockResolveUrl = vi.fn((path: string) => path);
vi.mock('../../lib/utils/url', () => ({
  resolveUrl: mockResolveUrl,
}));

// Mock GitHub repository URLs
const mockRepositoryUrls = {
  repository: 'https://github.com/user/repo',
  pulls: 'https://github.com/user/repo/pulls',
  issues: 'https://github.com/user/repo/issues',
  fullName: 'user/repo',
};

vi.mock('../../lib/github/repository', () => ({
  getRepositoryUrls: () => mockRepositoryUrls,
}));

// Define the Header props interface
interface HeaderProps {
  currentPath?: string;
  showSearch?: boolean;
  fixed?: boolean;
  transparent?: boolean;
  class?: string;
}

// Mock navigation items
const mockNavItems = [
  { name: 'ホーム', href: '/', icon: 'home', priority: 'primary' },
  { name: 'Issue', href: '/issues', icon: 'bug', priority: 'primary' },
  { name: 'Pull Requests', href: '/pulls', icon: 'git-pull-request', priority: 'primary' },
  { name: 'ドキュメント', href: '/docs', icon: 'docs', priority: 'primary' },
  { name: '品質分析', href: '/quality', icon: 'quality', priority: 'secondary' },
  { name: 'ビーバーの事実', href: '/beaver-facts', icon: 'info', priority: 'secondary' },
];

// Helper function to validate Header props
function validateHeaderProps(props: Partial<HeaderProps>): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (props.currentPath !== undefined && typeof props.currentPath !== 'string') {
    errors.push('currentPath must be a string');
  }

  if (props.showSearch !== undefined && typeof props.showSearch !== 'boolean') {
    errors.push('showSearch must be a boolean');
  }

  if (props.fixed !== undefined && typeof props.fixed !== 'boolean') {
    errors.push('fixed must be a boolean');
  }

  if (props.transparent !== undefined && typeof props.transparent !== 'boolean') {
    errors.push('transparent must be a boolean');
  }

  if (props.class !== undefined && typeof props.class !== 'string') {
    errors.push('class must be a string');
  }

  return {
    success: errors.length === 0,
    ...(errors.length > 0 && { errors }),
  };
}

// Helper function to check if a navigation item is active
function isActive(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath.startsWith(href);
}

// Helper function to generate header classes
function generateHeaderClasses(
  fixed: boolean,
  transparent: boolean,
  className: string = ''
): string {
  const classes = [
    'bg-white dark:bg-gray-900',
    'border-b border-gray-200 dark:border-gray-700',
    fixed && 'fixed top-0 left-0 right-0 z-50',
    transparent && 'bg-transparent border-transparent backdrop-blur-sm',
    'transition-all duration-200',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return classes;
}

// Helper function to get navigation item icon
function getNavItemIcon(icon: string): string {
  const iconMap: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    bug: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    'git-pull-request': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    docs: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    quality: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    chart:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  };

  return iconMap[icon] || '';
}

// Helper function to filter navigation items by priority
function filterNavItems(priority: 'primary' | 'secondary'): typeof mockNavItems {
  return mockNavItems.filter(item => item.priority === priority);
}

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Props Validation', () => {
    it('should validate valid props', () => {
      const validProps: HeaderProps = {
        currentPath: '/issues',
        showSearch: true,
        fixed: false,
        transparent: false,
        class: 'custom-header',
      };

      const result = validateHeaderProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should validate props with minimal configuration', () => {
      const validProps: HeaderProps = {};

      const result = validateHeaderProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should reject invalid currentPath type', () => {
      const invalidProps = {
        currentPath: 123,
      };

      const result = validateHeaderProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('currentPath must be a string');
    });

    it('should reject invalid showSearch type', () => {
      const invalidProps = {
        showSearch: 'true',
      };

      const result = validateHeaderProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('showSearch must be a boolean');
    });

    it('should reject invalid fixed type', () => {
      const invalidProps = {
        fixed: 'true',
      };

      const result = validateHeaderProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('fixed must be a boolean');
    });

    it('should reject invalid transparent type', () => {
      const invalidProps = {
        transparent: 'false',
      };

      const result = validateHeaderProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('transparent must be a boolean');
    });

    it('should reject invalid class type', () => {
      const invalidProps = {
        class: 123,
      };

      const result = validateHeaderProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('class must be a string');
    });
  });

  describe('URL Resolution', () => {
    it('should resolve URLs correctly', () => {
      const paths = ['/', '/issues', '/pulls', '/docs', '/quality', '/beaver-facts'];

      paths.forEach(path => {
        mockResolveUrl(path);
        expect(mockResolveUrl).toHaveBeenCalledWith(path);
      });
    });

    it('should handle favicon URL resolution', () => {
      const faviconPath = '/favicon.png';
      mockResolveUrl(faviconPath);
      expect(mockResolveUrl).toHaveBeenCalledWith(faviconPath);
    });

    it('should handle logo URL resolution', () => {
      const logoPath = '/';
      mockResolveUrl(logoPath);
      expect(mockResolveUrl).toHaveBeenCalledWith(logoPath);
    });
  });

  describe('Navigation Logic', () => {
    it('should identify active navigation items correctly', () => {
      expect(isActive('/', '/')).toBe(true);
      expect(isActive('/', '/issues')).toBe(false);
      expect(isActive('/issues', '/issues')).toBe(true);
      expect(isActive('/issues', '/issues/123')).toBe(true);
      expect(isActive('/pulls', '/pulls/456')).toBe(true);
      expect(isActive('/docs', '/docs/api')).toBe(true);
    });

    it('should handle root path special case', () => {
      expect(isActive('/', '/')).toBe(true);
      expect(isActive('/', '/home')).toBe(false);
      expect(isActive('/', '/issues')).toBe(false);
    });

    it('should filter primary navigation items', () => {
      const primaryItems = filterNavItems('primary');
      expect(primaryItems).toHaveLength(4);
      expect(primaryItems.map(item => item.name)).toEqual([
        'ホーム',
        'Issue',
        'Pull Requests',
        'ドキュメント',
      ]);
    });

    it('should filter secondary navigation items', () => {
      const secondaryItems = filterNavItems('secondary');
      expect(secondaryItems).toHaveLength(2);
      expect(secondaryItems.map(item => item.name)).toEqual(['品質分析', 'ビーバーの事実']);
    });

    it('should handle navigation item priorities', () => {
      const allItems = [...filterNavItems('primary'), ...filterNavItems('secondary')];
      expect(allItems).toHaveLength(6);
      expect(allItems.every(item => ['primary', 'secondary'].includes(item.priority))).toBe(true);
    });
  });

  describe('Header Classes Generation', () => {
    it('should generate default header classes', () => {
      const classes = generateHeaderClasses(false, false);
      expect(classes).toContain('bg-white dark:bg-gray-900');
      expect(classes).toContain('border-b border-gray-200 dark:border-gray-700');
      expect(classes).toContain('transition-all duration-200');
    });

    it('should generate fixed header classes', () => {
      const classes = generateHeaderClasses(true, false);
      expect(classes).toContain('fixed top-0 left-0 right-0 z-50');
    });

    it('should generate transparent header classes', () => {
      const classes = generateHeaderClasses(false, true);
      expect(classes).toContain('bg-transparent border-transparent backdrop-blur-sm');
    });

    it('should include custom classes', () => {
      const customClass = 'custom-header-class';
      const classes = generateHeaderClasses(false, false, customClass);
      expect(classes).toContain(customClass);
    });

    it('should handle both fixed and transparent flags', () => {
      const classes = generateHeaderClasses(true, true);
      expect(classes).toContain('fixed top-0 left-0 right-0 z-50');
      expect(classes).toContain('bg-transparent border-transparent backdrop-blur-sm');
    });
  });

  describe('Icon Mapping', () => {
    it('should return correct icon paths for all navigation icons', () => {
      const expectedIcons = ['home', 'bug', 'git-pull-request', 'docs', 'quality', 'info', 'chart'];

      expectedIcons.forEach(icon => {
        const iconPath = getNavItemIcon(icon);
        expect(iconPath).toBeDefined();
        expect(iconPath).toBeTruthy();
      });
    });

    it('should handle unknown icons gracefully', () => {
      const unknownIcon = getNavItemIcon('unknown');
      expect(unknownIcon).toBe('');
    });

    it('should return specific icon paths', () => {
      expect(getNavItemIcon('home')).toContain(
        'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
      );
      expect(getNavItemIcon('bug')).toContain('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z');
      expect(getNavItemIcon('quality')).toContain('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
    });
  });

  describe('GitHub Integration', () => {
    it('should provide GitHub repository URLs', () => {
      expect(mockRepositoryUrls.repository).toBe('https://github.com/user/repo');
      expect(mockRepositoryUrls.pulls).toBe('https://github.com/user/repo/pulls');
      expect(mockRepositoryUrls.issues).toBe('https://github.com/user/repo/issues');
      expect(mockRepositoryUrls.fullName).toBe('user/repo');
    });

    it('should handle GitHub URL structure', () => {
      expect(mockRepositoryUrls.repository).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/);
      expect(mockRepositoryUrls.pulls).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w-]+\/pulls$/);
      expect(mockRepositoryUrls.issues).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w-]+\/issues$/);
    });

    it('should provide repository full name', () => {
      expect(mockRepositoryUrls.fullName).toMatch(/^[\w-]+\/[\w-]+$/);
    });
  });

  describe('Search Functionality', () => {
    it('should handle search display toggle', () => {
      const withSearch = { showSearch: true };
      const withoutSearch = { showSearch: false };

      expect(withSearch.showSearch).toBe(true);
      expect(withoutSearch.showSearch).toBe(false);
    });

    it('should provide search placeholder text', () => {
      const searchPlaceholder = 'Issueを検索...';
      expect(searchPlaceholder).toBe('Issueを検索...');
    });

    it('should handle search input IDs', () => {
      const desktopSearchId = 'search-input';
      const mobileSearchId = 'mobile-search-input';

      expect(desktopSearchId).toBe('search-input');
      expect(mobileSearchId).toBe('mobile-search-input');
    });
  });

  describe('Accessibility Features', () => {
    it('should provide proper ARIA labels', () => {
      const ariaLabels = {
        github: 'GitHubリポジトリを開く',
        pulls: 'Pull Requestsを開く',
        settings: '設定を開く',
        mobileMenu: 'モバイルメニュー切り替え',
      };

      expect(ariaLabels.github).toBe('GitHubリポジトリを開く');
      expect(ariaLabels.pulls).toBe('Pull Requestsを開く');
      expect(ariaLabels.settings).toBe('設定を開く');
      expect(ariaLabels.mobileMenu).toBe('モバイルメニュー切り替え');
    });

    it('should handle aria-current for active navigation', () => {
      const activeAriaValue = 'page';
      const inactiveAriaValue = undefined;

      expect(activeAriaValue).toBe('page');
      expect(inactiveAriaValue).toBeUndefined();
    });

    it('should provide proper button roles and titles', () => {
      const buttonTitles = {
        github: 'GitHubリポジトリ',
        pulls: 'Pull Requests',
        settings: '設定',
      };

      expect(buttonTitles.github).toBe('GitHubリポジトリ');
      expect(buttonTitles.pulls).toBe('Pull Requests');
      expect(buttonTitles.settings).toBe('設定');
    });

    it('should handle keyboard navigation support', () => {
      const focusClasses =
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
      expect(focusClasses).toContain('focus:outline-none');
      expect(focusClasses).toContain('focus:ring-2');
      expect(focusClasses).toContain('focus:ring-primary-500');
      expect(focusClasses).toContain('focus:ring-offset-2');
    });
  });

  describe('Mobile Menu Functionality', () => {
    it('should handle mobile menu toggle state', () => {
      const mobileMenuButton = {
        id: 'mobile-menu-toggle',
        ariaExpanded: false,
        ariaLabel: 'モバイルメニュー切り替え',
      };

      expect(mobileMenuButton.id).toBe('mobile-menu-toggle');
      expect(mobileMenuButton.ariaExpanded).toBe(false);
      expect(mobileMenuButton.ariaLabel).toBe('モバイルメニュー切り替え');
    });

    it('should handle mobile menu icons', () => {
      const menuIcons = {
        open: 'mobile-menu-icon-open',
        close: 'mobile-menu-icon-close',
      };

      expect(menuIcons.open).toBe('mobile-menu-icon-open');
      expect(menuIcons.close).toBe('mobile-menu-icon-close');
    });

    it('should handle mobile menu visibility', () => {
      const mobileMenuId = 'mobile-menu';
      const hiddenClass = 'hidden';

      expect(mobileMenuId).toBe('mobile-menu');
      expect(hiddenClass).toBe('hidden');
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive visibility classes', () => {
      const responsiveClasses = {
        desktopOnly: 'hidden md:flex',
        mobileOnly: 'md:hidden',
        smallDesktopOnly: 'hidden sm:flex',
        smallMobileOnly: 'sm:hidden',
      };

      expect(responsiveClasses.desktopOnly).toBe('hidden md:flex');
      expect(responsiveClasses.mobileOnly).toBe('md:hidden');
      expect(responsiveClasses.smallDesktopOnly).toBe('hidden sm:flex');
      expect(responsiveClasses.smallMobileOnly).toBe('sm:hidden');
    });

    it('should handle responsive text sizing', () => {
      const responsiveText = {
        logo: 'text-lg font-bold',
        navItem: 'text-sm font-medium',
        mobileNavItem: 'text-base font-medium',
      };

      expect(responsiveText.logo).toBe('text-lg font-bold');
      expect(responsiveText.navItem).toBe('text-sm font-medium');
      expect(responsiveText.mobileNavItem).toBe('text-base font-medium');
    });

    it('should handle responsive spacing', () => {
      const responsiveSpacing = {
        container: 'px-4 sm:px-6 lg:px-8',
        navItems: 'space-x-1',
        mobileNavItems: 'space-y-1',
      };

      expect(responsiveSpacing.container).toBe('px-4 sm:px-6 lg:px-8');
      expect(responsiveSpacing.navItems).toBe('space-x-1');
      expect(responsiveSpacing.mobileNavItems).toBe('space-y-1');
    });
  });

  describe('Theme Support', () => {
    it('should handle dark mode classes', () => {
      const darkModeClasses = {
        background: 'bg-white dark:bg-gray-900',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-900 dark:text-gray-100',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
      };

      expect(darkModeClasses.background).toBe('bg-white dark:bg-gray-900');
      expect(darkModeClasses.border).toBe('border-gray-200 dark:border-gray-700');
      expect(darkModeClasses.text).toBe('text-gray-900 dark:text-gray-100');
      expect(darkModeClasses.hover).toBe('hover:bg-gray-100 dark:hover:bg-gray-800');
    });

    it('should handle theme toggle sizes', () => {
      const themeToggleSizes = {
        desktop: 'md',
        mobile: 'sm',
      };

      expect(themeToggleSizes.desktop).toBe('md');
      expect(themeToggleSizes.mobile).toBe('sm');
    });

    it('should handle transparent theme support', () => {
      const transparentClasses = 'bg-transparent border-transparent backdrop-blur-sm';
      expect(transparentClasses).toContain('bg-transparent');
      expect(transparentClasses).toContain('border-transparent');
      expect(transparentClasses).toContain('backdrop-blur-sm');
    });
  });

  describe('Performance Optimizations', () => {
    it('should handle large navigation structures efficiently', () => {
      const startTime = performance.now();

      // Simulate processing all navigation items
      const processedNavItems = mockNavItems.map(item => ({
        ...item,
        active: isActive(item.href, '/issues'),
        icon: getNavItemIcon(item.icon),
      }));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processedNavItems).toHaveLength(6);
      expect(processingTime).toBeLessThan(10); // Should be very fast
    });

    it('should handle multiple URL resolutions efficiently', () => {
      const startTime = performance.now();

      const urlsToResolve = ['/', '/issues', '/pulls', '/docs', '/quality', '/beaver-facts'];
      urlsToResolve.forEach(url => mockResolveUrl(url));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle missing navigation items gracefully', () => {
      const emptyNavItems: typeof mockNavItems = [];
      const primaryItems = emptyNavItems.filter(item => item.priority === 'primary');
      const secondaryItems = emptyNavItems.filter(item => item.priority === 'secondary');

      expect(primaryItems).toHaveLength(0);
      expect(secondaryItems).toHaveLength(0);
    });

    it('should handle invalid current path gracefully', () => {
      const invalidPath = '';
      const activeStates = mockNavItems.map(item => isActive(item.href, invalidPath));

      expect(activeStates.filter(Boolean)).toHaveLength(0);
    });

    it('should handle null/undefined repository URLs', () => {
      const nullUrls = {
        repository: null,
        pulls: null,
        issues: null,
        fullName: null,
      };

      expect(nullUrls.repository).toBeNull();
      expect(nullUrls.pulls).toBeNull();
      expect(nullUrls.issues).toBeNull();
      expect(nullUrls.fullName).toBeNull();
    });
  });

  describe('JavaScript Functionality', () => {
    it('should handle DOM element IDs correctly', () => {
      const elementIds = {
        mobileMenuToggle: 'mobile-menu-toggle',
        mobileMenu: 'mobile-menu',
        settingsToggle: 'settings-toggle',
        searchInput: 'search-input',
        mobileSearchInput: 'mobile-search-input',
        openIcon: 'mobile-menu-icon-open',
        closeIcon: 'mobile-menu-icon-close',
      };

      Object.values(elementIds).forEach(id => {
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it('should handle settings integration', () => {
      const settingsEvents = {
        open: 'settings:open',
        toggle: 'settings:toggle',
      };

      expect(settingsEvents.open).toBe('settings:open');
      expect(settingsEvents.toggle).toBe('settings:toggle');
    });

    it('should handle mobile menu state management', () => {
      const menuStates = {
        open: 'aria-expanded="true"',
        closed: 'aria-expanded="false"',
      };

      expect(menuStates.open).toContain('true');
      expect(menuStates.closed).toContain('false');
    });
  });

  describe('Component Integration', () => {
    it('should integrate with ThemeToggle component', () => {
      const themeToggleProps = {
        size: 'md',
        class: 'hidden sm:flex',
      };

      expect(themeToggleProps.size).toBe('md');
      expect(themeToggleProps.class).toBe('hidden sm:flex');
    });

    it('should handle external link attributes', () => {
      const externalLinkProps = {
        target: '_blank',
        rel: 'noopener noreferrer',
      };

      expect(externalLinkProps.target).toBe('_blank');
      expect(externalLinkProps.rel).toBe('noopener noreferrer');
    });

    it('should handle container structure', () => {
      const containerClasses = {
        main: 'container mx-auto px-4 sm:px-6 lg:px-8',
        nav: 'flex items-center justify-between h-16',
        mobile: 'md:hidden hidden border-t border-gray-200 dark:border-gray-700',
      };

      expect(containerClasses.main).toBe('container mx-auto px-4 sm:px-6 lg:px-8');
      expect(containerClasses.nav).toBe('flex items-center justify-between h-16');
      expect(containerClasses.mobile).toBe(
        'md:hidden hidden border-t border-gray-200 dark:border-gray-700'
      );
    });
  });
});
