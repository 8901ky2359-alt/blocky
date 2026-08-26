'use client';

import { useMemo, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { yen } from '@/lib/format';

function shortDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
}

export default function HireByName({
  records,
  onOpen,
}: {
  records: HireRecord[];
  onOpen: (rec: HireRecord) => void;
}) {
  const [q, setQ] = useState('');
  const [openName, setOpenName] = useState<string | null>(null);

  const groups = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const map = new Map<string, { name: string; total: number; items: HireRecord[] }>();
    for (const r of records) {
      const name = r.name || '（名前なし）';
      if (kw && !name.toLowerCase().includes(kw) && !r.site.toLowerCase().includes(kw)) continue;
      const g = map.get(name) ?? { name, total: 0, items: [] };
      g.total += r.amount;
      g.items.push(r);
      map.set(name, g);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [records, q]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-3 pb-4">
      {/* 検索 */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="名前・現場名で検索"
          className="input pl-9"
          inputMode="search"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="クリア">
            ×
          </button>
        )}
      </div>

      {/* 総合計 */}
      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">合計金額{q ? '（検索中）' : ''}</p>
        <p className="text-3xl font-bold">{yen(grandTotal)}</p>
        <p className="mt-1 text-xs opacity-70">{groups.length}名／{groups.reduce((n, g) => n + g.items.length, 0)}件</p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
          記録がありません。
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const on = openName === g.name;
            return (
              <div key={g.name} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                <button
                  onClick={() => setOpenName(on ? null : g.name)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-black text-brand-primary">
                    {g.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{g.name}</span>
                    <span className="block text-xs text-slate-400">{g.items.length}件</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold text-blue-600">{yen(g.total)}</span>
                    <span className="text-[10px] text-slate-400">{on ? '閉じる ▲' : '明細 ▼'}</span>
                  </span>
                </button>

                {on && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {g.items.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onOpen(r)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left"
                      >
                        <span className="w-10 shrink-0 text-xs font-bold text-slate-400">{shortDate(r.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{r.site || '（現場名なし）'}</span>
                        <span className="shrink-0 text-sm font-bold text-blue-600">{yen(r.amount)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
