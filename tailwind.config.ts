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
        real: '#2E7D32',
        proxy: '#C62828',
        overcommit: '#E65100',
        available: '#1565C0',
        accent: '#533483',
      },
    },
  },
  plugins: [],
}

export default config
