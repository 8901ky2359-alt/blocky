import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '現場ルート報告 | 防草シート・除草の進捗／LINE報告',
  description:
    '工番・記号で検索、除草／防草シート／施工完了のステータス管理、座標を地図に表示してタップで進捗確認、LINE報告テキストを自動生成できる現場報告ツール。オフライン対応。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '現場ルート報告' },
};

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
