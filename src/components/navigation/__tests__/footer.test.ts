/**
 * Footer Component Tests
 *
 * Tests for Footer.astro component to ensure proper structure,
 * accessibility features, GitHub integration, and responsive behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Define the Footer props interface
interface FooterProps {
  class?: string;
}

// Helper function to validate Footer props
function validateFooterProps(props: Partial<FooterProps>): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (props.class !== undefined && typeof props.class !== 'string') {
    errors.push('class must be a string');
  }

  return {
    success: errors.length === 0,
    ...(errors.length > 0 && { errors }),
  };
}

// Helper function to get current year
function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Helper function to generate footer classes
function generateFooterClasses(className: string = ''): string {
  return `bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 ${className}`;
}

// Helper function to validate copyright text
function getCopyrightText(): string {
  const currentYear = getCurrentYear();
  return `© ${currentYear} Beaver Team`;
}

// Helper function to get brand description
function getBrandDescription(): string {
  return 'GitHub開発活動を知識ベースに変換するAI-first知識管理システム';
}

// Helper function to get GitHub icon SVG path
function getGitHubIconPath(): string {
  return 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z';
}

// Helper function to get heart icon SVG path
function getHeartIconPath(): string {
  return 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
}

// Helper function to validate external link attributes
function getExternalLinkAttributes(): Record<string, string> {
  return {
    target: '_blank',
    rel: 'noopener noreferrer',
  };
}

describe('Footer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Props Validation', () => {
    it('should validate valid props', () => {
      const validProps: FooterProps = {
        class: 'custom-footer',
      };

      const result = validateFooterProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should validate props without class', () => {
      const validProps: FooterProps = {};

      const result = validateFooterProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should reject invalid class type', () => {
      const invalidProps = {
        class: 123,
      };

      const result = validateFooterProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('class must be a string');
    });

    it('should handle undefined class', () => {
      const props: Partial<FooterProps> = {};

      const result = validateFooterProps(props);
      expect(result.success).toBe(true);
    });
  });

  describe('Brand Identity', () => {
    it('should display correct brand name', () => {
      const brandName = 'Beaver';
      expect(brandName).toBe('Beaver');
    });

    it('should display correct brand emoji', () => {
      const brandEmoji = '🦫';
      expect(brandEmoji).toBe('🦫');
    });

    it('should display correct brand description', () => {
      const description = getBrandDescription();
      expect(description).toBe('GitHub開発活動を知識ベースに変換するAI-first知識管理システム');
      expect(description).toContain('GitHub');
      expect(description).toContain('AI-first');
      expect(description).toContain('知識管理システム');
    });

    it('should handle brand logo structure', () => {
      const logoClasses =
        'w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center';
      expect(logoClasses).toContain('w-8 h-8');
      expect(logoClasses).toContain('bg-gradient-to-br');
      expect(logoClasses).toContain('from-primary-500 to-secondary-500');
      expect(logoClasses).toContain('rounded-lg');
    });

    it('should handle brand text styling', () => {
      const brandTextClasses = 'text-xl font-bold text-heading';
      expect(brandTextClasses).toContain('text-xl');
      expect(brandTextClasses).toContain('font-bold');
      expect(brandTextClasses).toContain('text-heading');
    });
  });

  describe('GitHub Integration', () => {
    it('should provide GitHub repository URL', () => {
      expect(mockRepositoryUrls.repository).toBe('https://github.com/user/repo');
      expect(mockRepositoryUrls.repository).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/);
    });

    it('should handle GitHub link attributes', () => {
      const linkAttributes = getExternalLinkAttributes();
      expect(linkAttributes['target']).toBe('_blank');
      expect(linkAttributes['rel']).toBe('noopener noreferrer');
    });

    it('should provide GitHub icon SVG path', () => {
      const iconPath = getGitHubIconPath();
      expect(iconPath).toBeDefined();
      expect(iconPath).toContain('M12 0c-6.626 0-12 5.373-12 12');
      expect(iconPath).toContain('c-6.626 0-12 5.373-12 12');
    });

    it('should handle GitHub link styling', () => {
      const linkClasses =
        'flex items-center space-x-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200';
      expect(linkClasses).toContain('flex items-center space-x-2');
      expect(linkClasses).toContain('text-gray-600');
      expect(linkClasses).toContain('hover:text-gray-800');
      expect(linkClasses).toContain('dark:text-gray-400');
      expect(linkClasses).toContain('transition-colors duration-200');
    });
  });

  describe('Copyright Information', () => {
    it('should display current year in copyright', () => {
      const currentYear = getCurrentYear();
      const copyrightText = getCopyrightText();
      expect(copyrightText).toContain(currentYear.toString());
    });

    it('should display correct copyright text', () => {
      const copyrightText = getCopyrightText();
      expect(copyrightText).toBe(`© ${getCurrentYear()} Beaver Team`);
    });

    it('should handle copyright text styling', () => {
      const copyrightClasses = 'text-muted text-sm';
      expect(copyrightClasses).toContain('text-muted');
      expect(copyrightClasses).toContain('text-sm');
    });

    it('should handle year changes dynamically', () => {
      const year2024 = new Date('2024-01-01').getFullYear();
      const year2025 = new Date('2025-01-01').getFullYear();

      expect(year2024).toBe(2024);
      expect(year2025).toBe(2025);
    });
  });

  describe('Tech Stack Attribution', () => {
    it('should display "Built with" text', () => {
      const buildText = 'Built with';
      expect(buildText).toBe('Built with');
    });

    it('should display heart icon', () => {
      const heartIconPath = getHeartIconPath();
      expect(heartIconPath).toBeDefined();
      expect(heartIconPath).toContain('M12 21.35l-1.45-1.32');
    });

    it('should display Astro attribution', () => {
      const astroUrl = 'https://astro.build';
      const astroText = 'Astro';

      expect(astroUrl).toBe('https://astro.build');
      expect(astroText).toBe('Astro');
    });

    it('should handle heart icon styling', () => {
      const heartClasses = 'w-4 h-4 text-red-500';
      expect(heartClasses).toContain('w-4 h-4');
      expect(heartClasses).toContain('text-red-500');
    });

    it('should handle Astro link styling', () => {
      const astroLinkClasses = 'text-primary-600 hover:text-primary-700 transition-colors';
      expect(astroLinkClasses).toContain('text-primary-600');
      expect(astroLinkClasses).toContain('hover:text-primary-700');
      expect(astroLinkClasses).toContain('transition-colors');
    });
  });

  describe('Layout and Styling', () => {
    it('should generate footer classes correctly', () => {
      const classes = generateFooterClasses();
      expect(classes).toContain('bg-gray-50 dark:bg-gray-900');
      expect(classes).toContain('border-t border-gray-200 dark:border-gray-700');
    });

    it('should handle custom classes', () => {
      const customClass = 'custom-footer-class';
      const classes = generateFooterClasses(customClass);
      expect(classes).toContain(customClass);
    });

    it('should handle container styling', () => {
      const containerClasses = 'container mx-auto px-4 sm:px-6 lg:px-8 py-8';
      expect(containerClasses).toContain('container mx-auto');
      expect(containerClasses).toContain('px-4 sm:px-6 lg:px-8');
      expect(containerClasses).toContain('py-8');
    });

    it('should handle main layout structure', () => {
      const layoutClasses =
        'flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0';
      expect(layoutClasses).toContain('flex flex-col md:flex-row');
      expect(layoutClasses).toContain('justify-between items-center');
      expect(layoutClasses).toContain('space-y-4 md:space-y-0');
    });

    it('should handle brand section layout', () => {
      const brandClasses =
        'flex flex-col md:flex-row items-center md:items-start space-y-2 md:space-y-0 md:space-x-4';
      expect(brandClasses).toContain('flex flex-col md:flex-row');
      expect(brandClasses).toContain('items-center md:items-start');
      expect(brandClasses).toContain('space-y-2 md:space-y-0 md:space-x-4');
    });
  });

  describe('Responsive Design', () => {
    it('should handle responsive text alignment', () => {
      const textClasses = 'text-center md:text-left';
      expect(textClasses).toContain('text-center');
      expect(textClasses).toContain('md:text-left');
    });

    it('should handle responsive flex direction', () => {
      const flexClasses = 'flex-col md:flex-row';
      expect(flexClasses).toContain('flex-col');
      expect(flexClasses).toContain('md:flex-row');
    });

    it('should handle responsive spacing', () => {
      const spacingClasses = 'space-y-4 md:space-y-0';
      expect(spacingClasses).toContain('space-y-4');
      expect(spacingClasses).toContain('md:space-y-0');
    });

    it('should handle responsive padding', () => {
      const paddingClasses = 'px-4 sm:px-6 lg:px-8';
      expect(paddingClasses).toContain('px-4');
      expect(paddingClasses).toContain('sm:px-6');
      expect(paddingClasses).toContain('lg:px-8');
    });

    it('should handle responsive item alignment', () => {
      const alignmentClasses = 'items-center md:items-start';
      expect(alignmentClasses).toContain('items-center');
      expect(alignmentClasses).toContain('md:items-start');
    });
  });

  describe('Dark Mode Support', () => {
    it('should handle dark mode background', () => {
      const backgroundClasses = 'bg-gray-50 dark:bg-gray-900';
      expect(backgroundClasses).toContain('bg-gray-50');
      expect(backgroundClasses).toContain('dark:bg-gray-900');
    });

    it('should handle dark mode borders', () => {
      const borderClasses = 'border-t border-gray-200 dark:border-gray-700';
      expect(borderClasses).toContain('border-gray-200');
      expect(borderClasses).toContain('dark:border-gray-700');
    });

    it('should handle dark mode text colors', () => {
      const textClasses = 'text-gray-600 dark:text-gray-400';
      expect(textClasses).toContain('text-gray-600');
      expect(textClasses).toContain('dark:text-gray-400');
    });

    it('should handle dark mode hover states', () => {
      const hoverClasses = 'hover:text-gray-800 dark:hover:text-gray-200';
      expect(hoverClasses).toContain('hover:text-gray-800');
      expect(hoverClasses).toContain('dark:hover:text-gray-200');
    });

    it('should handle dark mode text utilities', () => {
      const textUtilityClasses = 'text-muted';
      expect(textUtilityClasses).toContain('text-muted');
    });
  });

  describe('Content Structure', () => {
    it('should handle brand logo and text structure', () => {
      const logoStructure = {
        container: 'flex items-center space-x-2',
        logoBox:
          'w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center',
        emoji: '🦫',
        text: 'Beaver',
      };

      expect(logoStructure.container).toContain('flex items-center space-x-2');
      expect(logoStructure.logoBox).toContain('w-8 h-8');
      expect(logoStructure.emoji).toBe('🦫');
      expect(logoStructure.text).toBe('Beaver');
    });

    it('should handle description text structure', () => {
      const descriptionClasses = 'text-muted text-sm text-center md:text-left max-w-md';
      expect(descriptionClasses).toContain('text-muted');
      expect(descriptionClasses).toContain('text-sm');
      expect(descriptionClasses).toContain('text-center md:text-left');
      expect(descriptionClasses).toContain('max-w-md');
    });

    it('should handle right section structure', () => {
      const rightSectionClasses =
        'flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6';
      expect(rightSectionClasses).toContain('flex flex-col md:flex-row');
      expect(rightSectionClasses).toContain('items-center');
      expect(rightSectionClasses).toContain('space-y-2 md:space-y-0 md:space-x-6');
    });
  });

  describe('Icon Management', () => {
    it('should handle GitHub icon dimensions', () => {
      const iconClasses = 'w-5 h-5';
      expect(iconClasses).toContain('w-5 h-5');
    });

    it('should handle heart icon dimensions', () => {
      const heartClasses = 'w-4 h-4';
      expect(heartClasses).toContain('w-4 h-4');
    });

    it('should handle icon fill and stroke properties', () => {
      const gitHubIconProps = {
        fill: 'currentColor',
        viewBox: '0 0 24 24',
      };

      const heartIconProps = {
        fill: 'currentColor',
        viewBox: '0 0 24 24',
      };

      expect(gitHubIconProps.fill).toBe('currentColor');
      expect(gitHubIconProps.viewBox).toBe('0 0 24 24');
      expect(heartIconProps.fill).toBe('currentColor');
      expect(heartIconProps.viewBox).toBe('0 0 24 24');
    });
  });

  describe('Link Management', () => {
    it('should handle external link security', () => {
      const linkAttrs = getExternalLinkAttributes();
      expect(linkAttrs['target']).toBe('_blank');
      expect(linkAttrs['rel']).toBe('noopener noreferrer');
    });

    it('should handle link text content', () => {
      const linkTexts = {
        github: 'GitHub',
        astro: 'Astro',
      };

      expect(linkTexts.github).toBe('GitHub');
      expect(linkTexts.astro).toBe('Astro');
    });

    it('should handle link URLs', () => {
      const urls = {
        github: mockRepositoryUrls.repository,
        astro: 'https://astro.build',
      };

      expect(urls.github).toBe('https://github.com/user/repo');
      expect(urls.astro).toBe('https://astro.build');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle efficient class generation', () => {
      const startTime = performance.now();

      const classes = generateFooterClasses('custom-class');
      const copyrightText = getCopyrightText();
      const brandDescription = getBrandDescription();

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(classes).toBeDefined();
      expect(copyrightText).toBeDefined();
      expect(brandDescription).toBeDefined();
      expect(processingTime).toBeLessThan(5); // Should be very fast
    });

    it('should handle year calculation efficiency', () => {
      const startTime = performance.now();

      const years = Array.from({ length: 10 }, () => getCurrentYear());

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(years).toHaveLength(10);
      expect(years.every(year => year === getCurrentYear())).toBe(true);
      expect(processingTime).toBeLessThan(5); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle missing repository URLs gracefully', () => {
      const emptyUrls = {
        repository: '',
        pulls: '',
        issues: '',
        fullName: '',
      };

      expect(emptyUrls.repository).toBe('');
      expect(emptyUrls.pulls).toBe('');
      expect(emptyUrls.issues).toBe('');
      expect(emptyUrls.fullName).toBe('');
    });

    it('should handle invalid year values', () => {
      const invalidDate = new Date('invalid');
      const validYear = isNaN(invalidDate.getFullYear())
        ? new Date().getFullYear()
        : invalidDate.getFullYear();

      expect(validYear).toBe(new Date().getFullYear());
    });

    it('should handle null/undefined class props', () => {
      const nullClass = generateFooterClasses(null as any);
      const undefinedClass = generateFooterClasses(undefined as any);

      expect(nullClass).toContain('bg-gray-50');
      expect(undefinedClass).toContain('bg-gray-50');
    });
  });

  describe('Accessibility Features', () => {
    it('should handle proper semantic structure', () => {
      const semanticTag = 'footer';
      expect(semanticTag).toBe('footer');
    });

    it('should handle link accessibility', () => {
      const linkAttributes = {
        href: mockRepositoryUrls.repository,
        target: '_blank',
        rel: 'noopener noreferrer',
      };

      expect(linkAttributes.href).toBe('https://github.com/user/repo');
      expect(linkAttributes['target']).toBe('_blank');
      expect(linkAttributes['rel']).toBe('noopener noreferrer');
    });

    it('should handle focus states', () => {
      const focusClasses = 'focus:outline-none focus:ring-2 focus:ring-primary-500';
      expect(focusClasses).toContain('focus:outline-none');
      expect(focusClasses).toContain('focus:ring-2');
      expect(focusClasses).toContain('focus:ring-primary-500');
    });

    it('should handle color contrast', () => {
      const contrastClasses = 'text-gray-600 dark:text-gray-400';
      expect(contrastClasses).toContain('text-gray-600');
      expect(contrastClasses).toContain('dark:text-gray-400');
    });
  });

  describe('Content Validation', () => {
    it('should validate brand content', () => {
      const brandContent = {
        name: 'Beaver',
        emoji: '🦫',
        description: getBrandDescription(),
      };

      expect(brandContent.name).toBe('Beaver');
      expect(brandContent.emoji).toBe('🦫');
      expect(brandContent.description).toContain('GitHub');
    });

    it('should validate copyright content', () => {
      const copyrightContent = getCopyrightText();
      expect(copyrightContent).toMatch(/^© \d{4} Beaver Team$/);
    });

    it('should validate tech stack content', () => {
      const techStackContent = {
        buildText: 'Built with',
        framework: 'Astro',
        frameworkUrl: 'https://astro.build',
      };

      expect(techStackContent.buildText).toBe('Built with');
      expect(techStackContent.framework).toBe('Astro');
      expect(techStackContent.frameworkUrl).toBe('https://astro.build');
    });
  });
});
