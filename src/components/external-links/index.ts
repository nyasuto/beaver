/**
 * External Links Components
 *
 * Exports for external link components providing secure, accessible
 * links to external services like Codecov, GitHub, etc.
 */

// Base external link components
export {
  ExternalLink,
  ExternalLinkButton,
  ExternalLinkIconButton,
  ExternalLinkWithIcon,
} from './ExternalLink';
export type { ExternalLinkProps } from './ExternalLink';

// Codecov-specific link components
export {
  CodecovLink,
  CodecovProjectLink,
  CodecovModuleLink,
  CodecovFileLink,
  CodecovTrendsLink,
} from './CodecovLink';
export type {
  CodecovLinkProps,
  CodecovLinkType,
  CodecovLinkAllProps,
  CodecovProjectLinkProps,
  CodecovModuleLinkProps,
  CodecovFileLinkProps,
  CodecovTrendsLinkProps,
  CodecovCommitLinkProps,
  CodecovPullRequestLinkProps,
} from './CodecovLink';
