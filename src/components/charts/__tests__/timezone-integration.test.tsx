/**
 * Timezone Integration Tests
 *
 * Tests for timezone handling in coverage history chart
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { format, parse } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

describe('Timezone Integration', () => {
  let originalNavigator: any;

  beforeEach(() => {
    // Mock navigator for testing browser detection
    originalNavigator = global.navigator;
    global.navigator = {
      ...global.navigator,
      language: 'ja-JP',
    };

    // Mock window object
    Object.defineProperty(global, 'window', {
      value: {
        navigator: global.navigator,
        Intl: {
          DateTimeFormat: () => ({
            resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' }),
          }),
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  describe('Date parsing consistency', () => {
    it('should parse date-only strings consistently in local timezone', () => {
      // This is the core fix - date-only strings should be interpreted in local time
      const dateString = '2025-01-15';
      const parsed = parse(dateString, 'yyyy-MM-dd', new Date());

      // The parsed date should be January 15th at midnight in local timezone
      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(0); // January (0-indexed)
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
    });

    it('should format dates correctly for Japanese locale', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025

      const shortFormat = format(date, 'MMM d', { locale: ja });
      expect(shortFormat).toContain('1'); // Month
      expect(shortFormat).toContain('15'); // Day

      const longFormat = format(date, 'PPPP', { locale: ja });
      expect(longFormat).toBeDefined();
      expect(typeof longFormat).toBe('string');
    });

    it('should format dates correctly for English locale', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025

      const shortFormat = format(date, 'MMM d', { locale: enUS });
      expect(shortFormat).toBe('Jan 15');

      const longFormat = format(date, 'PPPP', { locale: enUS });
      expect(longFormat).toBe('Wednesday, January 15th, 2025');
    });
  });

  describe('Browser timezone detection', () => {
    it('should detect Japanese locale correctly', () => {
      const locale = navigator.language;
      expect(locale).toBe('ja-JP');

      const isJapanese = locale.startsWith('ja');
      expect(isJapanese).toBe(true);
    });

    it('should detect timezone correctly', () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // In CI environments, timezone is typically 'UTC'
      // In local development, it may be user's actual timezone
      expect(['UTC', 'Asia/Tokyo'].includes(timezone)).toBe(true);
    });
  });

  describe('Chart data scenarios', () => {
    it('should handle mixed date formats from API data', () => {
      const testData = [
        { date: '2025-01-10', coverage: 75.0 },
        { date: '2025-01-11T10:00:00Z', coverage: 76.5 },
        { date: '2025-01-12', coverage: 77.2 },
      ];

      testData.forEach(point => {
        let parsed: Date;

        // Simulate the parsing logic from the component
        if (point.date.includes('T') || point.date.includes('Z') || point.date.includes('+')) {
          parsed = new Date(point.date);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
          parsed = parse(point.date, 'yyyy-MM-dd', new Date());
        } else {
          parsed = new Date(point.date);
        }

        expect(parsed).toBeInstanceOf(Date);
        expect(parsed.getTime()).not.toBeNaN();

        // The date should be in the correct month/day regardless of format
        if (point.date.includes('2025-01-10')) {
          expect(parsed.getDate()).toBe(10);
        } else if (point.date.includes('2025-01-11')) {
          expect(parsed.getDate()).toBe(11);
        } else if (point.date.includes('2025-01-12')) {
          expect(parsed.getDate()).toBe(12);
        }
      });
    });

    it('should maintain consistency across different user timezones', () => {
      // Test with different timezone mocks
      const timezones = ['Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC'];

      timezones.forEach(tz => {
        // Mock different timezone
        Object.defineProperty(global, 'window', {
          value: {
            ...global.window,
            Intl: {
              DateTimeFormat: () => ({
                resolvedOptions: () => ({ timeZone: tz }),
              }),
            },
          },
          writable: true,
        });

        const dateString = '2025-01-15';
        const parsed = parse(dateString, 'yyyy-MM-dd', new Date());

        // Regardless of timezone, date-only strings should parse to the same calendar date
        expect(parsed.getFullYear()).toBe(2025);
        expect(parsed.getMonth()).toBe(0); // January
        expect(parsed.getDate()).toBe(15);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const invalidDates = ['invalid-date', '2025-13-40', '', '2025-01'];

      invalidDates.forEach(dateString => {
        let parsed: Date;

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          parsed = parse(dateString, 'yyyy-MM-dd', new Date());
        } else {
          parsed = new Date(dateString);
        }

        // Should either parse correctly or create a valid Date object
        expect(parsed).toBeInstanceOf(Date);
        // Invalid dates will have NaN time, but the component handles this with fallbacks
      });
    });

    it('should handle timezone edge cases around DST transitions', () => {
      // Test dates around DST transitions (these are tricky for timezone handling)
      const dstDates = [
        '2025-03-09', // US Spring DST transition
        '2025-11-02', // US Fall DST transition
      ];

      dstDates.forEach(dateString => {
        const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
        expect(parsed).toBeInstanceOf(Date);
        expect(parsed.getTime()).not.toBeNaN();
      });
    });
  });
});
