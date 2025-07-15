import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.astro',
      'coverage',
      '**/*.d.ts',
      'src/components/charts/__tests__.bak/**/*',
      '**/*.bak',
      '**/*.bak/**/*',
      'src/__tests__/e2e/**/*',
      'src/__tests__/integration/**/*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.astro/**',
        // Astro component files - exclude from coverage
        'src/components/**/*.astro',
        'src/pages/**/*.astro',
        'src/layouts/**/*.astro',
        // Test files
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/data': resolve(__dirname, './src/data'),
      '@/types': resolve(__dirname, './src/lib/types'),
      '@/utils': resolve(__dirname, './src/lib/utils'),
      '@/config': resolve(__dirname, './src/lib/config'),
    },
  },
  define: {
    'import.meta.env.VITEST': 'true',
  },
});
