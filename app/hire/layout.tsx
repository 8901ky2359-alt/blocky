import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '雇用・作業依頼 | 現場管理',
  description: '作業者を雇用した際の作業依頼書（発注者・作業者・内容・報酬・支払条件・署名）を作成・共有できるページ。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '雇用・作業依頼' },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
