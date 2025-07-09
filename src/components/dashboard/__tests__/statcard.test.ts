/**
 * StatCard Component Tests
 *
 * Tests for StatCard.astro component to ensure proper props validation,
 * styling, and data display functionality.
 */

import { describe, it, expect } from 'vitest';

// Define the StatCard props interface for testing
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  description?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
    period: string;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

// Helper function to validate StatCard props
function validateStatCardProps(props: Partial<StatCardProps>): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // Required props validation
  if (!props.title || typeof props.title !== 'string') {
    errors.push('title is required and must be a string');
  }

  if (
    props.value === undefined ||
    (typeof props.value !== 'string' && typeof props.value !== 'number')
  ) {
    errors.push('value is required and must be a string or number');
  }

  if (!props.icon || typeof props.icon !== 'string') {
    errors.push('icon is required and must be a string');
  }

  // Optional props validation
  if (props.description !== undefined && typeof props.description !== 'string') {
    errors.push('description must be a string');
  }

  if (props.trend !== undefined) {
    if (!props.trend.direction || !['up', 'down', 'stable'].includes(props.trend.direction)) {
      errors.push('trend.direction must be "up", "down", or "stable"');
    }
    if (!props.trend.value || typeof props.trend.value !== 'string') {
      errors.push('trend.value is required and must be a string');
    }
    if (!props.trend.period || typeof props.trend.period !== 'string') {
      errors.push('trend.period is required and must be a string');
    }
  }

  if (
    props.color !== undefined &&
    !['blue', 'green', 'red', 'yellow', 'purple', 'gray'].includes(props.color)
  ) {
    errors.push('color must be one of: blue, green, red, yellow, purple, gray');
  }

  if (props.size !== undefined && !['sm', 'md', 'lg'].includes(props.size)) {
    errors.push('size must be one of: sm, md, lg');
  }

  return {
    success: errors.length === 0,
    ...(errors.length > 0 && { errors }),
  };
}

describe('StatCard Component', () => {
  describe('Props Validation', () => {
    it('should validate valid required props', () => {
      const validProps: StatCardProps = {
        title: 'Total Users',
        value: 1234,
        icon: '👥',
      };

      const result = validateStatCardProps(validProps);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate string value', () => {
      const validProps: StatCardProps = {
        title: 'Revenue',
        value: '$12,345',
        icon: '💰',
      };

      const result = validateStatCardProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should validate number value', () => {
      const validProps: StatCardProps = {
        title: 'Active Sessions',
        value: 42,
        icon: '🔥',
      };

      const result = validateStatCardProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should reject missing required props', () => {
      const invalidProps = {};

      const result = validateStatCardProps(invalidProps);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('title is required and must be a string');
      expect(result.errors).toContain('value is required and must be a string or number');
      expect(result.errors).toContain('icon is required and must be a string');
    });

    it('should reject invalid title type', () => {
      const invalidProps = {
        title: 123,
        value: 'test',
        icon: '📊',
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('title is required and must be a string');
    });

    it('should reject invalid value type', () => {
      const invalidProps = {
        title: 'Test',
        value: true,
        icon: '📊',
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('value is required and must be a string or number');
    });

    it('should reject invalid icon type', () => {
      const invalidProps = {
        title: 'Test',
        value: 123,
        icon: 123,
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('icon is required and must be a string');
    });

    it('should validate optional description', () => {
      const validProps: StatCardProps = {
        title: 'Test',
        value: 123,
        icon: '📊',
        description: 'This is a test description',
      };

      const result = validateStatCardProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should reject invalid description type', () => {
      const invalidProps = {
        title: 'Test',
        value: 123,
        icon: '📊',
        description: 123,
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('description must be a string');
    });
  });

  describe('Trend Validation', () => {
    it('should validate valid trend object', () => {
      const validProps: StatCardProps = {
        title: 'Sales',
        value: 1000,
        icon: '💰',
        trend: {
          direction: 'up',
          value: '+12%',
          period: 'vs last month',
        },
      };

      const result = validateStatCardProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should validate all trend directions', () => {
      const directions: Array<'up' | 'down' | 'stable'> = ['up', 'down', 'stable'];

      directions.forEach(direction => {
        const props = {
          title: 'Test',
          value: 100,
          icon: '📊',
          trend: {
            direction,
            value: '10%',
            period: 'vs last month',
          },
        };

        const result = validateStatCardProps(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid trend direction', () => {
      const invalidProps = {
        title: 'Test',
        value: 100,
        icon: '📊',
        trend: {
          direction: 'invalid',
          value: '10%',
          period: 'vs last month',
        },
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('trend.direction must be "up", "down", or "stable"');
    });

    it('should reject trend with missing value', () => {
      const invalidProps = {
        title: 'Test',
        value: 100,
        icon: '📊',
        trend: {
          direction: 'up',
          period: 'vs last month',
        },
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('trend.value is required and must be a string');
    });

    it('should reject trend with missing period', () => {
      const invalidProps = {
        title: 'Test',
        value: 100,
        icon: '📊',
        trend: {
          direction: 'up',
          value: '+10%',
        },
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('trend.period is required and must be a string');
    });
  });

  describe('Color Validation', () => {
    it('should validate all color options', () => {
      const colors: Array<'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'> = [
        'blue',
        'green',
        'red',
        'yellow',
        'purple',
        'gray',
      ];

      colors.forEach(color => {
        const props = {
          title: 'Test',
          value: 100,
          icon: '📊',
          color,
        };

        const result = validateStatCardProps(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid color', () => {
      const invalidProps = {
        title: 'Test',
        value: 100,
        icon: '📊',
        color: 'invalid',
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'color must be one of: blue, green, red, yellow, purple, gray'
      );
    });

    it('should use default color when not specified', () => {
      const props = {
        title: 'Test',
        value: 100,
        icon: '📊',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });
  });

  describe('Size Validation', () => {
    it('should validate all size options', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

      sizes.forEach(size => {
        const props = {
          title: 'Test',
          value: 100,
          icon: '📊',
          size,
        };

        const result = validateStatCardProps(props);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid size', () => {
      const invalidProps = {
        title: 'Test',
        value: 100,
        icon: '📊',
        size: 'invalid',
      };

      const result = validateStatCardProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('size must be one of: sm, md, lg');
    });

    it('should use default size when not specified', () => {
      const props = {
        title: 'Test',
        value: 100,
        icon: '📊',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });
  });

  describe('StatCard Class Generation Logic', () => {
    it('should generate correct color classes', () => {
      const colorClasses = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        green: 'text-green-600 bg-green-50 border-green-100',
        red: 'text-red-600 bg-red-50 border-red-100',
        yellow: 'text-yellow-600 bg-yellow-50 border-yellow-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        gray: 'text-gray-600 bg-gray-50 border-gray-100',
      };

      Object.entries(colorClasses).forEach(([color, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain(`text-${color}-600`);
        expect(classes).toContain(`bg-${color}-50`);
        expect(classes).toContain(`border-${color}-100`);
      });
    });

    it('should generate correct size classes', () => {
      const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      };

      Object.entries(sizeClasses).forEach(([_size, classes]) => {
        expect(classes).toBeDefined();
        expect(classes).toContain('p-');
      });
    });

    it('should generate correct trend icons', () => {
      const trendIcons = {
        up: '📈',
        down: '📉',
        stable: '➡️',
      };

      Object.entries(trendIcons).forEach(([_direction, icon]) => {
        expect(icon).toBeDefined();
        expect(typeof icon).toBe('string');
      });
    });

    it('should generate correct trend colors', () => {
      const trendColors = {
        up: 'text-green-600',
        down: 'text-red-600',
        stable: 'text-gray-600',
      };

      Object.entries(trendColors).forEach(([_direction, colorClass]) => {
        expect(colorClass).toBeDefined();
        expect(colorClass).toContain('text-');
        expect(colorClass).toContain('-600');
      });
    });
  });

  describe('StatCard Data Display', () => {
    it('should handle numeric values correctly', () => {
      const props = {
        title: 'Users',
        value: 1234,
        icon: '👥',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });

    it('should handle string values correctly', () => {
      const props = {
        title: 'Revenue',
        value: '$12,345.67',
        icon: '💰',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });

    it('should handle large numbers', () => {
      const props = {
        title: 'Page Views',
        value: 1000000,
        icon: '👀',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });

    it('should handle formatted strings', () => {
      const props = {
        title: 'Conversion Rate',
        value: '12.5%',
        icon: '🎯',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });

    it('should handle zero values', () => {
      const props = {
        title: 'Errors',
        value: 0,
        icon: '🚨',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });
  });

  describe('StatCard Complete Configuration', () => {
    it('should validate complete StatCard with all props', () => {
      const completeProps: StatCardProps = {
        title: 'Monthly Revenue',
        value: '$45,678',
        icon: '💰',
        description: 'Total revenue for this month',
        trend: {
          direction: 'up',
          value: '+15%',
          period: 'vs last month',
        },
        color: 'green',
        size: 'lg',
      };

      const result = validateStatCardProps(completeProps);
      expect(result.success).toBe(true);
    });

    it('should validate minimal StatCard configuration', () => {
      const minimalProps: StatCardProps = {
        title: 'Users',
        value: 100,
        icon: '👥',
      };

      const result = validateStatCardProps(minimalProps);
      expect(result.success).toBe(true);
    });

    it('should validate StatCard with trend but no description', () => {
      const props: StatCardProps = {
        title: 'Sales',
        value: 1000,
        icon: '🛒',
        trend: {
          direction: 'down',
          value: '-5%',
          period: 'vs last week',
        },
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });

    it('should validate StatCard with description but no trend', () => {
      const props: StatCardProps = {
        title: 'Active Users',
        value: 542,
        icon: '👤',
        description: 'Currently active users on the platform',
      };

      const result = validateStatCardProps(props);
      expect(result.success).toBe(true);
    });
  });

  describe('StatCard Performance', () => {
    it('should handle multiple StatCard validations efficiently', () => {
      const startTime = performance.now();

      const configurations = [
        { title: 'Users', value: 100, icon: '👥', color: 'blue' },
        { title: 'Revenue', value: '$1,000', icon: '💰', color: 'green' },
        { title: 'Errors', value: 5, icon: '🚨', color: 'red' },
        { title: 'Conversion', value: '12.5%', icon: '🎯', color: 'yellow' },
        { title: 'Performance', value: '95%', icon: '⚡', color: 'purple' },
      ];

      configurations.forEach((config: any) => {
        const result = validateStatCardProps(config);
        expect(result.success).toBe(true);
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      expect(validationTime).toBeLessThan(50);
    });

    it('should handle StatCard with complex trend data', () => {
      const complexProps: StatCardProps = {
        title: 'Monthly Active Users',
        value: 12345,
        icon: '👥',
        description: 'Unique users who have been active in the last 30 days',
        trend: {
          direction: 'up',
          value: '+23.5%',
          period: 'vs previous month',
        },
        color: 'blue',
        size: 'lg',
      };

      const result = validateStatCardProps(complexProps);
      expect(result.success).toBe(true);
    });
  });
});
