'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/expense', label: '経費', icon: '🧾' },
  { href: '/ba', label: 'ビフォーアフター', icon: '📷' },
  { href: '/report', label: '防草シート案件', icon: '🗺' },
  { href: '/hire', label: '雇用', icon: '🤝' },
];

// 各ページ右上のメニュー（全ページへの移動）
export default function AppMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname() || '/';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="メニュー"
        className="grid h-9 w-9 place-items-center border border-slate-300 bg-white text-lg text-slate-600 active:bg-slate-100"
      >
        ☰
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-56 border border-slate-300 bg-white shadow-xl">
            <p className="border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              メニュー
            </p>
            {LINKS.map((l) => {
              const active = path === l.href;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2.5 px-4 py-3 text-sm ${
                    active ? 'bg-brand-soft font-bold text-brand-primary' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{l.icon}</span>
                  {l.label}
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
