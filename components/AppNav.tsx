'use client';

import { usePathname } from 'next/navigation';

// 3つのツールを行き来する共通スイッチャー
const LINKS = [
  { href: '/', label: '家計簿', icon: '📒' },
  { href: '/ba', label: 'ビフォーアフター', icon: '📷' },
];

export default function AppNav() {
  const path = usePathname() || '/';
  return (
    <nav className="mb-3 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-card">
      {LINKS.map((l) => {
        const active = path === l.href;
        return (
          <a
            key={l.href}
            href={l.href}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-[11px] font-bold leading-tight ${
              active ? 'bg-brand-primary text-white' : 'text-slate-500'
            }`}
          >
            <span className="text-sm leading-none">{l.icon}</span>
            <span className="truncate">{l.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
