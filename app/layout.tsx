import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SNS集客トレーニング',
  description: 'アフィリエイター向けSNS集客トレーニングMVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
