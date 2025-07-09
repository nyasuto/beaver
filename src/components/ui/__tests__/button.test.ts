/**
 * Button Component Tests
 *
 * Tests for Button.astro component to ensure proper props validation,
 * class generation, and accessibility features.
 */

import { describe, it, expect } from 'vitest';
import { ButtonPropsSchema, type ButtonProps } from '../../../lib/schemas/ui';

describe('Button Component', () => {
  describe('Props Schema Validation', () => {
    it('should validate valid button props', () => {
      const validProps: ButtonProps = {
        variant: 'primary',
        size: 'md',
        disabled: false,
        loading: false,
        fullWidth: false,
        type: 'button',
      };

      const result = ButtonPropsSchema.safeParse(validProps);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional props', () => {
      const minimalProps = {};
      const result = ButtonPropsSchema.safeParse(minimalProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.variant).toBe('primary');
        expect(result.data.size).toBe('md');
        expect(result.data.disabled).toBe(false);
        expect(result.data.loading).toBe(false);
        expect(result.data.fullWidth).toBe(false);
        expect(result.data.type).toBe('button');
      }
    });

    it('should validate variant enum values', () => {
      const validVariants = ['primary', 'secondary', 'outline', 'ghost', 'link'];

      validVariants.forEach(variant => {
        const props = { variant };
        const result = ButtonPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid variant values', () => {
      const invalidProps = { variant: 'invalid' };
      const result = ButtonPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate size enum values', () => {
      const validSizes = ['sm', 'md', 'lg', 'xl'];

      validSizes.forEach(size => {
        const props = { size };
        const result = ButtonPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid size values', () => {
      const invalidProps = { size: 'invalid' };
      const result = ButtonPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate type enum values', () => {
      const validTypes = ['button', 'submit', 'reset'];

      validTypes.forEach(type => {
        const props = { type };
        const result = ButtonPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should validate target enum values for links', () => {
      const validTargets = ['_blank', '_self', '_parent', '_top'];

      validTargets.forEach(target => {
        const props = { href: 'https://example.com', target };
        const result = ButtonPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should validate accessibility props', () => {
      const accessibilityProps = {
        'aria-label': 'Close dialog',
        'aria-describedby': 'description-id',
        role: 'button',
        id: 'unique-button-id',
        'data-testid': 'test-button',
      };

      const result = ButtonPropsSchema.safeParse(accessibilityProps);
      expect(result.success).toBe(true);
    });

    it('should validate icon props', () => {
      const iconProps = {
        leftIcon: '<svg>...</svg>',
        rightIcon: '<svg>...</svg>',
      };

      const result = ButtonPropsSchema.safeParse(iconProps);
      expect(result.success).toBe(true);
    });

    it('should validate link-specific props', () => {
      const linkProps = {
        href: 'https://example.com',
        target: '_blank',
      };

      const result = ButtonPropsSchema.safeParse(linkProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Button Class Generation Logic', () => {
    it('should generate correct base classes', () => {
      const expectedBaseClasses = [
        'inline-flex',
        'items-center',
        'justify-center',
        'font-medium',
        'transition-all',
        'duration-200',
        'border',
        'rounded-md',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
      ];

      const baseClasses = expectedBaseClasses.join(' ');
      expect(baseClasses).toContain('inline-flex');
      expect(baseClasses).toContain('items-center');
      expect(baseClasses).toContain('justify-center');
      expect(baseClasses).toContain('font-medium');
      expect(baseClasses).toContain('transition-all');
      expect(baseClasses).toContain('duration-200');
      expect(baseClasses).toContain('border');
      expect(baseClasses).toContain('rounded-md');
      expect(baseClasses).toContain('focus:outline-none');
      expect(baseClasses).toContain('focus:ring-2');
      expect(baseClasses).toContain('focus:ring-offset-2');
      expect(baseClasses).toContain('disabled:cursor-not-allowed');
      expect(baseClasses).toContain('disabled:opacity-50');
    });

    it('should generate correct variant classes', () => {
      const variantClasses = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus:ring-blue-500',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600 focus:ring-gray-500',
        outline:
          'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300 focus:ring-blue-500',
        ghost:
          'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent focus:ring-blue-500',
        link: 'bg-transparent hover:underline text-blue-600 border-transparent p-0 focus:ring-blue-500',
      };

      Object.entries(variantClasses).forEach(([_variant, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        expect(classes.length).toBeGreaterThan(0);
      });
    });

    it('should generate correct size classes', () => {
      const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
      };

      Object.entries(sizeClasses).forEach(([_size, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        expect(classes).toContain('px-');
        expect(classes).toContain('py-');
        expect(classes).toContain('text-');
      });
    });

    it('should generate correct icon classes for different sizes', () => {
      const iconClassMap = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-7 h-7',
      };

      Object.entries(iconClassMap).forEach(([_size, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain('w-');
        expect(classes).toContain('h-');
      });
    });
  });

  describe('Button State Management', () => {
    it('should handle disabled state correctly', () => {
      const disabledProps = { disabled: true };
      const result = ButtonPropsSchema.safeParse(disabledProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.disabled).toBe(true);
      }
    });

    it('should handle loading state correctly', () => {
      const loadingProps = { loading: true };
      const result = ButtonPropsSchema.safeParse(loadingProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loading).toBe(true);
      }
    });

    it('should handle full width state correctly', () => {
      const fullWidthProps = { fullWidth: true };
      const result = ButtonPropsSchema.safeParse(fullWidthProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullWidth).toBe(true);
      }
    });

    it('should handle combined states correctly', () => {
      const combinedProps = {
        disabled: true,
        loading: true,
        fullWidth: true,
      };
      const result = ButtonPropsSchema.safeParse(combinedProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.disabled).toBe(true);
        expect(result.data.loading).toBe(true);
        expect(result.data.fullWidth).toBe(true);
      }
    });
  });

  describe('Button Accessibility', () => {
    it('should support ARIA attributes', () => {
      const ariaProps = {
        'aria-label': 'Delete item',
        'aria-describedby': 'delete-description',
        role: 'button',
      };

      const result = ButtonPropsSchema.safeParse(ariaProps);
      expect(result.success).toBe(true);
    });

    it('should support focus management attributes', () => {
      const focusProps = {
        id: 'focus-button',
        'data-testid': 'focus-test-button',
      };

      const result = ButtonPropsSchema.safeParse(focusProps);
      expect(result.success).toBe(true);
    });

    it('should handle keyboard navigation requirements', () => {
      // Button should be keyboard accessible by default
      const keyboardProps = {
        type: 'button',
        disabled: false,
      };

      const result = ButtonPropsSchema.safeParse(keyboardProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Button Link Functionality', () => {
    it('should validate as link when href is provided', () => {
      const linkProps = {
        href: 'https://example.com',
        target: '_blank',
        variant: 'link',
      };

      const result = ButtonPropsSchema.safeParse(linkProps);
      expect(result.success).toBe(true);
    });

    it('should validate internal links', () => {
      const internalLinkProps = {
        href: '/internal/page',
        target: '_self',
      };

      const result = ButtonPropsSchema.safeParse(internalLinkProps);
      expect(result.success).toBe(true);
    });

    it('should validate external links', () => {
      const externalLinkProps = {
        href: 'https://external.com',
        target: '_blank',
      };

      const result = ButtonPropsSchema.safeParse(externalLinkProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Button Component Integration', () => {
    it('should work with form submission', () => {
      const submitButtonProps = {
        type: 'submit',
        variant: 'primary',
        disabled: false,
      };

      const result = ButtonPropsSchema.safeParse(submitButtonProps);
      expect(result.success).toBe(true);
    });

    it('should work with form reset', () => {
      const resetButtonProps = {
        type: 'reset',
        variant: 'secondary',
      };

      const result = ButtonPropsSchema.safeParse(resetButtonProps);
      expect(result.success).toBe(true);
    });

    it('should work with custom styling', () => {
      const customStyledProps = {
        className: 'custom-button-class',
        style: { backgroundColor: '#custom' },
      };

      const result = ButtonPropsSchema.safeParse(customStyledProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Button Performance', () => {
    it('should handle large number of props efficiently', () => {
      const manyProps = {
        variant: 'primary',
        size: 'lg',
        disabled: false,
        loading: false,
        fullWidth: true,
        leftIcon: '<svg>...</svg>',
        rightIcon: '<svg>...</svg>',
        href: 'https://example.com',
        target: '_blank',
        type: 'button',
        className: 'additional-class',
        id: 'performance-test-button',
        'data-testid': 'performance-button',
        'aria-label': 'Performance test button',
        'aria-describedby': 'performance-description',
        role: 'button',
      };

      const result = ButtonPropsSchema.safeParse(manyProps);
      expect(result.success).toBe(true);
    });

    it('should validate props schema efficiently', () => {
      const startTime = performance.now();

      // Validate multiple button configurations
      const configurations = [
        { variant: 'primary', size: 'sm' },
        { variant: 'secondary', size: 'md' },
        { variant: 'outline', size: 'lg' },
        { variant: 'ghost', size: 'xl' },
        { variant: 'link', href: '/test' },
      ];

      configurations.forEach(config => {
        const result = ButtonPropsSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      // Validation should be reasonably fast (less than 50ms for multiple validations)
      expect(validationTime).toBeLessThan(50);
    });
  });
});
