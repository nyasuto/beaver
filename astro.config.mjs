import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  output: 'static',
  site: 'https://nyasuto.github.io',
  base: '/beaver',
  build: {
    assets: 'assets',
  },
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom', 'chart.js', 'date-fns'],
    },
    define: {
      'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
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