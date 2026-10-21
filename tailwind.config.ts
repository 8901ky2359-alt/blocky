import type { Config } from 'tailwindcss';

// 色は app/globals.css の CSS 変数で定義（明るい画面／暗い画面は端末の設定で自動切替）
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        fw: {
          bg: 'rgb(var(--fw-bg) / <alpha-value>)',
          card: 'rgb(var(--fw-card) / <alpha-value>)',
          ink: 'rgb(var(--fw-ink) / <alpha-value>)',
          muted: 'rgb(var(--fw-muted) / <alpha-value>)',
          line: 'var(--fw-line)',
          fill: 'var(--fw-fill)',
          green: 'rgb(var(--fw-green) / <alpha-value>)',
          blue: 'rgb(var(--fw-blue) / <alpha-value>)',
          violet: 'rgb(var(--fw-violet) / <alpha-value>)',
          teal: 'rgb(var(--fw-teal) / <alpha-value>)',
          orange: 'rgb(var(--fw-orange) / <alpha-value>)',
          red: 'rgb(var(--fw-red) / <alpha-value>)',
          line_app: 'rgb(var(--fw-line-app) / <alpha-value>)',
          claude: 'rgb(var(--fw-claude) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
