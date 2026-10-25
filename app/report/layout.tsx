import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'ツールボックス',
  description: '現場で使うツールの入口（防草シート管理・ビフォーアフター）',
  manifest: '/report-manifest.json',
  icons: {
    icon: '/report-icon.svg',
    apple: '/report-icon-180.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ツールボックス' },
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
