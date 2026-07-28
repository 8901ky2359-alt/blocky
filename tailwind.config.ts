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
          bg: '#eef1f5', // 冷たい薄グレー（プロ仕様）
          primary: '#1e293b', // slate-800（チャコールネイビー）
          soft: '#e2e8f0', // slate-200
          accent: '#d97706', // amber-600（現場アクセント）
          accentSoft: '#fde68a',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)',
      },
    },
  },
  plugins: [],
};

export default config;
