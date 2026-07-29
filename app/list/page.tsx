'use client';

import { useEffect } from 'react';
import SiteListView from '@/components/list/SiteListView';

export default function ListPage() {
  // オフライン対応（サービスワーカー登録）
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-100 to-slate-300">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-primary text-xs font-black text-white">
            現
          </span>
          <div className="min-w-0">
            <span className="block text-base font-bold tracking-tight text-brand-primary">現場リスト</span>
            <span className="block text-[10px] leading-none text-slate-400">防草シート施工・検索／完了管理</span>
          </div>
        </header>

        <main className="px-4 pb-16 pt-4">
          <SiteListView />
        </main>
      </div>
    </div>
  );
}
