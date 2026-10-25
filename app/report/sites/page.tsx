'use client';

// 防草シート管理（独立ページ・ログイン不要）。施工リスト244件の検索・地図・進捗・LINE報告。
// 進捗はサーバーと同期し、全端末で共有される。

import Link from 'next/link';
import { useEffect } from 'react';
import ReportListView from '@/components/report/ReportListView';

export default function ReportPage() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <div className="fw-light min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[560px]">
        <header className="flex min-h-[44px] items-center px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href="/report" className="py-2 text-[15px] text-fw-green">
            ‹ ツールボックス
          </Link>
        </header>
        <h1 className="px-4 pb-1 pt-1 text-[28px] font-extrabold">防草シート管理</h1>
        <p className="px-4 pb-3 text-sm text-fw-muted">工番・記号で検索、除草／防草シートの進み具合の管理、地図、LINE報告</p>
        <main className="px-4 pb-16">
          <ReportListView />
        </main>
      </div>
    </div>
  );
}
