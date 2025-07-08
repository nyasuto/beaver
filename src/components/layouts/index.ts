/**
 * Layout Components Index
 *
 * This module exports layout component names and types for the Beaver Astro application.
 * These components provide the structural foundation for pages.
 *
 * Note: Actual component imports should be done directly in .astro files using import statements.
 * This index provides component name constants and type information for TypeScript support.
 *
 * @module LayoutComponents
 */

// Layout component references for programmatic use
export const LAYOUT_COMPONENTS = {
  base: 'BaseLayout',
  page: 'PageLayout',
  dashboard: 'DashboardLayout',
} as const;

export type LayoutComponentName = keyof typeof LAYOUT_COMPONENTS;

// Component name exports for consistency
export const BaseLayout = 'BaseLayout';
export const PageLayout = 'PageLayout';
export const DashboardLayout = 'DashboardLayout';
