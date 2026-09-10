'use client';

import { useEffect } from 'react';
import AppMenu from '@/components/AppMenu';
import RequireRole from '@/components/RequireRole';
import SignPhoto from '@/components/signphoto/SignPhoto';

export default function PhotoSignPage() {
  return (
    <RequireRole role="admin">
      {() => <PhotoSignInner />}
    </RequireRole>
  );
}

function PhotoSignInner() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <div className="min-h-[100dvh] hud-bg">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[520px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <a href="/" className="flex items-center gap-2" aria-label="ホームに戻る">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-black text-white">
              看
            </span>
            <span className="text-base font-bold tracking-tight text-brand-primary">看板入り写真撮影</span>
            <span className="text-xs text-slate-400">／ホーム</span>
          </a>
          <AppMenu />
        </header>

        <main className="w-full px-4 pb-16 pt-4">
          <SignPhoto />
        </main>
      </div>
    </div>
  );
}
