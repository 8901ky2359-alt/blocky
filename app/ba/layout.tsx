import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'ビフォーアフター',
  description:
    '看板の有無を選んで、ビフォー／アフター写真を番号ごとに撮影・LINE共有。オフライン対応。',
  manifest: '/ba-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'B/A現場' },
};

export const viewport: Viewport = {
  themeColor: '#f2f2f7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function BALayout({ children }: { children: React.ReactNode }) {
  return children;
}
