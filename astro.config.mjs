import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Debug: Log BASE_URL configuration
const baseUrl = process.env.BASE_URL || '/beaver';
console.log('🔍 Astro Config - BASE_URL:', baseUrl);
console.log('🔍 Astro Config - process.env.BASE_URL:', process.env.BASE_URL);

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
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