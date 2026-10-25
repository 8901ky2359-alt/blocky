'use client';

// ツールボックス（独立ページ・ログイン不要）。現場で使うツールの入口。新しいツールは TOOLS に足していく

import Link from 'next/link';
import { useEffect } from 'react';

const TOOLS = [
  {
    href: '/report/sites',
    name: '防草シート管理',
    desc: '施工リストの検索・地図・進み具合の記録・LINE用の進捗報告',
    letter: '防',
    color: 'from-[#3fb36a] to-[#1f7d43]',
  },
  {
    href: '/report/ba',
    name: 'ビフォーアフター',
    desc: '看板あり／なしを選んで、作業前・作業後の写真を番号ごとに撮影・共有',
    letter: '写',
    color: 'from-[#ffb340] to-[#e8740c]',
  },
];

export default function ToolboxPage() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <div className="fw-light min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[560px] pb-16">
        <h1 className="px-4 pb-1 pt-[max(28px,env(safe-area-inset-top))] text-[28px] font-extrabold">ツールボックス</h1>
        <p className="px-4 pb-5 text-sm text-fw-muted">使うツールを選んでください</p>
        <div className="grid gap-3 px-4">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="flex items-center gap-4 rounded-2xl bg-fw-card p-4 shadow-sm active:scale-[.99]">
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-gradient-to-b ${t.color} text-2xl font-extrabold text-white`}
              >
                {t.letter}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{t.name}</span>
                <span className="block text-[13px] leading-snug text-fw-muted">{t.desc}</span>
              </span>
              <span className="text-xl text-fw-muted">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
