/**
 * useExternalLinks Hook
 *
 * Custom React hook for accessing external service links with proper
 * configuration and URL generation.
 */

import { useMemo } from 'react';
import { getExternalLinksConfig, ExternalLinksGenerator } from '../config/external-links';

/**
 * External links hook return type
 */
export interface ExternalLinks {
  codecov: {
    project: string;
    branch: (branch?: string) => string;
    file: (filePath: string, branch?: string) => string;
    directory: (dirPath: string, branch?: string) => string;
    commit: (commitSha: string) => string;
    trends: string;
    pullRequest: (prNumber: number) => string;
  };
  github: {
    repository: string;
    file: (filePath: string, branch?: string) => string;
    directory: (dirPath: string, branch?: string) => string;
    commit: (commitSha: string) => string;
    pullRequest: (prNumber: number) => string;
    issues: string;
    actions: string;
  };
}

/**
 * Custom hook for external links
 *
 * Provides pre-configured URL generators for external services
 * based on the current project configuration.
 */
export function useExternalLinks(): ExternalLinks {
  const links = useMemo(() => {
    const config = getExternalLinksConfig();

    return {
      codecov: ExternalLinksGenerator.generateCodecovUrls(config),
      github: ExternalLinksGenerator.generateGitHubUrls(config),
    };
  }, []);

  return links;
}

/**
 * Hook for module-specific external links
 *
 * Provides convenient access to external links for a specific module/directory
 */
export function useModuleExternalLinks(moduleName: string) {
  const links = useExternalLinks();

  return useMemo(
    () => ({
      codecov: {
        module: links.codecov.directory(moduleName),
        moduleMain: links.codecov.directory(moduleName, 'main'),
      },
      github: {
        module: links.github.directory(moduleName),
        moduleMain: links.github.directory(moduleName, 'main'),
      },
    }),
    [links, moduleName]
  );
}

/**
 * Hook for file-specific external links
 */
export function useFileExternalLinks(filePath: string, branch = 'main') {
  const links = useExternalLinks();

  return useMemo(
    () => ({
      codecov: {
        file: links.codecov.file(filePath, branch),
      },
      github: {
        file: links.github.file(filePath, branch),
      },
    }),
    [links, filePath, branch]
  );
}
