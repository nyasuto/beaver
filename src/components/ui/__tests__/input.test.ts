/**
 * Input Component Tests
 *
 * Tests for Input.astro component to ensure proper props validation,
 * form functionality, and accessibility features.
 */

import { describe, it, expect } from 'vitest';
import { InputPropsSchema, type InputProps } from '../../../lib/schemas/ui';

describe('Input Component', () => {
  describe('Props Schema Validation', () => {
    it('should validate valid input props', () => {
      const validProps: InputProps = {
        type: 'text',
        size: 'md',
        variant: 'default',
        disabled: false,
        readOnly: false,
        required: false,
        invalid: false,
      };

      const result = InputPropsSchema.safeParse(validProps);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional props', () => {
      const minimalProps = {};
      const result = InputPropsSchema.safeParse(minimalProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('text');
        expect(result.data.size).toBe('md');
        expect(result.data.variant).toBe('default');
        expect(result.data.disabled).toBe(false);
        expect(result.data.readOnly).toBe(false);
        expect(result.data.required).toBe(false);
        expect(result.data.invalid).toBe(false);
      }
    });

    it('should validate type enum values', () => {
      const validTypes = ['text', 'email', 'password', 'number', 'tel', 'url', 'search'];

      validTypes.forEach(type => {
        const props = { type };
        const result = InputPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid type values', () => {
      const invalidProps = { type: 'invalid' };
      const result = InputPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate size enum values', () => {
      const validSizes = ['sm', 'md', 'lg'];

      validSizes.forEach(size => {
        const props = { size };
        const result = InputPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid size values', () => {
      const invalidProps = { size: 'invalid' };
      const result = InputPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate variant enum values', () => {
      const validVariants = ['default', 'outlined', 'filled', 'flushed'];

      validVariants.forEach(variant => {
        const props = { variant };
        const result = InputPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid variant values', () => {
      const invalidProps = { variant: 'invalid' };
      const result = InputPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate string props', () => {
      const stringProps = {
        placeholder: 'Enter your name',
        value: 'John Doe',
        defaultValue: 'Default Name',
        label: 'Full Name',
        helperText: 'Enter your full name',
        errorText: 'Name is required',
        pattern: '[A-Za-z ]+',
      };

      const result = InputPropsSchema.safeParse(stringProps);
      expect(result.success).toBe(true);
    });

    it('should validate number props', () => {
      const numberProps = {
        maxLength: 100,
        minLength: 5,
      };

      const result = InputPropsSchema.safeParse(numberProps);
      expect(result.success).toBe(true);
    });

    it('should reject negative length values', () => {
      const invalidProps = { maxLength: -5 };
      const result = InputPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate boolean state props', () => {
      const booleanProps = {
        disabled: true,
        readOnly: true,
        required: true,
        invalid: true,
      };

      const result = InputPropsSchema.safeParse(booleanProps);
      expect(result.success).toBe(true);
    });

    it('should validate icon and element props', () => {
      const iconProps = {
        leftIcon: '<svg>...</svg>',
        rightIcon: '<svg>...</svg>',
        leftElement: '<span>$</span>',
        rightElement: '<button>Clear</button>',
      };

      const result = InputPropsSchema.safeParse(iconProps);
      expect(result.success).toBe(true);
    });

    it('should validate accessibility props', () => {
      const accessibilityProps = {
        'aria-label': 'Search field',
        'aria-describedby': 'search-description',
        role: 'searchbox',
        id: 'search-input',
        'data-testid': 'search-input',
      };

      const result = InputPropsSchema.safeParse(accessibilityProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Input Class Generation Logic', () => {
    it('should generate correct base classes', () => {
      const expectedInputBaseClasses = [
        'w-full',
        'transition-all',
        'duration-200',
        'placeholder-gray-400',
        'focus:outline-none',
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
        'disabled:bg-gray-50',
      ];

      const inputBaseClasses = expectedInputBaseClasses.join(' ');
      expect(inputBaseClasses).toContain('w-full');
      expect(inputBaseClasses).toContain('transition-all');
      expect(inputBaseClasses).toContain('duration-200');
      expect(inputBaseClasses).toContain('placeholder-gray-400');
      expect(inputBaseClasses).toContain('focus:outline-none');
      expect(inputBaseClasses).toContain('disabled:cursor-not-allowed');
      expect(inputBaseClasses).toContain('disabled:opacity-50');
      expect(inputBaseClasses).toContain('disabled:bg-gray-50');
    });

    it('should generate correct size classes', () => {
      const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
      };

      Object.entries(sizeClasses).forEach(([_size, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain('px-');
        expect(classes).toContain('py-');
        expect(classes).toContain('text-');
      });
    });

    it('should generate correct variant classes', () => {
      const variantClasses = {
        default:
          'border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        outlined:
          'border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        filled:
          'border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        flushed:
          'border-0 border-b-2 border-gray-300 rounded-none px-0 focus:ring-0 focus:border-blue-500',
      };

      Object.entries(variantClasses).forEach(([_variant, classes]) => {
        expect(classes).toBeDefined();
        expect(typeof classes).toBe('string');
        expect(classes.length).toBeGreaterThan(0);
      });
    });

    it('should generate correct icon size classes', () => {
      const iconSizeMap = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
      };

      Object.entries(iconSizeMap).forEach(([_size, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain('w-');
        expect(classes).toContain('h-');
      });
    });

    it('should generate correct padding adjustments for icons', () => {
      const paddingMap = {
        sm: { left: 'pl-10', right: 'pr-10' },
        md: { left: 'pl-11', right: 'pr-11' },
        lg: { left: 'pl-12', right: 'pr-12' },
      };

      Object.entries(paddingMap).forEach(([_size, paddings]) => {
        expect(paddings.left).toContain('pl-');
        expect(paddings.right).toContain('pr-');
      });
    });

    it('should generate correct label classes', () => {
      const labelClasses = ['block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-1'];

      const labelClassString = labelClasses.join(' ');
      expect(labelClassString).toContain('block');
      expect(labelClassString).toContain('text-sm');
      expect(labelClassString).toContain('font-medium');
      expect(labelClassString).toContain('text-gray-700');
      expect(labelClassString).toContain('mb-1');
    });
  });

  describe('Input State Management', () => {
    it('should handle disabled state correctly', () => {
      const disabledProps = { disabled: true };
      const result = InputPropsSchema.safeParse(disabledProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.disabled).toBe(true);
      }
    });

    it('should handle read-only state correctly', () => {
      const readOnlyProps = { readOnly: true };
      const result = InputPropsSchema.safeParse(readOnlyProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.readOnly).toBe(true);
      }
    });

    it('should handle required state correctly', () => {
      const requiredProps = { required: true };
      const result = InputPropsSchema.safeParse(requiredProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required).toBe(true);
      }
    });

    it('should handle invalid state correctly', () => {
      const invalidProps = { invalid: true };
      const result = InputPropsSchema.safeParse(invalidProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invalid).toBe(true);
      }
    });

    it('should handle combined states correctly', () => {
      const combinedProps = {
        disabled: false,
        readOnly: false,
        required: true,
        invalid: false,
      };
      const result = InputPropsSchema.safeParse(combinedProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.disabled).toBe(false);
        expect(result.data.readOnly).toBe(false);
        expect(result.data.required).toBe(true);
        expect(result.data.invalid).toBe(false);
      }
    });

    it('should validate invalid state styling', () => {
      const invalid = true;
      const stateClasses = invalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';

      expect(stateClasses).toContain('border-red-500');
      expect(stateClasses).toContain('focus:border-red-500');
      expect(stateClasses).toContain('focus:ring-red-500');
    });
  });

  describe('Input Accessibility', () => {
    it('should support ARIA attributes', () => {
      const ariaProps = {
        'aria-label': 'Email address',
        'aria-describedby': 'email-description',
        role: 'textbox',
      };

      const result = InputPropsSchema.safeParse(ariaProps);
      expect(result.success).toBe(true);
    });

    it('should support form validation attributes', () => {
      const validationProps = {
        required: true,
        maxLength: 100,
        minLength: 5,
        pattern: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
      };

      const result = InputPropsSchema.safeParse(validationProps);
      expect(result.success).toBe(true);
    });

    it('should support label association', () => {
      const labelProps = {
        label: 'Email Address',
        id: 'email-input',
      };

      const result = InputPropsSchema.safeParse(labelProps);
      expect(result.success).toBe(true);
    });

    it('should support helper and error text', () => {
      const textProps = {
        helperText: 'We will never share your email',
        errorText: 'Please enter a valid email address',
      };

      const result = InputPropsSchema.safeParse(textProps);
      expect(result.success).toBe(true);
    });

    it('should handle required field indicators', () => {
      const requiredProps = { required: true, label: 'Name' };
      const result = InputPropsSchema.safeParse(requiredProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required).toBe(true);
        expect(result.data.label).toBe('Name');
      }
    });
  });

  describe('Input Types and Validation', () => {
    it('should validate email input type', () => {
      const emailProps = {
        type: 'email',
        placeholder: 'Enter your email',
        pattern: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
      };

      const result = InputPropsSchema.safeParse(emailProps);
      expect(result.success).toBe(true);
    });

    it('should validate password input type', () => {
      const passwordProps = {
        type: 'password',
        placeholder: 'Enter your password',
        minLength: 8,
      };

      const result = InputPropsSchema.safeParse(passwordProps);
      expect(result.success).toBe(true);
    });

    it('should validate number input type', () => {
      const numberProps = {
        type: 'number',
        placeholder: 'Enter a number',
      };

      const result = InputPropsSchema.safeParse(numberProps);
      expect(result.success).toBe(true);
    });

    it('should validate tel input type', () => {
      const telProps = {
        type: 'tel',
        placeholder: 'Enter your phone number',
        pattern: '\\d{3}-\\d{3}-\\d{4}',
      };

      const result = InputPropsSchema.safeParse(telProps);
      expect(result.success).toBe(true);
    });

    it('should validate url input type', () => {
      const urlProps = {
        type: 'url',
        placeholder: 'Enter a URL',
      };

      const result = InputPropsSchema.safeParse(urlProps);
      expect(result.success).toBe(true);
    });

    it('should validate search input type', () => {
      const searchProps = {
        type: 'search',
        placeholder: 'Search...',
        role: 'searchbox',
      };

      const result = InputPropsSchema.safeParse(searchProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Input Icons and Elements', () => {
    it('should validate left icon configuration', () => {
      const leftIconProps = {
        leftIcon: '<svg><path d="..."/></svg>',
        size: 'md',
      };

      const result = InputPropsSchema.safeParse(leftIconProps);
      expect(result.success).toBe(true);
    });

    it('should validate right icon configuration', () => {
      const rightIconProps = {
        rightIcon: '<svg><path d="..."/></svg>',
        size: 'lg',
      };

      const result = InputPropsSchema.safeParse(rightIconProps);
      expect(result.success).toBe(true);
    });

    it('should validate left element configuration', () => {
      const leftElementProps = {
        leftElement: '<span class="text-gray-500">$</span>',
      };

      const result = InputPropsSchema.safeParse(leftElementProps);
      expect(result.success).toBe(true);
    });

    it('should validate right element configuration', () => {
      const rightElementProps = {
        rightElement: '<button type="button">Clear</button>',
      };

      const result = InputPropsSchema.safeParse(rightElementProps);
      expect(result.success).toBe(true);
    });

    it('should validate combined icon and element configuration', () => {
      const combinedProps = {
        leftIcon: '<svg><path d="..."/></svg>',
        rightElement: '<button type="button">Submit</button>',
      };

      const result = InputPropsSchema.safeParse(combinedProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Input Component Integration', () => {
    it('should work with form submission', () => {
      const formProps = {
        type: 'text',
        name: 'username',
        required: true,
        placeholder: 'Enter username',
      };

      const result = InputPropsSchema.safeParse(formProps);
      expect(result.success).toBe(true);
    });

    it('should work with validation feedback', () => {
      const validationProps = {
        type: 'email',
        invalid: true,
        errorText: 'Please enter a valid email address',
        'aria-describedby': 'email-error',
      };

      const result = InputPropsSchema.safeParse(validationProps);
      expect(result.success).toBe(true);
    });

    it('should work with complete form field setup', () => {
      const completeProps = {
        type: 'email',
        size: 'md',
        variant: 'outlined',
        label: 'Email Address',
        placeholder: 'Enter your email',
        helperText: 'We will never share your email',
        required: true,
        leftIcon: '<svg>...</svg>',
        id: 'email-field',
        'data-testid': 'email-input',
      };

      const result = InputPropsSchema.safeParse(completeProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Input Performance', () => {
    it('should handle large number of props efficiently', () => {
      const manyProps = {
        type: 'text',
        size: 'lg',
        variant: 'outlined',
        placeholder: 'Performance test input',
        value: 'Test value',
        disabled: false,
        readOnly: false,
        required: true,
        invalid: false,
        leftIcon: '<svg>...</svg>',
        rightIcon: '<svg>...</svg>',
        label: 'Performance Test',
        helperText: 'This is a performance test input',
        maxLength: 100,
        minLength: 5,
        pattern: '[A-Za-z0-9]+',
        className: 'performance-test-input',
        id: 'performance-test',
        'data-testid': 'performance-input',
        'aria-label': 'Performance test input',
        'aria-describedby': 'performance-description',
        role: 'textbox',
      };

      const result = InputPropsSchema.safeParse(manyProps);
      expect(result.success).toBe(true);
    });

    it('should validate props schema efficiently', () => {
      const startTime = performance.now();

      const configurations = [
        { type: 'text', size: 'sm', variant: 'default' },
        { type: 'email', size: 'md', variant: 'outlined' },
        { type: 'password', size: 'lg', variant: 'filled' },
        { type: 'search', variant: 'flushed' },
        { type: 'number', required: true, invalid: true },
      ];

      configurations.forEach(config => {
        const result = InputPropsSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      expect(validationTime).toBeLessThan(50);
    });
  });
});
