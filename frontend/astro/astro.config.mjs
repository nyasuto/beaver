import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  outDir: '../../_site-astro',
  publicDir: './public',
  base: process.env.NODE_ENV === 'production' ? '/beaver' : '',
  server: {
    port: 4321,
    host: true
  },
  vite: {
    server: {
      watch: {
        usePolling: true
      }
    }
  }
});