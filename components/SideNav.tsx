'use client';

import { Tab } from './BottomNav';

const ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
  { key: 'summary', label: '収支', icon: '💰' },
  { key: 'map', label: '地図', icon: '🗺' },
  { key: 'report', label: '報告・請求', icon: '📄' },
];

export default function SideNav({
  tab,
  onChange,
  onAdd,
  onBackup,
  onHome,
}: {
  tab: string;
  onChange: (t: Tab) => void;
  onAdd: () => void;
  onBackup: () => void;
  onHome: () => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white px-4 py-6 md:flex">
      <button onClick={onHome} className="mb-6 flex items-center gap-2.5 px-1 text-left" aria-label="ホームに戻る">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-primary text-sm font-black text-white">
          現
        </span>
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight text-brand-primary">売上管理</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">ホームに戻る</div>
        </div>
      </button>

      <button
        onClick={onAdd}
        className="mb-5 flex items-center justify-center gap-2 rounded-lg bg-brand-accent py-3 font-bold text-white shadow-sm transition hover:brightness-105"
      >
        <span className="text-lg leading-none">＋</span> 記録する
      </button>

      <nav className="flex flex-col gap-1">
        {ITEMS.map((it) => {
          const active = it.key === tab;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                active ? 'bg-brand-soft text-brand-primary' : 'text-black/60 hover:bg-black/5'
              }`}
            >
              <span className="text-lg">{it.icon}</span>
              {it.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <button
          onClick={onBackup}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-black/50 transition hover:bg-black/5"
        >
          <span className="text-lg">⚙</span> バックアップ
        </button>
        <p className="px-3 text-[11px] leading-relaxed text-black/30">
          草刈り・軽トラ作業の
          <br />
          売上・現場・請求を管理
        </p>
      </div>
    </aside>
  );
}
