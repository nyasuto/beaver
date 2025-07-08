/**
 * UI Components Index
 *
 * This module exports all reusable UI components for the Beaver Astro application.
 * These components provide the building blocks for the user interface.
 *
 * @module UIComponents
 */

// Re-export UI component types from schemas
export type {
  ButtonProps,
  CardProps,
  InputProps,
  ModalProps,
  BaseUIProps,
  ThemeConfig,
  ColorScheme,
  LayoutConfig,
  ChartConfig,
  ChartData,
  NavigationItem,
  PaginationControls,
  Toast,
  FormValidation,
} from '../../lib/schemas/ui';

// UI component metadata
export const UI_COMPONENTS = {
  Button: {
    name: 'Button',
    description: 'Versatile button component with multiple variants and states',
    path: './Button.astro',
    variants: ['primary', 'secondary', 'outline', 'ghost', 'link'],
    sizes: ['sm', 'md', 'lg', 'xl'],
  },
  Card: {
    name: 'Card',
    description: 'Flexible container component with customizable layouts',
    path: './Card.astro',
    variants: ['default', 'outlined', 'elevated', 'filled'],
    padding: ['none', 'sm', 'md', 'lg', 'xl'],
  },
  Input: {
    name: 'Input',
    description: 'Comprehensive input component with validation and icons',
    path: './Input.astro',
    types: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    variants: ['default', 'outlined', 'filled', 'flushed'],
  },
  Modal: {
    name: 'Modal',
    description: 'Modal dialog component with focus management and keyboard navigation',
    path: './Modal.astro',
    sizes: ['sm', 'md', 'lg', 'xl', 'full'],
    features: ['overlay', 'focus-trap', 'keyboard-navigation', 'customizable-header-footer'],
  },
} as const;

export type UIComponentName = keyof typeof UI_COMPONENTS;

/**
 * Get component metadata by name
 */
export function getComponentMeta(name: UIComponentName) {
  return UI_COMPONENTS[name];
}

/**
 * Get all available component names
 */
export function getComponentNames(): UIComponentName[] {
  return Object.keys(UI_COMPONENTS) as UIComponentName[];
}

/**
 * Check if a component exists
 */
export function hasComponent(name: string): name is UIComponentName {
  return name in UI_COMPONENTS;
}
