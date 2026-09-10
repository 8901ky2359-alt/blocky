import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '看板入り写真撮影 | 現場管理',
  description: '工事名・場所・種別・通し番号の看板を写真の左下に自動で合成して撮影・一括保存できるページ。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '看板入り写真撮影' },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function PhotoSignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
