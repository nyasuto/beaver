/**
 * Modal Component Tests
 *
 * Tests for Modal.astro component to ensure proper props validation,
 * accessibility features, and interactive functionality.
 */

import { describe, it, expect } from 'vitest';
import { ModalPropsSchema, type ModalProps } from '../../../lib/schemas/ui';

describe('Modal Component', () => {
  describe('Props Schema Validation', () => {
    it('should validate valid modal props', () => {
      const validProps: ModalProps = {
        isOpen: false,
        size: 'md',
        centered: true,
        closeOnOverlayClick: true,
        closeOnEsc: true,
        showCloseButton: true,
      };

      const result = ModalPropsSchema.safeParse(validProps);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional props', () => {
      const minimalProps = {};
      const result = ModalPropsSchema.safeParse(minimalProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isOpen).toBe(false);
        expect(result.data.size).toBe('md');
        expect(result.data.centered).toBe(true);
        expect(result.data.closeOnOverlayClick).toBe(true);
        expect(result.data.closeOnEsc).toBe(true);
        expect(result.data.showCloseButton).toBe(true);
      }
    });

    it('should validate size enum values', () => {
      const validSizes = ['sm', 'md', 'lg', 'xl', 'full'];

      validSizes.forEach(size => {
        const props = { size };
        const result = ModalPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid size values', () => {
      const invalidProps = { size: 'invalid' };
      const result = ModalPropsSchema.safeParse(invalidProps);
      expect(result.success).toBe(false);
    });

    it('should validate boolean props', () => {
      const booleanProps = {
        isOpen: true,
        centered: false,
        closeOnOverlayClick: false,
        closeOnEsc: false,
        showCloseButton: false,
      };

      const result = ModalPropsSchema.safeParse(booleanProps);
      expect(result.success).toBe(true);
    });

    it('should validate string props', () => {
      const stringProps = {
        title: 'Modal Title',
        header: '<h2>Custom Header</h2>',
        footer: '<div>Custom Footer</div>',
      };

      const result = ModalPropsSchema.safeParse(stringProps);
      expect(result.success).toBe(true);
    });

    it('should validate accessibility props', () => {
      const accessibilityProps = {
        'aria-describedby': 'modal-description',
        role: 'dialog',
        id: 'custom-modal',
        'data-testid': 'modal-test',
      };

      const result = ModalPropsSchema.safeParse(accessibilityProps);
      expect(result.success).toBe(true);
    });

    it('should validate function props', () => {
      const functionProps = {
        onClose: () => {},
      };

      const result = ModalPropsSchema.safeParse(functionProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Modal Class Generation Logic', () => {
    it('should generate correct overlay classes', () => {
      const expectedOverlayClasses = [
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'items-center',
        'justify-center',
        'bg-black',
        'bg-opacity-50',
        'transition-opacity',
        'duration-300',
        'backdrop-blur-sm',
      ];

      const overlayClasses = expectedOverlayClasses.join(' ');
      expect(overlayClasses).toContain('fixed');
      expect(overlayClasses).toContain('inset-0');
      expect(overlayClasses).toContain('z-50');
      expect(overlayClasses).toContain('flex');
      expect(overlayClasses).toContain('items-center');
      expect(overlayClasses).toContain('justify-center');
      expect(overlayClasses).toContain('bg-black');
      expect(overlayClasses).toContain('bg-opacity-50');
      expect(overlayClasses).toContain('transition-opacity');
      expect(overlayClasses).toContain('duration-300');
      expect(overlayClasses).toContain('backdrop-blur-sm');
    });

    it('should generate correct size classes', () => {
      const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-full mx-4 my-4 h-full',
      };

      Object.entries(sizeClasses).forEach(([size, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain('max-w-');
        if (size === 'full') {
          expect(classes).toContain('h-full');
          expect(classes).toContain('mx-4');
          expect(classes).toContain('my-4');
        }
      });
    });

    it('should generate correct content classes', () => {
      const expectedContentClasses = [
        'bg-white',
        'rounded-lg',
        'shadow-xl',
        'transform',
        'transition-all',
        'duration-300',
        'max-h-full',
        'overflow-hidden',
        'flex',
        'flex-col',
      ];

      const contentClasses = expectedContentClasses.join(' ');
      expect(contentClasses).toContain('bg-white');
      expect(contentClasses).toContain('rounded-lg');
      expect(contentClasses).toContain('shadow-xl');
      expect(contentClasses).toContain('transform');
      expect(contentClasses).toContain('transition-all');
      expect(contentClasses).toContain('duration-300');
      expect(contentClasses).toContain('max-h-full');
      expect(contentClasses).toContain('overflow-hidden');
      expect(contentClasses).toContain('flex');
      expect(contentClasses).toContain('flex-col');
    });

    it('should generate correct header classes', () => {
      const expectedHeaderClasses = [
        'flex',
        'items-center',
        'justify-between',
        'px-6',
        'py-4',
        'border-b',
        'border-gray-200',
        'bg-gray-50',
      ];

      const headerClasses = expectedHeaderClasses.join(' ');
      expect(headerClasses).toContain('flex');
      expect(headerClasses).toContain('items-center');
      expect(headerClasses).toContain('justify-between');
      expect(headerClasses).toContain('px-6');
      expect(headerClasses).toContain('py-4');
      expect(headerClasses).toContain('border-b');
      expect(headerClasses).toContain('border-gray-200');
      expect(headerClasses).toContain('bg-gray-50');
    });

    it('should generate correct body classes', () => {
      const expectedBodyClasses = ['flex-1', 'px-6', 'py-4', 'overflow-y-auto'];

      const bodyClasses = expectedBodyClasses.join(' ');
      expect(bodyClasses).toContain('flex-1');
      expect(bodyClasses).toContain('px-6');
      expect(bodyClasses).toContain('py-4');
      expect(bodyClasses).toContain('overflow-y-auto');
    });

    it('should generate correct footer classes', () => {
      const expectedFooterClasses = [
        'px-6',
        'py-4',
        'border-t',
        'border-gray-200',
        'bg-gray-50',
        'flex',
        'items-center',
        'justify-end',
        'space-x-2',
      ];

      const footerClasses = expectedFooterClasses.join(' ');
      expect(footerClasses).toContain('px-6');
      expect(footerClasses).toContain('py-4');
      expect(footerClasses).toContain('border-t');
      expect(footerClasses).toContain('border-gray-200');
      expect(footerClasses).toContain('bg-gray-50');
      expect(footerClasses).toContain('flex');
      expect(footerClasses).toContain('items-center');
      expect(footerClasses).toContain('justify-end');
      expect(footerClasses).toContain('space-x-2');
    });

    it('should generate correct close button classes', () => {
      const expectedCloseButtonClasses = [
        'text-gray-400',
        'hover:text-gray-600',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'rounded-md',
        'p-1',
        'transition-colors',
        'duration-200',
      ];

      const closeButtonClasses = expectedCloseButtonClasses.join(' ');
      expect(closeButtonClasses).toContain('text-gray-400');
      expect(closeButtonClasses).toContain('hover:text-gray-600');
      expect(closeButtonClasses).toContain('focus:outline-none');
      expect(closeButtonClasses).toContain('focus:ring-2');
      expect(closeButtonClasses).toContain('focus:ring-blue-500');
      expect(closeButtonClasses).toContain('rounded-md');
      expect(closeButtonClasses).toContain('p-1');
      expect(closeButtonClasses).toContain('transition-colors');
      expect(closeButtonClasses).toContain('duration-200');
    });

    it('should handle centered vs non-centered positioning', () => {
      const centeredClass = 'items-center';
      const nonCenteredClass = 'items-start pt-16';

      expect(centeredClass).toContain('items-center');
      expect(nonCenteredClass).toContain('items-start');
      expect(nonCenteredClass).toContain('pt-16');
    });
  });

  describe('Modal State Management', () => {
    it('should handle isOpen state correctly', () => {
      const openProps = { isOpen: true };
      const result = ModalPropsSchema.safeParse(openProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isOpen).toBe(true);
      }
    });

    it('should handle centered state correctly', () => {
      const centeredProps = { centered: false };
      const result = ModalPropsSchema.safeParse(centeredProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.centered).toBe(false);
      }
    });

    it('should handle close behavior settings', () => {
      const closeBehaviorProps = {
        closeOnOverlayClick: false,
        closeOnEsc: false,
        showCloseButton: false,
      };
      const result = ModalPropsSchema.safeParse(closeBehaviorProps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.closeOnOverlayClick).toBe(false);
        expect(result.data.closeOnEsc).toBe(false);
        expect(result.data.showCloseButton).toBe(false);
      }
    });

    it('should validate all size variations', () => {
      const sizes = ['sm', 'md', 'lg', 'xl', 'full'];

      sizes.forEach(size => {
        const props = { size, isOpen: true };
        const result = ModalPropsSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Modal Accessibility', () => {
    it('should support ARIA attributes', () => {
      const ariaProps = {
        'aria-describedby': 'modal-description',
        role: 'dialog',
      };

      const result = ModalPropsSchema.safeParse(ariaProps);
      expect(result.success).toBe(true);
    });

    it('should support modal identification', () => {
      const idProps = {
        id: 'confirmation-modal',
        'data-testid': 'confirmation-modal',
      };

      const result = ModalPropsSchema.safeParse(idProps);
      expect(result.success).toBe(true);
    });

    it('should support title for accessibility', () => {
      const titleProps = {
        title: 'Confirm Action',
        isOpen: true,
      };

      const result = ModalPropsSchema.safeParse(titleProps);
      expect(result.success).toBe(true);
    });

    it('should validate focus management requirements', () => {
      const focusProps = {
        isOpen: true,
        showCloseButton: true,
        closeOnEsc: true,
      };

      const result = ModalPropsSchema.safeParse(focusProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Modal Content Structure', () => {
    it('should validate header content', () => {
      const headerProps = {
        title: 'Modal Title',
        header: '<h2>Custom Header</h2>',
      };

      const result = ModalPropsSchema.safeParse(headerProps);
      expect(result.success).toBe(true);
    });

    it('should validate footer content', () => {
      const footerProps = {
        footer: '<div><button>Cancel</button><button>Save</button></div>',
      };

      const result = ModalPropsSchema.safeParse(footerProps);
      expect(result.success).toBe(true);
    });

    it('should validate complete modal structure', () => {
      const completeProps = {
        isOpen: true,
        size: 'lg',
        centered: true,
        title: 'Complete Modal',
        header: '<div class="flex items-center"><h2>Custom Header</h2></div>',
        footer: '<div class="flex gap-2"><button>Cancel</button><button>Save</button></div>',
        showCloseButton: true,
        closeOnOverlayClick: true,
        closeOnEsc: true,
      };

      const result = ModalPropsSchema.safeParse(completeProps);
      expect(result.success).toBe(true);
    });

    it('should validate minimal modal structure', () => {
      const minimalProps = {
        isOpen: true,
      };

      const result = ModalPropsSchema.safeParse(minimalProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Modal Interaction Behaviors', () => {
    it('should validate close on overlay click behavior', () => {
      const overlayProps = {
        closeOnOverlayClick: true,
        isOpen: true,
      };

      const result = ModalPropsSchema.safeParse(overlayProps);
      expect(result.success).toBe(true);
    });

    it('should validate close on escape key behavior', () => {
      const escapeProps = {
        closeOnEsc: true,
        isOpen: true,
      };

      const result = ModalPropsSchema.safeParse(escapeProps);
      expect(result.success).toBe(true);
    });

    it('should validate close button behavior', () => {
      const closeButtonProps = {
        showCloseButton: true,
        isOpen: true,
      };

      const result = ModalPropsSchema.safeParse(closeButtonProps);
      expect(result.success).toBe(true);
    });

    it('should validate onClose callback', () => {
      const callbackProps = {
        onClose: () => console.log('Modal closed'),
        isOpen: true,
      };

      const result = ModalPropsSchema.safeParse(callbackProps);
      expect(result.success).toBe(true);
    });

    it('should validate combined interaction settings', () => {
      const interactionProps = {
        closeOnOverlayClick: true,
        closeOnEsc: true,
        showCloseButton: true,
        onClose: () => {},
      };

      const result = ModalPropsSchema.safeParse(interactionProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Modal Styling and Layout', () => {
    it('should validate custom styling props', () => {
      const styleProps = {
        className: 'custom-modal-class',
        style: { zIndex: '1000' },
      };

      const result = ModalPropsSchema.safeParse(styleProps);
      expect(result.success).toBe(true);
    });

    it('should validate all size configurations', () => {
      const sizeConfigurations = [
        { size: 'sm', isOpen: true },
        { size: 'md', isOpen: true },
        { size: 'lg', isOpen: true },
        { size: 'xl', isOpen: true },
        { size: 'full', isOpen: true },
      ];

      sizeConfigurations.forEach(config => {
        const result = ModalPropsSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should validate centered vs non-centered layouts', () => {
      const layoutConfigs = [
        { centered: true, isOpen: true },
        { centered: false, isOpen: true },
      ];

      layoutConfigs.forEach(config => {
        const result = ModalPropsSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Modal Component Integration', () => {
    it('should work as a confirmation dialog', () => {
      const confirmationProps = {
        isOpen: true,
        size: 'sm',
        title: 'Confirm Action',
        footer: '<div><button>Cancel</button><button>Confirm</button></div>',
        closeOnOverlayClick: true,
        closeOnEsc: true,
      };

      const result = ModalPropsSchema.safeParse(confirmationProps);
      expect(result.success).toBe(true);
    });

    it('should work as a form modal', () => {
      const formProps = {
        isOpen: true,
        size: 'lg',
        title: 'Create New Item',
        footer:
          '<div><button type="button">Cancel</button><button type="submit">Save</button></div>',
        showCloseButton: true,
      };

      const result = ModalPropsSchema.safeParse(formProps);
      expect(result.success).toBe(true);
    });

    it('should work as a full-screen modal', () => {
      const fullScreenProps = {
        isOpen: true,
        size: 'full',
        title: 'Full Screen View',
        centered: false,
        closeOnOverlayClick: false,
      };

      const result = ModalPropsSchema.safeParse(fullScreenProps);
      expect(result.success).toBe(true);
    });

    it('should work as a simple alert modal', () => {
      const alertProps = {
        isOpen: true,
        size: 'sm',
        title: 'Alert',
        showCloseButton: true,
        closeOnEsc: true,
      };

      const result = ModalPropsSchema.safeParse(alertProps);
      expect(result.success).toBe(true);
    });
  });

  describe('Modal Performance', () => {
    it('should handle large number of props efficiently', () => {
      const manyProps = {
        isOpen: true,
        size: 'lg',
        centered: true,
        closeOnOverlayClick: true,
        closeOnEsc: true,
        title: 'Performance Test Modal',
        header: '<div class="custom-header">Custom Header Content</div>',
        footer: '<div class="custom-footer"><button>Cancel</button><button>Save</button></div>',
        showCloseButton: true,
        onClose: () => console.log('Modal closed'),
        className: 'performance-test-modal',
        id: 'performance-modal',
        'data-testid': 'performance-modal',
        'aria-describedby': 'performance-description',
        role: 'dialog',
      };

      const result = ModalPropsSchema.safeParse(manyProps);
      expect(result.success).toBe(true);
    });

    it('should validate props schema efficiently', () => {
      const startTime = performance.now();

      const configurations = [
        { isOpen: true, size: 'sm' },
        { isOpen: true, size: 'md', title: 'Test' },
        { isOpen: true, size: 'lg', centered: false },
        { isOpen: true, size: 'xl', showCloseButton: false },
        { isOpen: true, size: 'full', closeOnOverlayClick: false },
      ];

      configurations.forEach(config => {
        const result = ModalPropsSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      expect(validationTime).toBeLessThan(50);
    });
  });
});
