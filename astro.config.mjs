import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import VitePWA from '@vite-pwa/astro';
import { generateVersionInfo } from './scripts/generate-version.js';
import fs from 'fs';
import path from 'path';

// Dynamic configuration based on environment
const baseUrl = process.env['BASE_URL'] || '/beaver';
const siteOwner = process.env.GITHUB_OWNER || 'nyasuto';
const siteUrl = `https://${siteOwner}.github.io`;

// Version generation integration
function versionIntegration() {
  return {
    name: 'version-integration',
    hooks: {
      'astro:build:start': async () => {
        console.log('🔄 Generating version.json during build...');
        try {
          const versionInfo = generateVersionInfo();
          
          // Ensure public directory exists
          const publicDir = path.resolve('./public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          
          // Write version.json
          const outputPath = path.join(publicDir, 'version.json');
          fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));
          
          console.log('✅ Version.json generated successfully');
          console.log(`   Version: ${versionInfo.version}`);
          console.log(`   Environment: ${versionInfo.environment}`);
          console.log(`   Build ID: ${versionInfo.buildId}`);
          
        } catch (error) {
          console.error('❌ Failed to generate version.json:', error.message);
          // Don't fail the build for version generation errors
          console.warn('⚠️  Continuing build without version.json');
        }
      }
    }
  };
}

export default defineConfig({
  integrations: [
    react(),
    versionIntegration(),
    VitePWA({
      // PWA Configuration for Beaver
      base: baseUrl,
      scope: baseUrl + '/',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      
      // Correct Service Worker path
      filename: 'sw.js',
      srcDir: 'src',
      strategies: 'generateSW',
      
      // Fix registerSW.js Service Worker path
      injectRegister: 'inline',
      selfDestroying: false,
      
      // Use existing dynamic manifest instead of static one
      manifest: false,
      
      workbox: {
        // Custom cache strategies for Beaver
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,woff,woff2}',
          '**/version.json'
        ],
        
        // Beaver-specific runtime caching
        runtimeCaching: [
          // Static assets (Cache-first strategy)
          {
            urlPattern: new RegExp(`^${baseUrl}/assets/.*\\.(js|css|png|jpg|jpeg|svg|woff|woff2)$`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'beaver-static-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          
          // Application core (Stale-while-revalidate strategy)
          {
            urlPattern: new RegExp(`^${baseUrl}/?$`),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'beaver-app-core',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
          
          // Issues and analytics pages
          {
            urlPattern: new RegExp(`^${baseUrl}/(issues|analytics)/.*$`),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'beaver-app-pages',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 3, // 3 days
              },
            },
          },
          
          // Dynamic web manifest
          {
            urlPattern: new RegExp(`^${baseUrl}/site\\.webmanifest$`),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'beaver-manifest',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
          
          // Version checking (Network-first for real-time updates with logging)
          {
            urlPattern: new RegExp(`^${baseUrl}/version\\.json$`),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'beaver-version',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 5,
              plugins: [
                {
                  requestWillFetch: async ({ request }) => {
                    console.log('🔄 PWA: Fetching version.json for update check', {
                      url: request.url,
                      timestamp: new Date().toISOString(),
                      cache: request.cache,
                      mode: request.mode
                    });
                    return request;
                  },
                  fetchDidSucceed: async ({ response }) => {
                    if (response.ok) {
                      const clonedResponse = response.clone();
                      try {
                        const versionData = await clonedResponse.json();
                        console.log('✅ PWA: Version check completed', {
                          status: response.status,
                          fromCache: response.headers.get('x-from-sw-cache') === 'true',
                          version: versionData.version,
                          buildId: versionData.buildId,
                          gitCommit: versionData.gitCommit,
                          timestamp: new Date().toISOString()
                        });
                      } catch (error) {
                        console.warn('⚠️ PWA: Could not parse version data:', error);
                      }
                    }
                    return response;
                  },
                  fetchDidFail: async ({ originalRequest, error }) => {
                    console.error('❌ PWA: Version check failed', {
                      url: originalRequest.url,
                      error: error.message,
                      timestamp: new Date().toISOString()
                    });
                    throw error;
                  }
                }
              ]
            },
          },
          
          // GitHub API data (Network-first with fallback)
          {
            urlPattern: /^https:\/\/api\.github\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api-data',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 2, // 2 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        
        // Navigation fallback for SPA-like behavior
        navigateFallback: `${baseUrl}/`,
        navigateFallbackDenylist: [
          // Don't use fallback for API routes and assets
          /^\/api\//,
          /\.[^/?]+$/,
          /^\/[^/?]+\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/,
        ],
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Skip waiting for immediate activation
        skipWaiting: true,
        clientsClaim: true,
      },
      
      // Development configuration
      devOptions: {
        enabled: false, // Disable in development for faster builds
        type: 'module',
      },
      
      // Mode configuration
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    }),
  ],
  output: 'static',
  site: siteUrl,
  base: baseUrl,
  build: {
    assets: 'assets',
    // Performance optimizations
    minify: true,
    inlineStylesheets: 'auto',
    rollupOptions: {
      external: ['jsdom'],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['chart.js'],
          'vendor-date': ['date-fns'],
        },
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'chart.js', 'date-fns'],
    },
    define: {
      'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    build: {
      // Performance optimizations
      target: 'es2020',
      minify: 'esbuild',
      rollupOptions: {
        external: ['jsdom'],
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['chart.js'],
            'vendor-date': ['date-fns'],
          },
        },
      },
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  compilerOptions: {
    jsx: 'react-jsx',
  },
});
