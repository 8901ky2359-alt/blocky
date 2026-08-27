'use client';

import { useEffect } from 'react';
import ReportListView from '@/components/report/ReportListView';

export default function ReportPage() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-[100dvh] hud-bg">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-primary text-xs font-black text-white">
            現
          </span>
          <div className="min-w-0">
            <span className="block text-base font-bold tracking-tight text-brand-primary">現場ルート報告</span>
            <span className="block text-[10px] leading-none text-slate-400">
              防草シート・除草の進捗管理／LINE報告
            </span>
          </div>
        </header>

        <main className="px-4 pb-16 pt-4">
          <ReportListView />
        </main>
      </div>
    </div>
  );
}
