import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '山田お仕事案内',
  description: '草刈り現場・オンライン副業の最新募集をまとめた案内サイト',
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
