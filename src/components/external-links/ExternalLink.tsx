/**
 * ExternalLink Component
 *
 * A base component for secure external links with proper accessibility
 * and security attributes. Used as a foundation for service-specific links.
 */

import React from 'react';
import { URLUtils } from '../../config/external-links';

export interface ExternalLinkProps {
  /** The external URL */
  href: string;
  /** Child content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Tooltip title */
  title?: string;
  /** Custom onClick handler */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Additional props */
  [key: string]: any;
}

/**
 * ExternalLink Component
 *
 * Renders a secure external link with proper security and accessibility attributes
 */
export function ExternalLink({
  href,
  children,
  className = '',
  'aria-label': ariaLabel,
  title,
  onClick,
  ...props
}: ExternalLinkProps) {
  const secureProps = URLUtils.getSecureExternalLinkProps();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <a
      href={href}
      className={`external-link ${className}`}
      {...secureProps}
      aria-label={ariaLabel}
      title={title}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * ExternalLinkButton - Styled as a button
 */
export function ExternalLinkButton({
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  ...props
}: ExternalLinkProps & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
}) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'text-blue-600 hover:bg-blue-50',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const buttonClasses = `
    inline-flex items-center gap-2 rounded-md font-medium
    transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <ExternalLink className={buttonClasses} {...props}>
      {children}
    </ExternalLink>
  );
}

/**
 * ExternalLinkIconButton - Icon-only button
 */
export function ExternalLinkIconButton({
  children,
  className = '',
  size = 'medium',
  ...props
}: ExternalLinkProps & {
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg',
  };

  const iconButtonClasses = `
    inline-flex items-center justify-center rounded-full
    text-gray-600 hover:text-blue-600 hover:bg-blue-50
    transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <ExternalLink className={iconButtonClasses} {...props}>
      {children}
    </ExternalLink>
  );
}

/**
 * ExternalLinkWithIcon - Link with an external icon
 */
export function ExternalLinkWithIcon({
  children,
  className = '',
  iconPosition = 'right',
  ...props
}: ExternalLinkProps & {
  iconPosition?: 'left' | 'right';
}) {
  const ExternalIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );

  const linkClasses = `
    inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline
    transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded
    ${className}
  `.trim();

  return (
    <ExternalLink className={linkClasses} {...props}>
      {iconPosition === 'left' && <ExternalIcon />}
      {children}
      {iconPosition === 'right' && <ExternalIcon />}
    </ExternalLink>
  );
}

export default ExternalLink;
