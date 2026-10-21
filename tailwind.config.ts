import type { Config } from 'tailwindcss';

// 色は app/globals.css の CSS 変数で定義（明るい画面／暗い画面は端末の設定で自動切替）
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        fw: {
          bg: 'var(--fw-bg)',
          card: 'var(--fw-card)',
          ink: 'var(--fw-ink)',
          muted: 'var(--fw-muted)',
          line: 'var(--fw-line)',
          fill: 'var(--fw-fill)',
          green: 'var(--fw-green)',
          blue: 'var(--fw-blue)',
          violet: 'var(--fw-violet)',
          teal: 'var(--fw-teal)',
          orange: 'var(--fw-orange)',
          red: 'var(--fw-red)',
          line_app: 'var(--fw-line-app)',
          claude: 'var(--fw-claude)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
