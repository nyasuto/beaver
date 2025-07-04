import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  outDir: '../../_site-astro',
  publicDir: './public',
  base: process.env.NODE_ENV === 'production' ? '/beaver/' : '/',
  server: {
    port: 4321,
    host: true
  },
  vite: {
    build: {
      // Performance optimizations
      rollupOptions: {
        output: {
          // Code splitting for better performance
          manualChunks: {
            'chart': ['chart.js', 'react-chartjs-2'],
            'react-vendor': ['react', 'react-dom']
          }
        }
      },
      // Minification optimizations
      cssMinify: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: process.env.NODE_ENV === 'production'
        }
      }
    },
    server: {
      watch: {
        usePolling: true
      }
    },
    // Performance optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2']
    }
  },
  // Prefetch for better performance
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  // Performance build options
  build: {
    assets: 'assets'
  },
  // Compress images automatically
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});