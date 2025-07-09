/**
 * URL utilities for GitHub Pages base path resolution
 * 
 * Handles automatic base path prepending for GitHub Pages deployment
 * while maintaining compatibility with development environment
 */

/**
 * Resolves a URL path with the appropriate base path
 * 
 * @param path - The relative path to resolve (e.g., '/issues', '/analytics')
 * @returns The resolved URL with base path applied for production
 * 
 * @example
 * ```typescript
 * // Development: resolveUrl('/issues') → '/issues'
 * // Production: resolveUrl('/issues') → '/beaver/issues'
 * ```
 */
export function resolveUrl(path: string): string {
  // Get the base URL from Astro's environment
  const base = import.meta.env.BASE_URL || '/';
  
  // If base is root '/', return path as-is (development)
  if (base === '/') {
    return path;
  }
  
  // Remove trailing slash from base and prepend to path (production)
  const cleanBase = base.replace(/\/$/, '');
  
  // Ensure path starts with '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${normalizedPath}`;
}

/**
 * Resolves multiple URL paths for batch processing
 * 
 * @param paths - Array of relative paths to resolve
 * @returns Array of resolved URLs with base path applied
 */
export function resolveUrls(paths: string[]): string[] {
  return paths.map(path => resolveUrl(path));
}

/**
 * Creates a URL resolver function with a specific base override
 * Useful for testing or custom base path scenarios
 * 
 * @param customBase - Custom base path to use instead of environment
 * @returns URL resolver function with custom base
 */
export function createUrlResolver(customBase: string) {
  return (path: string): string => {
    if (customBase === '/') {
      return path;
    }
    
    const cleanBase = customBase.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${cleanBase}${normalizedPath}`;
  };
}