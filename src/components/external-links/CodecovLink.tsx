/**
 * CodecovLink Component
 *
 * A specialized external link component for Codecov service links.
 * Provides secure, accessible links with proper styling and icons.
 */

import React from 'react';
import { URLUtils } from '../../config/external-links';
import { useExternalLinks } from '../../hooks/useExternalLinks';

// Link types supported by CodecovLink
export type CodecovLinkType = 'project' | 'module' | 'file' | 'trends' | 'commit' | 'pull-request';

// Base props for CodecovLink
export interface CodecovLinkProps {
  /** The type of Codecov link to generate */
  type: CodecovLinkType;
  /** Additional CSS classes */
  className?: string;
  /** Child content */
  children: React.ReactNode;
  /** Custom aria-label override */
  'aria-label'?: string;
  /** Custom title override */
  title?: string;
}

// Props specific to different link types
export interface CodecovProjectLinkProps extends CodecovLinkProps {
  type: 'project';
}

export interface CodecovModuleLinkProps extends CodecovLinkProps {
  type: 'module';
  /** Module/directory path */
  modulePath: string;
  /** Branch name (defaults to 'main') */
  branch?: string;
}

export interface CodecovFileLinkProps extends CodecovLinkProps {
  type: 'file';
  /** File path */
  filePath: string;
  /** Branch name (defaults to 'main') */
  branch?: string;
}

export interface CodecovTrendsLinkProps extends CodecovLinkProps {
  type: 'trends';
}

export interface CodecovCommitLinkProps extends CodecovLinkProps {
  type: 'commit';
  /** Commit SHA */
  commitSha: string;
}

export interface CodecovPullRequestLinkProps extends CodecovLinkProps {
  type: 'pull-request';
  /** Pull request number */
  prNumber: number;
}

// Union type for all CodecovLink props
export type CodecovLinkAllProps =
  | CodecovProjectLinkProps
  | CodecovModuleLinkProps
  | CodecovFileLinkProps
  | CodecovTrendsLinkProps
  | CodecovCommitLinkProps
  | CodecovPullRequestLinkProps;

/**
 * CodecovLink Component
 *
 * Renders a secure external link to Codecov with proper accessibility attributes
 */
export function CodecovLink(props: CodecovLinkAllProps) {
  const { type, className = '', children, 'aria-label': ariaLabel, title } = props;
  const externalLinks = useExternalLinks();

  // Generate URL based on link type
  const generateUrl = (): string => {
    switch (type) {
      case 'project':
        return externalLinks.codecov.project;

      case 'module': {
        const moduleProps = props as CodecovModuleLinkProps;
        const sanitizedPath = URLUtils.sanitizeFilePath(moduleProps.modulePath);
        return externalLinks.codecov.directory(sanitizedPath, moduleProps.branch);
      }

      case 'file': {
        const fileProps = props as CodecovFileLinkProps;
        const sanitizedPath = URLUtils.sanitizeFilePath(fileProps.filePath);
        return externalLinks.codecov.file(sanitizedPath, fileProps.branch);
      }

      case 'trends':
        return externalLinks.codecov.trends;

      case 'commit': {
        const commitProps = props as CodecovCommitLinkProps;
        return externalLinks.codecov.commit(commitProps.commitSha);
      }

      case 'pull-request': {
        const prProps = props as CodecovPullRequestLinkProps;
        return externalLinks.codecov.pullRequest(prProps.prNumber);
      }

      default:
        return externalLinks.codecov.project;
    }
  };

  // Generate default accessibility label
  const generateDefaultAriaLabel = (): string => {
    const baseLabel = 'Codecovで';

    switch (type) {
      case 'project':
        return `${baseLabel}プロジェクトの詳細を確認`;
      case 'module': {
        const moduleProps = props as CodecovModuleLinkProps;
        return `${baseLabel}${moduleProps.modulePath}モジュールの詳細を確認`;
      }
      case 'file': {
        const fileProps = props as CodecovFileLinkProps;
        return `${baseLabel}${fileProps.filePath}ファイルの詳細を確認`;
      }
      case 'trends':
        return `${baseLabel}カバレッジの傾向を確認`;
      case 'commit':
        return `${baseLabel}コミットのカバレッジを確認`;
      case 'pull-request':
        return `${baseLabel}プルリクエストのカバレッジを確認`;
      default:
        return `${baseLabel}詳細を確認`;
    }
  };

  const url = generateUrl();
  const secureProps = URLUtils.getSecureExternalLinkProps();
  const finalAriaLabel = ariaLabel || generateDefaultAriaLabel();
  const finalTitle = title || finalAriaLabel;

  return (
    <a
      href={url}
      className={`external-link codecov-link ${className}`}
      {...secureProps}
      aria-label={`${finalAriaLabel} (新しいタブで開きます)`}
      title={finalTitle}
    >
      {children}
    </a>
  );
}

/**
 * Pre-configured CodecovLink variants for common use cases
 */

/**
 * CodecovProjectLink - Links to the project overview page
 */
export function CodecovProjectLink({
  children,
  className = '',
  ...props
}: Omit<CodecovProjectLinkProps, 'type'>) {
  return (
    <CodecovLink type="project" className={className} {...props}>
      {children}
    </CodecovLink>
  );
}

/**
 * CodecovModuleLink - Links to a specific module/directory
 */
export function CodecovModuleLink({
  children,
  className = '',
  modulePath,
  branch,
  ...props
}: Omit<CodecovModuleLinkProps, 'type'>) {
  return (
    <CodecovLink
      type="module"
      className={className}
      modulePath={modulePath}
      branch={branch}
      {...props}
    >
      {children}
    </CodecovLink>
  );
}

/**
 * CodecovFileLink - Links to a specific file
 */
export function CodecovFileLink({
  children,
  className = '',
  filePath,
  branch,
  ...props
}: Omit<CodecovFileLinkProps, 'type'>) {
  return (
    <CodecovLink type="file" className={className} filePath={filePath} branch={branch} {...props}>
      {children}
    </CodecovLink>
  );
}

/**
 * CodecovTrendsLink - Links to the trends/analytics page
 */
export function CodecovTrendsLink({
  children,
  className = '',
  ...props
}: Omit<CodecovTrendsLinkProps, 'type'>) {
  return (
    <CodecovLink type="trends" className={className} {...props}>
      {children}
    </CodecovLink>
  );
}

export default CodecovLink;
