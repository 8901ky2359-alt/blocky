import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#e8eef3',
          primary: '#0f1b2d',
          soft: '#dbe6ee',
          accent: '#0891b2',
          accentSoft: '#a5f3fc',
        },
        neon: {
          DEFAULT: '#06b6d4',
          line: '#22d3ee',
        },
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(15,27,45,.06), 0 2px 8px rgba(6,182,212,.06)',
        glow: '0 0 0 1px rgba(6,182,212,.5), 0 0 14px rgba(6,182,212,.35)',
      },
    },
  },
  plugins: [],
};

export default config;
