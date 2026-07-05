import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '新西広島サイト 水路工 現地調査チェックリスト（2026年5月）',
  description:
    '新西広島サイト 水路工の現地調査結果チェックリスト。優先度別のフィルタ・対応チェック・現地写真集を1画面で確認できます。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
