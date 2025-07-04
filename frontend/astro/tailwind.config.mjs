/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        'beaver-blue': {
          600: '#2563eb',
          700: '#1d4ed8',
        },
        'beaver-purple': {
          600: '#9333ea',
          700: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}