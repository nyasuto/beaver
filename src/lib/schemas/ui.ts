/**
 * UI Component Schemas
 *
 * Zod schemas for UI components, themes, and interface configurations.
 * These schemas ensure type safety for all UI-related data and props.
 */

import { z } from 'zod';

/**
 * Base UI component props schema
 */
export const BaseUIPropsSchema = z.object({
  id: z.string().optional(),
  className: z.string().optional(),
  style: z.any().optional(),
  'data-testid': z.string().optional(),
  'aria-label': z.string().optional(),
  'aria-describedby': z.string().optional(),
  role: z
    .enum([
      'alert',
      'alertdialog',
      'application',
      'article',
      'banner',
      'button',
      'cell',
      'checkbox',
      'columnheader',
      'combobox',
      'complementary',
      'contentinfo',
      'dialog',
      'directory',
      'document',
      'feed',
      'figure',
      'form',
      'grid',
      'gridcell',
      'group',
      'heading',
      'img',
      'link',
      'list',
      'listbox',
      'listitem',
      'log',
      'main',
      'marquee',
      'math',
      'menu',
      'menubar',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'navigation',
      'none',
      'note',
      'option',
      'presentation',
      'progressbar',
      'radio',
      'radiogroup',
      'region',
      'row',
      'rowgroup',
      'rowheader',
      'scrollbar',
      'search',
      'searchbox',
      'separator',
      'slider',
      'spinbutton',
      'status',
      'switch',
      'tab',
      'table',
      'tablist',
      'tabpanel',
      'term',
      'textbox',
      'timer',
      'toolbar',
      'tooltip',
      'tree',
      'treegrid',
      'treeitem',
    ])
    .optional(),
});

export type BaseUIProps = z.infer<typeof BaseUIPropsSchema>;

/**
 * Color scheme schema for theming
 */
export const ColorSchemeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  accent: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  background: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  surface: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  text: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  textSecondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  border: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  success: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  warning: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  error: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  info: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
});

export type ColorScheme = z.infer<typeof ColorSchemeSchema>;

/**
 * Theme configuration schema
 */
export const ThemeConfigSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']).default('system'),
  colors: z.object({
    light: ColorSchemeSchema,
    dark: ColorSchemeSchema,
  }),
  typography: z.object({
    fontFamily: z.object({
      sans: z.array(z.string()).default(['Inter', 'sans-serif']),
      mono: z.array(z.string()).default(['JetBrains Mono', 'monospace']),
    }),
    fontSize: z.object({
      xs: z.string().default('0.75rem'),
      sm: z.string().default('0.875rem'),
      base: z.string().default('1rem'),
      lg: z.string().default('1.125rem'),
      xl: z.string().default('1.25rem'),
      '2xl': z.string().default('1.5rem'),
      '3xl': z.string().default('1.875rem'),
      '4xl': z.string().default('2.25rem'),
    }),
    lineHeight: z.object({
      tight: z.string().default('1.25'),
      normal: z.string().default('1.5'),
      relaxed: z.string().default('1.75'),
    }),
  }),
  spacing: z.object({
    xs: z.string().default('0.25rem'),
    sm: z.string().default('0.5rem'),
    md: z.string().default('1rem'),
    lg: z.string().default('1.5rem'),
    xl: z.string().default('2rem'),
    '2xl': z.string().default('3rem'),
  }),
  borderRadius: z.object({
    none: z.string().default('0'),
    sm: z.string().default('0.25rem'),
    md: z.string().default('0.375rem'),
    lg: z.string().default('0.5rem'),
    xl: z.string().default('0.75rem'),
    full: z.string().default('9999px'),
  }),
  shadows: z.object({
    sm: z.string().default('0 1px 2px 0 rgba(0, 0, 0, 0.05)'),
    md: z.string().default('0 4px 6px -1px rgba(0, 0, 0, 0.1)'),
    lg: z.string().default('0 10px 15px -3px rgba(0, 0, 0, 0.1)'),
    xl: z.string().default('0 20px 25px -5px rgba(0, 0, 0, 0.1)'),
  }),
  transitions: z.object({
    duration: z.object({
      fast: z.string().default('150ms'),
      normal: z.string().default('250ms'),
      slow: z.string().default('350ms'),
    }),
    easing: z.object({
      ease: z.string().default('ease'),
      linear: z.string().default('linear'),
      easeIn: z.string().default('ease-in'),
      easeOut: z.string().default('ease-out'),
      easeInOut: z.string().default('ease-in-out'),
    }),
  }),
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

/**
 * Button component props schema
 */
export const ButtonPropsSchema = BaseUIPropsSchema.extend({
  variant: z.enum(['primary', 'secondary', 'outline', 'ghost', 'link']).default('primary'),
  size: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  disabled: z.boolean().default(false),
  loading: z.boolean().default(false),
  fullWidth: z.boolean().default(false),
  leftIcon: z.string().optional(),
  rightIcon: z.string().optional(),
  href: z.string().optional(),
  target: z.enum(['_blank', '_self', '_parent', '_top']).optional(),
  type: z.enum(['button', 'submit', 'reset']).default('button'),
  onClick: z.any().optional(),
  children: z.unknown().optional(),
});

export type ButtonProps = z.infer<typeof ButtonPropsSchema>;

/**
 * Card component props schemaa
 */
export const CardPropsSchema = BaseUIPropsSchema.extend({
  variant: z.enum(['default', 'outlined', 'elevated', 'filled']).default('default'),
  padding: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('md'),
  radius: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('md'),
  shadow: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('sm'),
  hoverable: z.boolean().default(false),
  clickable: z.boolean().default(false),
  header: z.unknown().optional(),
  footer: z.unknown().optional(),
  children: z.unknown().optional(),
});

export type CardProps = z.infer<typeof CardPropsSchema>;

/**
 * Input component props schema
 */
export const InputPropsSchema = BaseUIPropsSchema.extend({
  type: z.enum(['text', 'email', 'password', 'number', 'tel', 'url', 'search']).default('text'),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  variant: z.enum(['default', 'outlined', 'filled', 'flushed']).default('default'),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  defaultValue: z.string().optional(),
  disabled: z.boolean().default(false),
  readOnly: z.boolean().default(false),
  required: z.boolean().default(false),
  invalid: z.boolean().default(false),
  leftIcon: z.string().optional(),
  rightIcon: z.string().optional(),
  leftElement: z.unknown().optional(),
  rightElement: z.unknown().optional(),
  label: z.string().optional(),
  helperText: z.string().optional(),
  errorText: z.string().optional(),
  maxLength: z.number().int().min(0).optional(),
  minLength: z.number().int().min(0).optional(),
  pattern: z.string().optional(),
  onChange: z.any().optional(),
  onBlur: z.any().optional(),
  onFocus: z.any().optional(),
});

export type InputProps = z.infer<typeof InputPropsSchema>;

/**
 * Modal component props schema
 */
export const ModalPropsSchema = BaseUIPropsSchema.extend({
  isOpen: z.boolean().default(false),
  onClose: z.any().optional(),
  size: z.enum(['sm', 'md', 'lg', 'xl', 'full']).default('md'),
  centered: z.boolean().default(true),
  closeOnOverlayClick: z.boolean().default(true),
  closeOnEsc: z.boolean().default(true),
  title: z.string().optional(),
  showCloseButton: z.boolean().default(true),
  header: z.unknown().optional(),
  footer: z.unknown().optional(),
  children: z.unknown().optional(),
});

export type ModalProps = z.infer<typeof ModalPropsSchema>;

/**
 * Navigation item schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NavigationItemSchema: any = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  href: z.string().optional(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  active: z.boolean().default(false),
  disabled: z.boolean().default(false),
  external: z.boolean().default(false),
  children: z.lazy(() => z.array(NavigationItemSchema)).optional(),
  onClick: z.any().optional(),
});

export type NavigationItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  badge?: string;
  active?: boolean;
  disabled?: boolean;
  external?: boolean;
  children?: NavigationItem[];
  onClick?: () => void;
};

/**
 * Layout configuration schema
 */
export const LayoutConfigSchema = z.object({
  type: z.enum(['sidebar', 'topbar', 'hybrid']).default('sidebar'),
  sidebarWidth: z.number().int().min(200).max(500).default(250),
  sidebarCollapsible: z.boolean().default(true),
  sidebarCollapsed: z.boolean().default(false),
  headerHeight: z.number().int().min(40).max(120).default(60),
  footerHeight: z.number().int().min(40).max(120).default(60),
  showHeader: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  showBreadcrumbs: z.boolean().default(true),
  contentMaxWidth: z.number().int().min(800).max(1600).default(1200),
  contentPadding: z.number().int().min(0).max(50).default(20),
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

/**
 * Chart configuration schema
 */
export const ChartConfigSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'doughnut', 'radar', 'polar', 'scatter', 'bubble']),
  width: z.number().int().min(200).optional(),
  height: z.number().int().min(200).optional(),
  responsive: z.boolean().default(true),
  maintainAspectRatio: z.boolean().default(true),
  title: z.string().optional(),
  legend: z
    .object({
      display: z.boolean().default(true),
      position: z.enum(['top', 'bottom', 'left', 'right']).default('top'),
    })
    .optional(),
  tooltips: z
    .object({
      enabled: z.boolean().default(true),
      mode: z.enum(['point', 'nearest', 'index', 'dataset']).default('nearest'),
    })
    .optional(),
  animation: z
    .object({
      duration: z.number().int().min(0).max(3000).default(1000),
      easing: z
        .enum(['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'])
        .default('easeInOutQuad'),
    })
    .optional(),
  colors: z.array(z.string()).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

/**
 * Chart data schema
 */
export const ChartDataSchema = z.object({
  labels: z.array(z.string()).optional(),
  datasets: z.array(
    z.object({
      label: z.string().optional(),
      data: z.array(z.number()),
      backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
      borderColor: z.union([z.string(), z.array(z.string())]).optional(),
      borderWidth: z.number().min(0).default(1),
      fill: z.boolean().default(false),
      tension: z.number().min(0).max(1).default(0.4),
      pointRadius: z.number().min(0).default(3),
      pointHoverRadius: z.number().min(0).default(5),
    })
  ),
});

export type ChartData = z.infer<typeof ChartDataSchema>;

/**
 * Pagination controls schema
 */
export const PaginationControlsSchema = z.object({
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  itemsPerPage: z.number().int().min(1).max(100).default(10),
  showFirstLast: z.boolean().default(true),
  showPreviousNext: z.boolean().default(true),
  showNumbers: z.boolean().default(true),
  maxVisiblePages: z.number().int().min(3).max(10).default(5),
  onPageChange: z.any().optional(),
});

export type PaginationControls = z.infer<typeof PaginationControlsSchema>;

/**
 * Toast notification schema
 */
export const ToastSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['success', 'error', 'warning', 'info']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().optional(),
  duration: z.number().int().min(0).default(5000), // 0 means persistent
  actions: z
    .array(
      z.object({
        label: z.string(),
        onClick: z.any(),
        style: z.enum(['primary', 'secondary']).default('secondary'),
      })
    )
    .optional(),
  dismissible: z.boolean().default(true),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).default('top-right'),
  createdAt: z.string().datetime(),
});

export type Toast = z.infer<typeof ToastSchema>;

/**
 * Form validation schema
 */
export const FormValidationSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  value: z.unknown(),
  rules: z.array(
    z.object({
      type: z.enum(['required', 'minLength', 'maxLength', 'pattern', 'email', 'url', 'custom']),
      value: z.unknown().optional(),
      message: z.string().min(1, 'Error message is required'),
    })
  ),
  errors: z.array(z.string()).default([]),
  touched: z.boolean().default(false),
  valid: z.boolean().default(true),
});

export type FormValidation = z.infer<typeof FormValidationSchema>;

/**
 * Validation helper for UI components
 */
export function validateUIProps<T>(
  schema: z.ZodSchema<T>,
  props: unknown
): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(props);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Create default theme configuration
 */
export function createDefaultTheme(): ThemeConfig {
  return ThemeConfigSchema.parse({
    mode: 'system',
    colors: {
      light: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#10B981',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      dark: {
        primary: '#60A5FA',
        secondary: '#9CA3AF',
        accent: '#34D399',
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
        textSecondary: '#9CA3AF',
        border: '#374151',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA',
      },
    },
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
    transitions: {},
  });
}

/**
 * Generate unique ID for UI components
 */
export function generateUIId(prefix: string = 'ui'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}
