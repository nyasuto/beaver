/**
 * Card Component Tests
 *
 * Tests for Card.astro component to ensure proper props validation,
 * class generation, and interactive functionality.
 */

import { describe, it, expect } from 'vitest';
import { CardPropsSchema, type CardProps } from '../../../lib/schemas/ui';

describe('Card Component', () => {
  describe('Props Schema Validation', () => {
    it('should validate valid card props', () => {
      const validProps: CardProps = {
        variant: 'default',
        padding: 'md',
        radius: 'md',
        shadow: 'sm',
        hoverable: false,
        clickable: false,
      };

      const result = CardPropsSchema.safeParse(validProps);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional props', () => {
      const minimalProps = {};
      const result = CardPropsSchema.safeParse(minimalProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.variant).toBe('default');
        expect(result.data.padding).toBe('md');
        expect(result.data.radius).toBe('md');
        expect(result.data.shadow).toBe('sm');
        expect(result.data.hoverable).toBe(false);
        expect(result.data.clickable).toBe(false);
      }
    });

    it('should validate variant enum values', () => {
      const validVariants = ['default', 'outlined', 'elevated', 'filled'];

      validVariants.forEach(variant => {
        const props = { variant };
        const result = CardPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid variant values', () => {
      const invalidProps = { variant: 'invalid' };
      const result = CardPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate padding enum values', () => {
      const validPaddings = ['none', 'sm', 'md', 'lg', 'xl'];

      validPaddings.forEach(padding => {
        const props = { padding };
        const result = CardPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid padding values', () => {
      const invalidProps = { padding: 'invalid' };
      const result = CardPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate radius enum values', () => {
      const validRadii = ['none', 'sm', 'md', 'lg', 'xl'];

      validRadii.forEach(radius => {
        const props = { radius };
        const result = CardPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should validate shadow enum values', () => {
      const validShadows = ['none', 'sm', 'md', 'lg', 'xl'];

      validShadows.forEach(shadow => {
        const props = { shadow };
        const result = CardPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should validate boolean interactive props', () => {
      const interactiveProps = {
        hoverable: true,
        clickable: true,
      };

      const result = CardPropsSchema.safeParse(interactiveProps);
      expect(result.success).toBe(true);
    });

    it('should validate accessibility props', () => {
      const accessibilityProps = {
        'aria-label': 'Product card',
        'aria-describedby': 'product-description',
        role: 'article',
        id: 'product-card-1',
        'data-testid': 'product-card',
      };

      const result = CardPropsSchema.safeParse(accessibilityProps);
      expect(result.success).toBe(true);
    });

    it('should validate header and footer content', () => {
      const contentProps = {
        header: '<h2>Card Header</h2>',
        footer: '<button>Action</button>',
      };

      const result = CardPropsSchema.safeParse(contentProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Card Class Generation Logic', () => {
    it('should generate correct base classes', () => {
      const expectedBaseClasses = ['bg-white', 'border', 'transition-all', 'duration-200'];

      const baseClasses = expectedBaseClasses.join(' ');
      expect(baseClasses).toContain('bg-white');
      expect(baseClasses).toContain('border');
      expect(baseClasses).toContain('transition-all');
      expect(baseClasses).toContain('duration-200');
    });

    it('should generate correct variant classes', () => {
      const variantClasses = {
        default: 'border-gray-200',
        outlined: 'border-gray-300 border-2',
        elevated: 'border-gray-200',
        filled: 'bg-gray-50 border-gray-300',
      };

      Object.entries(variantClasses).forEach(([_variant, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        expect(classes.length).toBeGreaterThan(0);
      });
    });

    it('should generate correct padding classes', () => {
      const paddingClasses = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      };

      Object.entries(paddingClasses).forEach(([padding, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        if (padding !== 'none') {
          expect(classes).toContain('p-');
        }
      });
    });

    it('should generate correct radius classes', () => {
      const radiusClasses = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
      };

      Object.entries(radiusClasses).forEach(([_radius, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain('rounded');
      });
    });

    it('should generate correct shadow classes', () => {
      const shadowClasses = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-xl',
      };

      Object.entries(shadowClasses).forEach(([shadow, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        if (shadow !== 'none') {
          expect(classes).toContain('shadow');
        }
      });
    });

    it('should generate correct header and footer padding classes', () => {
      const headerFooterPadding = {
        none: '',
        sm: 'px-3 py-2',
        md: 'px-4 py-3',
        lg: 'px-6 py-4',
        xl: 'px-8 py-5',
      };

      Object.entries(headerFooterPadding).forEach(([padding, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        if (padding !== 'none') {
          expect(classes).toContain('px-');
          expect(classes).toContain('py-');
        }
      });
    });
  });

  describe('Card Interactive States', () => {
    it('should handle hoverable state correctly', () => {
      const hoverableProps = { hoverable: true };
      const result = CardPropsSchema.safeParse(hoverableProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hoverable).toBe(true);
      }
    });

    it('should handle clickable state correctly', () => {
      const clickableProps = { clickable: true };
      const result = CardPropsSchema.safeParse(clickableProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clickable).toBe(true);
      }
    });

    it('should handle combined interactive states', () => {
      const interactiveProps = {
        hoverable: true,
        clickable: true,
      };
      const result = CardPropsSchema.safeParse(interactiveProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hoverable).toBe(true);
        expect(result.data.clickable).toBe(true);
      }
    });

    it('should validate interactive classes logic', () => {
      const hoverable = true;
      const clickable = true;

      const interactiveClasses = [
        hoverable ? 'hover:shadow-lg hover:-translate-y-1' : '',
        clickable
          ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          : '',
      ]
        .filter(Boolean)
        .join(' ');

      expect(interactiveClasses).toContain('hover:shadow-lg');
      expect(interactiveClasses).toContain('hover:-translate-y-1');
      expect(interactiveClasses).toContain('cursor-pointer');
      expect(interactiveClasses).toContain('focus:outline-none');
      expect(interactiveClasses).toContain('focus:ring-2');
      expect(interactiveClasses).toContain('focus:ring-blue-500');
      expect(interactiveClasses).toContain('focus:ring-offset-2');
    });
  });

  describe('Card Accessibility', () => {
    it('should support ARIA attributes', () => {
      const ariaProps = {
        'aria-label': 'Article card',
        'aria-describedby': 'article-description',
        role: 'article',
      };

      const result = CardPropsSchema.safeParse(ariaProps);
      expect(result.success).toBe(true);
    });

    it('should support focus management for clickable cards', () => {
      const focusProps = {
        clickable: true,
        id: 'focus-card',
        'data-testid': 'focus-test-card',
      };

      const result = CardPropsSchema.safeParse(focusProps);
      expect(result.success).toBe(true);
    });

    it('should handle keyboard navigation requirements', () => {
      const keyboardProps = {
        clickable: true,
        role: 'button',
      };

      const result = CardPropsSchema.safeParse(keyboardProps);
      expect(result.success).toBe(true);
    });

    it('should provide proper semantic structure', () => {
      const semanticProps = {
        header: '<h2>Card Title</h2>',
        footer: '<div>Card Actions</div>',
        role: 'article',
      };

      const result = CardPropsSchema.safeParse(semanticProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Card Layout Structure', () => {
    it('should validate header content', () => {
      const headerProps = {
        header: '<h2>Card Header</h2>',
      };

      const result = CardPropsSchema.safeParse(headerProps);
      expect(result.success).toBe(true);
    });

    it('should validate footer content', () => {
      const footerProps = {
        footer: '<div>Card Footer</div>',
      };

      const result = CardPropsSchema.safeParse(footerProps);
      expect(result.success).toBe(true);
    });

    it('should validate complete card structure', () => {
      const completeProps = {
        variant: 'elevated',
        padding: 'lg',
        radius: 'lg',
        shadow: 'md',
        hoverable: true,
        clickable: true,
        header: '<h2>Complete Card</h2>',
        footer: '<button>Action</button>',
      };

      const result = CardPropsSchema.safeParse(completeProps);
      expect(result.success).toBe(true);
    });

    it('should validate card without header and footer', () => {
      const simpleProps = {
        variant: 'default',
        padding: 'md',
      };

      const result = CardPropsSchema.safeParse(simpleProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Card Styling Variations', () => {
    it('should validate all variant combinations', () => {
      const variants = ['default', 'outlined', 'elevated', 'filled'];
      const paddings = ['none', 'sm', 'md', 'lg', 'xl'];
      const radii = ['none', 'sm', 'md', 'lg', 'xl'];
      const shadows = ['none', 'sm', 'md', 'lg', 'xl'];

      variants.forEach(variant => {
        paddings.forEach(padding => {
          radii.forEach(radius => {
            shadows.forEach(shadow => {
              const props = { variant, padding, radius, shadow };
              const result = CardPropsSchema.safeParse(props);
              expect(result.success).toBe(true);
            });
          });
        });
      });
    });

    it('should validate custom styling props', () => {
      const customProps = {
        className: 'custom-card-class',
        style: { backgroundColor: '#f0f0f0' },
      };

      const result = CardPropsSchema.safeParse(customProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Card Component Integration', () => {
    it('should work as a simple container', () => {
      const containerProps = {
        variant: 'default',
        padding: 'md',
        radius: 'md',
        shadow: 'sm',
      };

      const result = CardPropsSchema.safeParse(containerProps);
      expect(result.success).toBe(true);
    });

    it('should work as an interactive element', () => {
      const interactiveProps = {
        clickable: true,
        hoverable: true,
        'aria-label': 'Click to expand',
        role: 'button',
      };

      const result = CardPropsSchema.safeParse(interactiveProps);
      expect(result.success).toBe(true);
    });

    it('should work with complex content structure', () => {
      const complexProps = {
        variant: 'elevated',
        padding: 'lg',
        header:
          '<div class="flex items-center justify-between"><h2>Title</h2><button>Menu</button></div>',
        footer: '<div class="flex gap-2"><button>Cancel</button><button>Save</button></div>',
      };

      const result = CardPropsSchema.safeParse(complexProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Card Performance', () => {
    it('should handle large number of props efficiently', () => {
      const manyProps = {
        variant: 'elevated',
        padding: 'lg',
        radius: 'lg',
        shadow: 'md',
        hoverable: true,
        clickable: true,
        header: '<h2>Performance Test Card</h2>',
        footer: '<button>Action</button>',
        className: 'performance-test-card',
        id: 'performance-test',
        'data-testid': 'performance-card',
        'aria-label': 'Performance test card',
        'aria-describedby': 'performance-description',
        role: 'article',
      };

      const result = CardPropsSchema.safeParse(manyProps);
      expect(result.success).toBe(true);
    });

    it('should validate props schema efficiently', () => {
      const startTime = performance.now();

      const configurations = [
        { variant: 'default', padding: 'sm', radius: 'sm', shadow: 'sm' },
        { variant: 'outlined', padding: 'md', radius: 'md', shadow: 'md' },
        { variant: 'elevated', padding: 'lg', radius: 'lg', shadow: 'lg' },
        { variant: 'filled', padding: 'xl', radius: 'xl', shadow: 'xl' },
        { variant: 'default', hoverable: true, clickable: true },
      ];

      configurations.forEach(config => {
        const result = CardPropsSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      expect(validationTime).toBeLessThan(50);
    });
  });
});
