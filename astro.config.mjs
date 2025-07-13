import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { generateVersionInfo } from './scripts/generate-version.js';
import fs from 'fs';
import path from 'path';

const baseUrl = process.env['BASE_URL'] || '/beaver';

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
    tailwind({
      applyBaseStyles: true,
    }),
    versionIntegration(),
  ],
  output: 'static',
  site: 'https://nyasuto.github.io',
  base: baseUrl,
  build: {
    assets: 'assets',
    // Performance optimizations
    minify: true,
    inlineStylesheets: 'auto',
    rollupOptions: {
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