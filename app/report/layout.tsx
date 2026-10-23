import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '防草シート管理',
  description:
    '工番・記号で検索、除草／防草シート／施工完了のステータス管理、座標を地図に表示してタップで進捗確認、LINE報告テキストを自動生成できる現場報告ツール。オフライン対応。',
  manifest: '/report-manifest.json',
  icons: {
    icon: '/report-icon.svg',
    apple: '/report-icon-180.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '防草シート管理' },
};

export const viewport: Viewport = {
  themeColor: '#f2f2f7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
