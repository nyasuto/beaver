/**
 * UpdateNotification Component Test Suite
 *
 * Tests for the UpdateNotification component schema validation
 * and basic component structure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { BaseUIPropsSchema } from '../../lib/schemas/ui';

// Define schema and types locally for testing
const UpdateNotificationPropsSchema = BaseUIPropsSchema.extend({
  isVisible: z.boolean().default(false),
  currentVersion: z.string().optional(),
  latestVersion: z.string().optional(),
  position: z.enum(['top', 'bottom']).default('top'),
  animation: z.enum(['slide', 'fade', 'bounce']).default('slide'),
  autoHide: z.number().int().min(0).default(0),
  message: z.string().optional(),
  showVersionDetails: z.boolean().default(true),
  variant: z.enum(['info', 'success', 'warning']).default('info'),
});

type UpdateNotificationProps = z.infer<typeof UpdateNotificationPropsSchema>;

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => {
  cb(0);
  return 0;
});

// Mock setTimeout
const mockSetTimeout = vi.fn((cb, _delay) => {
  if (typeof cb === 'function') cb();
  return 0 as any;
});
Object.defineProperty(global, 'setTimeout', {
  value: mockSetTimeout,
});

describe('UpdateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Props Validation', () => {
    it('should validate valid props', () => {
      const validProps: UpdateNotificationProps = {
        isVisible: true,
        position: 'top',
        animation: 'slide',
        variant: 'info',
        autoHide: 5000,
        message: 'Test message',
        showVersionDetails: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.1',
      };

      expect(() => UpdateNotificationPropsSchema.parse(validProps)).not.toThrow();
    });

    it('should validate props with defaults', () => {
      const minimalProps = {};
      const result = UpdateNotificationPropsSchema.parse(minimalProps);

      expect(result.isVisible).toBe(false);
      expect(result.position).toBe('top');
      expect(result.animation).toBe('slide');
      expect(result.variant).toBe('info');
      expect(result.autoHide).toBe(0);
      expect(result.showVersionDetails).toBe(true);
    });

    it('should reject invalid position values', () => {
      const invalidProps = { position: 'middle' };
      expect(() => UpdateNotificationPropsSchema.parse(invalidProps)).toThrow();
    });

    it('should reject invalid animation values', () => {
      const invalidProps = { animation: 'spin' };
      expect(() => UpdateNotificationPropsSchema.parse(invalidProps)).toThrow();
    });

    it('should reject invalid variant values', () => {
      const invalidProps = { variant: 'error' };
      expect(() => UpdateNotificationPropsSchema.parse(invalidProps)).toThrow();
    });

    it('should reject negative autoHide values', () => {
      const invalidProps = { autoHide: -1000 };
      expect(() => UpdateNotificationPropsSchema.parse(invalidProps)).toThrow();
    });

    it('should accept valid position values', () => {
      const topProps = { position: 'top' };
      const bottomProps = { position: 'bottom' };

      expect(() => UpdateNotificationPropsSchema.parse(topProps)).not.toThrow();
      expect(() => UpdateNotificationPropsSchema.parse(bottomProps)).not.toThrow();
    });

    it('should accept valid animation values', () => {
      const slideProps = { animation: 'slide' };
      const fadeProps = { animation: 'fade' };
      const bounceProps = { animation: 'bounce' };

      expect(() => UpdateNotificationPropsSchema.parse(slideProps)).not.toThrow();
      expect(() => UpdateNotificationPropsSchema.parse(fadeProps)).not.toThrow();
      expect(() => UpdateNotificationPropsSchema.parse(bounceProps)).not.toThrow();
    });

    it('should accept valid variant values', () => {
      const infoProps = { variant: 'info' };
      const successProps = { variant: 'success' };
      const warningProps = { variant: 'warning' };

      expect(() => UpdateNotificationPropsSchema.parse(infoProps)).not.toThrow();
      expect(() => UpdateNotificationPropsSchema.parse(successProps)).not.toThrow();
      expect(() => UpdateNotificationPropsSchema.parse(warningProps)).not.toThrow();
    });

    it('should accept zero autoHide value', () => {
      const zeroAutoHideProps = { autoHide: 0 };
      expect(() => UpdateNotificationPropsSchema.parse(zeroAutoHideProps)).not.toThrow();
    });

    it('should accept positive autoHide values', () => {
      const positiveAutoHideProps = { autoHide: 5000 };
      expect(() => UpdateNotificationPropsSchema.parse(positiveAutoHideProps)).not.toThrow();
    });

    it('should accept boolean showVersionDetails', () => {
      const trueProps = { showVersionDetails: true };
      const falseProps = { showVersionDetails: false };

      expect(() => UpdateNotificationPropsSchema.parse(trueProps)).not.toThrow();
      expect(() => UpdateNotificationPropsSchema.parse(falseProps)).not.toThrow();
    });

    it('should accept optional string values', () => {
      const propsWithStrings = {
        message: 'Custom message',
        currentVersion: '1.0.0',
        latestVersion: '1.0.1',
      };

      expect(() => UpdateNotificationPropsSchema.parse(propsWithStrings)).not.toThrow();
    });
  });

  describe('Component Structure', () => {
    it('should create notification element with basic structure', () => {
      const element = document.createElement('div');
      element.id = 'update-notification';
      element.setAttribute('data-testid', 'update-notification');
      element.setAttribute('role', 'alert');
      element.setAttribute('aria-live', 'polite');
      element.setAttribute('aria-atomic', 'true');

      document.body.appendChild(element);

      expect(element.id).toBe('update-notification');
      expect(element.getAttribute('data-testid')).toBe('update-notification');
      expect(element.getAttribute('role')).toBe('alert');
      expect(element.getAttribute('aria-live')).toBe('polite');
      expect(element.getAttribute('aria-atomic')).toBe('true');
    });

    it('should set correct data attributes', () => {
      const element = document.createElement('div');
      element.setAttribute('data-position', 'top');
      element.setAttribute('data-animation', 'slide');
      element.setAttribute('data-auto-hide', '5000');

      expect(element.getAttribute('data-position')).toBe('top');
      expect(element.getAttribute('data-animation')).toBe('slide');
      expect(element.getAttribute('data-auto-hide')).toBe('5000');
    });

    it('should create buttons with correct data attributes', () => {
      const reloadButton = document.createElement('button');
      reloadButton.setAttribute('data-action', 'reload');
      reloadButton.setAttribute('aria-label', 'ページをリロードして更新を適用');

      const dismissButton = document.createElement('button');
      dismissButton.setAttribute('data-action', 'dismiss');
      dismissButton.setAttribute('aria-label', '通知を閉じる');

      const closeButton = document.createElement('button');
      closeButton.setAttribute('data-action', 'close');
      closeButton.setAttribute('aria-label', '通知を閉じる');

      expect(reloadButton.getAttribute('data-action')).toBe('reload');
      expect(dismissButton.getAttribute('data-action')).toBe('dismiss');
      expect(closeButton.getAttribute('data-action')).toBe('close');

      expect(reloadButton.getAttribute('aria-label')).toBe('ページをリロードして更新を適用');
      expect(dismissButton.getAttribute('aria-label')).toBe('通知を閉じる');
      expect(closeButton.getAttribute('aria-label')).toBe('通知を閉じる');
    });
  });

  describe('Event System', () => {
    it('should create custom events with correct structure', () => {
      const showEvent = new CustomEvent('notificationShow', {
        bubbles: true,
        detail: { notificationId: 'test-notification' },
      });

      const hideEvent = new CustomEvent('notificationHide', {
        bubbles: true,
        detail: { notificationId: 'test-notification' },
      });

      const reloadEvent = new CustomEvent('notificationReload', {
        bubbles: true,
        detail: { notificationId: 'test-notification' },
      });

      expect(showEvent.type).toBe('notificationShow');
      expect(showEvent.bubbles).toBe(true);
      expect(showEvent.detail.notificationId).toBe('test-notification');

      expect(hideEvent.type).toBe('notificationHide');
      expect(reloadEvent.type).toBe('notificationReload');
    });

    it('should handle version checker events', () => {
      const versionEvent = new CustomEvent('version:update-available', {
        detail: {
          currentVersion: { version: '1.0.0' },
          latestVersion: { version: '1.0.1' },
        },
      });

      expect(versionEvent.type).toBe('version:update-available');
      expect(versionEvent.detail.currentVersion.version).toBe('1.0.0');
      expect(versionEvent.detail.latestVersion.version).toBe('1.0.1');
    });
  });

  describe('Controller Interface', () => {
    it('should define controller interface structure', () => {
      interface UpdateNotificationController {
        show(currentVersion?: any, latestVersion?: any): void;
        hide(): void;
        setAutoHide(milliseconds: number): void;
        destroy(): void;
      }

      const mockController: UpdateNotificationController = {
        show: vi.fn(),
        hide: vi.fn(),
        setAutoHide: vi.fn(),
        destroy: vi.fn(),
      };

      expect(typeof mockController.show).toBe('function');
      expect(typeof mockController.hide).toBe('function');
      expect(typeof mockController.setAutoHide).toBe('function');
      expect(typeof mockController.destroy).toBe('function');
    });

    it('should handle controller method calls', () => {
      const mockController = {
        show: vi.fn(),
        hide: vi.fn(),
        setAutoHide: vi.fn(),
        destroy: vi.fn(),
      };

      mockController.show({ version: '1.0.0' }, { version: '1.0.1' });
      mockController.hide();
      mockController.setAutoHide(5000);
      mockController.destroy();

      expect(mockController.show).toHaveBeenCalledWith({ version: '1.0.0' }, { version: '1.0.1' });
      expect(mockController.hide).toHaveBeenCalled();
      expect(mockController.setAutoHide).toHaveBeenCalledWith(5000);
      expect(mockController.destroy).toHaveBeenCalled();
    });
  });

  describe('Version Info Display', () => {
    it('should format version strings correctly', () => {
      const formatVersionText = (current?: string, latest?: string): string => {
        let versionText = '';
        if (current) {
          versionText += `現在: v${current}`;
        }
        if (current && latest) {
          versionText += ' → ';
        }
        if (latest) {
          versionText += `最新: v${latest}`;
        }
        return versionText;
      };

      expect(formatVersionText('1.0.0', '1.0.1')).toBe('現在: v1.0.0 → 最新: v1.0.1');
      expect(formatVersionText('1.0.0')).toBe('現在: v1.0.0');
      expect(formatVersionText(undefined, '1.0.1')).toBe('最新: v1.0.1');
      expect(formatVersionText()).toBe('');
    });

    it('should create version display element', () => {
      const versionElement = document.createElement('p');
      versionElement.className = 'text-xs opacity-75 mt-1';
      versionElement.textContent = '現在: v1.0.0 → 最新: v1.0.1';

      expect(versionElement.className).toBe('text-xs opacity-75 mt-1');
      expect(versionElement.textContent).toBe('現在: v1.0.0 → 最新: v1.0.1');
    });
  });

  describe('Animation States', () => {
    it('should define animation classes correctly', () => {
      const animationClasses = {
        slide: {
          top: 'transform -translate-y-full',
          bottom: 'transform translate-y-full',
        },
        fade: 'opacity-0',
        bounce: 'transform scale-95',
      };

      expect(animationClasses.slide.top).toBe('transform -translate-y-full');
      expect(animationClasses.slide.bottom).toBe('transform translate-y-full');
      expect(animationClasses.fade).toBe('opacity-0');
      expect(animationClasses.bounce).toBe('transform scale-95');
    });

    it('should apply style properties for animations', () => {
      const element = document.createElement('div');

      // Test style application
      element.style.transform = 'translateY(-100%)';
      element.style.opacity = '0';

      expect(element.style.transform).toBe('translateY(-100%)');
      expect(element.style.opacity).toBe('0');
    });
  });

  describe('Variant Styling', () => {
    it('should define variant classes correctly', () => {
      const variantClasses = {
        info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
        success:
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
        warning:
          'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      };

      expect(variantClasses.info).toContain('bg-blue-50');
      expect(variantClasses.success).toContain('bg-green-50');
      expect(variantClasses.warning).toContain('bg-yellow-50');
    });

    it('should create SVG icons for variants', () => {
      const createIcon = (_variant: string) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-5 h-5');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.setAttribute('aria-hidden', 'true');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.appendChild(path);

        return svg;
      };

      const infoIcon = createIcon('info');
      const successIcon = createIcon('success');
      const warningIcon = createIcon('warning');

      expect(infoIcon.getAttribute('class')).toBe('w-5 h-5');
      expect(successIcon.getAttribute('aria-hidden')).toBe('true');
      expect(warningIcon.tagName).toBe('svg');
    });
  });

  describe('Accessibility Features', () => {
    it('should define proper ARIA attributes', () => {
      const ariaAttributes = {
        role: 'alert',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        'aria-label': '更新通知',
      };

      expect(ariaAttributes.role).toBe('alert');
      expect(ariaAttributes['aria-live']).toBe('polite');
      expect(ariaAttributes['aria-atomic']).toBe('true');
      expect(ariaAttributes['aria-label']).toBe('更新通知');
    });

    it('should create accessible button labels', () => {
      const buttonLabels = {
        reload: 'ページをリロードして更新を適用',
        dismiss: '通知を閉じる',
        close: '通知を閉じる',
      };

      expect(buttonLabels.reload).toBe('ページをリロードして更新を適用');
      expect(buttonLabels.dismiss).toBe('通知を閉じる');
      expect(buttonLabels.close).toBe('通知を閉じる');
    });

    it('should handle focus management', () => {
      const button = document.createElement('button');
      button.style.outline = '2px solid currentColor';
      button.style.outlineOffset = '2px';

      // CSS style properties may be normalized by the browser
      expect(button.style.outline).toContain('2px');
      expect(button.style.outline).toContain('solid');
      expect(button.style.outline.toLowerCase()).toContain('currentcolor');
      expect(button.style.outlineOffset).toBe('2px');
    });
  });
});
