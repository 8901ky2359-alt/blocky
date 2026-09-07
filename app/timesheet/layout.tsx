import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '作業日報 | 現場管理',
  description: '作業員がメールアドレスとパスワードでログインし、作業日・現場・作業内容・金額を記録。管理者が確認・承認して集計できるページ。',
  manifest: '/timesheet-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '作業日報' },
};

export const viewport: Viewport = {
  themeColor: '#0f1b2d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TimesheetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
