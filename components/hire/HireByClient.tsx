'use client';

import { useMemo, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { yen } from '@/lib/format';

function shortDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
}

export default function HireByClient({
  records,
  onOpen,
}: {
  records: HireRecord[];
  onOpen: (rec: HireRecord) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const groups = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const map = new Map<
      string,
      { client: string; total: number; items: HireRecord[]; byWorker: Map<string, { total: number; count: number }> }
    >();
    for (const r of records) {
      const client = r.client || '（発注元なし）';
      if (kw && !client.toLowerCase().includes(kw) && !r.name.toLowerCase().includes(kw) && !r.site.toLowerCase().includes(kw))
        continue;
      const g =
        map.get(client) ??
        { client, total: 0, items: [] as HireRecord[], byWorker: new Map<string, { total: number; count: number }>() };
      g.total += r.amount;
      g.items.push(r);
      const w = g.byWorker.get(r.name || '（名前なし）') ?? { total: 0, count: 0 };
      w.total += r.amount;
      w.count += 1;
      g.byWorker.set(r.name || '（名前なし）', w);
      map.set(client, g);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [records, q]);

  const grand = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-3 pb-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="発注元・名前・現場で検索"
          className="input pl-9"
          inputMode="search"
        />
      </div>

      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">人件費 合計{q ? '（検索中）' : ''}</p>
        <p className="text-3xl font-bold">{yen(grand)}</p>
        <p className="mt-1 text-xs opacity-70">発注元 {groups.length}件</p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
          記録がありません。
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const on = open === g.client;
            const workers = [...g.byWorker.entries()].sort((a, b) => b[1].total - a[1].total);
            return (
              <div key={g.client} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                <button onClick={() => setOpen(on ? null : g.client)} className="flex w-full items-center gap-3 p-3 text-left">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm font-black text-emerald-700">
                    {g.client.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{g.client}</span>
                    <span className="block text-xs text-slate-400">
                      {workers.length}名・{g.items.length}件
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold text-blue-600">{yen(g.total)}</span>
                    <span className="text-[10px] text-slate-400">{on ? '閉じる ▲' : '内訳 ▼'}</span>
                  </span>
                </button>

                {on && (
                  <div className="border-t border-slate-100">
                    {/* 作業者ごとの小計 */}
                    <div className="bg-slate-50 px-3 py-2">
                      <p className="mb-1 text-[10px] font-bold text-slate-400">作業者ごと</p>
                      {workers.map(([w, v]) => (
                        <div key={w} className="flex justify-between py-0.5 text-xs">
                          <span className="text-slate-600">
                            {w}
                            <span className="ml-1 text-slate-400">×{v.count}</span>
                          </span>
                          <span className="font-bold text-slate-700">{yen(v.total)}</span>
                        </div>
                      ))}
                    </div>
                    {/* 明細 */}
                    <div className="divide-y divide-slate-100">
                      {g.items
                        .slice()
                        .sort((a, b) => (a.date < b.date ? 1 : -1))
                        .map((r) => (
                          <button key={r.id} onClick={() => onOpen(r)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
                            <span className="w-10 shrink-0 text-xs font-bold text-slate-400">{shortDate(r.date)}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                              {r.name || '（名前なし）'}
                              {r.site && <span className="text-slate-400">／{r.site}</span>}
                            </span>
                            <span className="shrink-0 text-sm font-bold text-blue-600">{yen(r.amount)}</span>
                          </button>
                        ))}
                    </div>
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
