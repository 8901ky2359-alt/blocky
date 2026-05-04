import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#f5f9f5',
          primary: '#1f7a4f',
          soft: '#d7ebdd',
        },
      },
    },
  },
  plugins: [],
};

export default config;
