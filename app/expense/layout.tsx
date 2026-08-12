import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '経費 | 現場家計簿',
  description: '経費をレシート写真付きで記録し、カレンダー・合計・報告ができる経費管理ページ。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '経費' },
};

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ExpenseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
