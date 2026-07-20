import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '現場家計簿 | 草刈り・軽トラ管理',
  description:
    '草刈り・軽トラ作業の収支・経費レシート・現場写真をスマホで記録し、LINEで報告できる自分用の家計簿アプリ',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '現場家計簿' },
};

export const viewport: Viewport = {
  themeColor: '#1f7a4f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
