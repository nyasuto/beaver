/**
 * Dynamic Web App Manifest Generator
 *
 * Generates site.webmanifest with correct BASE_URL paths for GitHub Pages deployment
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  // Get base URL from Astro configuration
  const baseUrl = import.meta.env.BASE_URL || '/';

  // Ensure baseUrl ends with slash
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const manifest = {
    name: 'Beaver Astro Edition',
    short_name: 'Beaver',
    description:
      'AI-first knowledge management system that transforms GitHub development activities into structured, persistent knowledge bases',
    start_url: normalizedBaseUrl,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: `${normalizedBaseUrl}favicon-16x16.png`,
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: `${normalizedBaseUrl}favicon-32x32.png`,
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: `${normalizedBaseUrl}apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['productivity', 'developer tools'],
    orientation: 'portrait-primary',
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
