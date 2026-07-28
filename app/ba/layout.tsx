import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '現場ビフォーアフター | 写真管理・共有',
  description:
    '現場作業のビフォー/アフター写真を番号ごとに記録し、LINEで2枚セット共有できるプロ仕様の現場写真アプリ。オフライン対応。',
  manifest: '/ba-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'B/A現場' },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function BALayout({ children }: { children: React.ReactNode }) {
  return children;
}
