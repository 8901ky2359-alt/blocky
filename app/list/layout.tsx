import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '現場リスト | 防草シート施工・検索／完了管理',
  description:
    '工番・物件名・住所で検索、作業完了の管理、座標からGoogleマップへ、ビフォー/アフター写真の撮影・共有ができる現場リストツール。オフライン対応。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '現場リスト' },
};

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
