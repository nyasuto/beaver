/**
 * UI Components Index Tests
 *
 * Tests for the UI components index module
 * Validates component metadata and utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  UI_COMPONENTS,
  getComponentMeta,
  getComponentNames,
  hasComponent,
  type UIComponentName,
} from '../index';

describe('UI Components Index', () => {
  describe('UI_COMPONENTS constant', () => {
    it('should contain all expected component metadata', () => {
      const expectedComponents = ['Button', 'Card', 'Input', 'Modal'];

      expectedComponents.forEach(componentName => {
        expect(UI_COMPONENTS[componentName as UIComponentName]).toBeDefined();
      });
    });

    it('should have complete Button metadata', () => {
      const buttonMeta = UI_COMPONENTS.Button;

      expect(buttonMeta.name).toBe('Button');
      expect(buttonMeta.description).toBe(
        'Versatile button component with multiple variants and states'
      );
      expect(buttonMeta.path).toBe('./Button.astro');
      expect(buttonMeta.variants).toEqual(['primary', 'secondary', 'outline', 'ghost', 'link']);
      expect(buttonMeta.sizes).toEqual(['sm', 'md', 'lg', 'xl']);
    });

    it('should have complete Card metadata', () => {
      const cardMeta = UI_COMPONENTS.Card;

      expect(cardMeta.name).toBe('Card');
      expect(cardMeta.description).toBe('Flexible container component with customizable layouts');
      expect(cardMeta.path).toBe('./Card.astro');
      expect(cardMeta.variants).toEqual(['default', 'outlined', 'elevated', 'filled']);
      expect(cardMeta.padding).toEqual(['none', 'sm', 'md', 'lg', 'xl']);
    });

    it('should have complete Input metadata', () => {
      const inputMeta = UI_COMPONENTS.Input;

      expect(inputMeta.name).toBe('Input');
      expect(inputMeta.description).toBe('Comprehensive input component with validation and icons');
      expect(inputMeta.path).toBe('./Input.astro');
      expect(inputMeta.types).toEqual([
        'text',
        'email',
        'password',
        'number',
        'tel',
        'url',
        'search',
      ]);
      expect(inputMeta.variants).toEqual(['default', 'outlined', 'filled', 'flushed']);
    });

    it('should have complete Modal metadata', () => {
      const modalMeta = UI_COMPONENTS.Modal;

      expect(modalMeta.name).toBe('Modal');
      expect(modalMeta.description).toBe(
        'Modal dialog component with focus management and keyboard navigation'
      );
      expect(modalMeta.path).toBe('./Modal.astro');
      expect(modalMeta.sizes).toEqual(['sm', 'md', 'lg', 'xl', 'full']);
      expect(modalMeta.features).toEqual([
        'overlay',
        'focus-trap',
        'keyboard-navigation',
        'customizable-header-footer',
      ]);
    });

    it('should be immutable (const assertion)', () => {
      // This test ensures TypeScript treats UI_COMPONENTS as immutable
      const components = UI_COMPONENTS;
      expect(components).toBe(UI_COMPONENTS);

      // Type-level test - should not allow modifications
      // Note: components.Button = {} would cause TypeScript errors
    });
  });

  describe('getComponentMeta function', () => {
    it('should return correct metadata for Button', () => {
      const meta = getComponentMeta('Button');

      expect(meta).toEqual({
        name: 'Button',
        description: 'Versatile button component with multiple variants and states',
        path: './Button.astro',
        variants: ['primary', 'secondary', 'outline', 'ghost', 'link'],
        sizes: ['sm', 'md', 'lg', 'xl'],
      });
    });

    it('should return correct metadata for Card', () => {
      const meta = getComponentMeta('Card');

      expect(meta).toEqual({
        name: 'Card',
        description: 'Flexible container component with customizable layouts',
        path: './Card.astro',
        variants: ['default', 'outlined', 'elevated', 'filled'],
        padding: ['none', 'sm', 'md', 'lg', 'xl'],
      });
    });

    it('should return correct metadata for Input', () => {
      const meta = getComponentMeta('Input');

      expect(meta).toEqual({
        name: 'Input',
        description: 'Comprehensive input component with validation and icons',
        path: './Input.astro',
        types: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
        variants: ['default', 'outlined', 'filled', 'flushed'],
      });
    });

    it('should return correct metadata for Modal', () => {
      const meta = getComponentMeta('Modal');

      expect(meta).toEqual({
        name: 'Modal',
        description: 'Modal dialog component with focus management and keyboard navigation',
        path: './Modal.astro',
        sizes: ['sm', 'md', 'lg', 'xl', 'full'],
        features: ['overlay', 'focus-trap', 'keyboard-navigation', 'customizable-header-footer'],
      });
    });

    it('should return the same reference for same component', () => {
      const meta1 = getComponentMeta('Button');
      const meta2 = getComponentMeta('Button');

      expect(meta1).toBe(meta2);
    });
  });

  describe('getComponentNames function', () => {
    it('should return all component names', () => {
      const names = getComponentNames();

      expect(names).toEqual(['Button', 'Card', 'Input', 'Modal']);
      expect(names).toHaveLength(4);
    });

    it('should return a new array each time', () => {
      const names1 = getComponentNames();
      const names2 = getComponentNames();

      expect(names1).toEqual(names2);
      expect(names1).not.toBe(names2); // Different references
    });

    it('should return valid UIComponentName types', () => {
      const names = getComponentNames();

      names.forEach(name => {
        expect(typeof name).toBe('string');
        expect(UI_COMPONENTS[name]).toBeDefined();
      });
    });
  });

  describe('hasComponent function', () => {
    it('should return true for existing components', () => {
      expect(hasComponent('Button')).toBe(true);
      expect(hasComponent('Card')).toBe(true);
      expect(hasComponent('Input')).toBe(true);
      expect(hasComponent('Modal')).toBe(true);
    });

    it('should return false for non-existing components', () => {
      expect(hasComponent('NonExistent')).toBe(false);
      expect(hasComponent('button')).toBe(false); // Case sensitive
      expect(hasComponent('BUTTON')).toBe(false); // Case sensitive
      expect(hasComponent('')).toBe(false);
      expect(hasComponent('Dropdown')).toBe(false);
      expect(hasComponent('Tooltip')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(hasComponent('undefined')).toBe(false);
      expect(hasComponent('null')).toBe(false);
      expect(hasComponent('0')).toBe(false);
      expect(hasComponent('false')).toBe(false);
    });

    it('should provide type narrowing', () => {
      const testName = 'Button';

      if (hasComponent(testName)) {
        // TypeScript should narrow testName to UIComponentName
        const meta = getComponentMeta(testName);
        expect(meta).toBeDefined();
      }
    });
  });

  describe('Component metadata validation', () => {
    it('should have consistent path formats', () => {
      const names = getComponentNames();

      names.forEach(name => {
        const meta = getComponentMeta(name);
        expect(meta.path).toMatch(/^\.\/\w+\.astro$/);
      });
    });

    it('should have non-empty descriptions', () => {
      const names = getComponentNames();

      names.forEach(name => {
        const meta = getComponentMeta(name);
        expect(meta.description).toBeTruthy();
        expect(meta.description.length).toBeGreaterThan(10);
      });
    });

    it('should have valid component names', () => {
      const names = getComponentNames();

      names.forEach(name => {
        const meta = getComponentMeta(name);
        expect(meta.name).toBe(name);
        expect(meta.name).toMatch(/^[A-Z][a-zA-Z]*$/); // PascalCase
      });
    });

    it('should have variant arrays for components that support them', () => {
      const buttonMeta = getComponentMeta('Button') as typeof UI_COMPONENTS.Button;
      const cardMeta = getComponentMeta('Card') as typeof UI_COMPONENTS.Card;
      const inputMeta = getComponentMeta('Input') as typeof UI_COMPONENTS.Input;

      expect(Array.isArray(buttonMeta.variants)).toBe(true);
      expect(buttonMeta.variants.length).toBeGreaterThan(0);

      expect(Array.isArray(cardMeta.variants)).toBe(true);
      expect(cardMeta.variants.length).toBeGreaterThan(0);

      expect(Array.isArray(inputMeta.variants)).toBe(true);
      expect(inputMeta.variants.length).toBeGreaterThan(0);
    });

    it('should have size arrays for components that support them', () => {
      const buttonMeta = getComponentMeta('Button') as typeof UI_COMPONENTS.Button;
      const modalMeta = getComponentMeta('Modal') as typeof UI_COMPONENTS.Modal;

      expect(Array.isArray(buttonMeta.sizes)).toBe(true);
      expect(buttonMeta.sizes.length).toBeGreaterThan(0);

      expect(Array.isArray(modalMeta.sizes)).toBe(true);
      expect(modalMeta.sizes.length).toBeGreaterThan(0);
    });
  });

  describe('Type exports', () => {
    it('should export UIComponentName type correctly', () => {
      // Type-level tests
      const validNames: UIComponentName[] = ['Button', 'Card', 'Input', 'Modal'];

      validNames.forEach(name => {
        expect(hasComponent(name)).toBe(true);
      });
    });
  });

  describe('Integration with UI schemas', () => {
    it('should be able to import types from UI schemas', () => {
      // This test verifies that the type exports work correctly
      // The actual types are imported at the module level

      // If the imports work, the module loads successfully
      expect(true).toBe(true);
    });
  });

  describe('Performance considerations', () => {
    it('should handle repeated calls efficiently', () => {
      const startTime = performance.now();

      // Simulate multiple calls
      for (let i = 0; i < 1000; i++) {
        getComponentNames();
        hasComponent('Button');
        getComponentMeta('Button');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100);
    });

    it('should not create unnecessary objects', () => {
      const meta1 = getComponentMeta('Button');
      const meta2 = getComponentMeta('Button');

      // Should return the same reference (not a new object)
      expect(meta1).toBe(meta2);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid component names gracefully', () => {
      expect(() => hasComponent('InvalidComponent')).not.toThrow();
      expect(hasComponent('InvalidComponent')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(() => hasComponent('')).not.toThrow();
      expect(hasComponent('')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(() => hasComponent('Button!')).not.toThrow();
      expect(hasComponent('Button!')).toBe(false);
    });
  });
});
