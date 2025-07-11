import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.astro/',
      'coverage/',
      '*.config.{js,ts,mjs}',
      '*.d.ts',
      'src/components/charts/AreaChart.tsx',
      'src/components/charts/BarChart.tsx',
      'src/components/charts/LineChart.tsx',
      'src/components/charts/PieChart.tsx',
      'src/components/charts/QualityCharts.tsx',
      'src/components/charts/__tests__/**/*',
    ],
  },

  // Base JavaScript/TypeScript configuration
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Base configuration for all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        browser: true,
        node: true,
        es2022: true,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // Temporarily disabled for Zod v4 upgrade
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off', // Temporarily disabled for Zod v4 upgrade
      '@typescript-eslint/no-var-requires': 'off',
      
      // General rules
      'no-console': 'off', // Temporarily disabled for Zod v4 upgrade
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-vars': 'off', // Handled by TypeScript
      'prefer-const': 'error',
      'no-var': 'error',

      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+
      'react/prop-types': 'off', // Using TypeScript instead
      'react/display-name': 'off',
      
      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // JSX a11y rules
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Astro files configuration
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    rules: {
      'astro/no-conflict-set-directives': 'error',
      'astro/no-unused-define-vars-in-style': 'error',
    },
  },

  // Test files configuration
  {
    files: ['**/*.{test,spec}.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: true,
        describe: true,
        it: true,
        test: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
        vi: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Chart components configuration
  {
    files: ['src/components/charts/**/*.{ts,tsx}', 'src/lib/utils/chart.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off', // Chart.js debugging
      'react-hooks/exhaustive-deps': 'warn', // More lenient for chart components
    },
  },

  // Performance and utils configuration
  {
    files: ['src/components/performance/**/*.{ts,tsx,astro}', 'src/lib/utils/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off', // Performance monitoring and debugging
    },
  },

  // Dashboard and API configuration
  {
    files: ['src/components/dashboard/**/*.{ts,tsx,astro}', 'src/pages/api/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off', // API and dashboard debugging
    },
  },
];