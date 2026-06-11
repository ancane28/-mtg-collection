import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Navy-tinted gray scale (EDHREC-inspired dark palette)
        gray: {
          50:  '#f0f2fa',
          100: '#e8eaf5',
          200: '#d0d4e8',
          300: '#adb2c8',
          400: '#878da8',
          500: '#555a72',
          600: '#343748',
          700: '#1f2234',
          800: '#141720',
          900: '#0d0f17',
          950: '#080a10',
        },
        real:      '#2E7D32',
        proxy:     '#C62828',
        overcommit:'#E65100',
        available: '#1565C0',
        accent:    '#ea580c',
      },
    },
  },
  plugins: [],
}

export default config
