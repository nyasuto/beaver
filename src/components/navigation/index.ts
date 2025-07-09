/**
 * Navigation Components Index
 *
 * This module exports navigation component names and types for the Beaver Astro application.
 * These components handle user navigation and menu interactions.
 *
 * Note: Actual component imports should be done directly in .astro files using import statements.
 * This index provides component name constants and type information for TypeScript support.
 *
 * @module NavigationComponents
 */

// Navigation component references for programmatic use
export const NAVIGATION_COMPONENTS = {
  header: 'Header',
  footer: 'Footer',
  breadcrumb: 'Breadcrumb',
  banner: 'Banner',
  bannerWithData: 'BannerWithData',
} as const;

export type NavigationComponentName = keyof typeof NAVIGATION_COMPONENTS;

// Component name exports for consistency
export const Header = 'Header';
export const Footer = 'Footer';
export const Breadcrumb = 'Breadcrumb';
export const Banner = 'Banner';
export const BannerWithData = 'BannerWithData';

// BreadcrumbItem type definition (commonly used across components)
export interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
  icon?: string;
}
