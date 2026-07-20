'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';

export default function SummaryView({ entries }: { entries: Entry[] }) {
  const [mKey, setMKey] = useState(currentMonthKey());

  const data = useMemo(() => {
    const monthEntries = entries.filter((e) => e.date.slice(0, 7) === mKey);
    let income = 0;
    let expense = 0;
    const expenseByCat = new Map<string, number>();
    const bySite = new Map<string, { income: number; expense: number }>();
    for (const e of monthEntries) {
      if (e.kind === 'income') income += e.amount;
      else {
        expense += e.amount;
        expenseByCat.set(e.category, (expenseByCat.get(e.category) ?? 0) + e.amount);
      }
      const site = e.site || '（現場名なし）';
      const cur = bySite.get(site) ?? { income: 0, expense: 0 };
      if (e.kind === 'income') cur.income += e.amount;
      else cur.expense += e.amount;
      bySite.set(site, cur);
    }
    const cats = [...expenseByCat.entries()].sort((a, b) => b[1] - a[1]);
    const sites = [...bySite.entries()].sort((a, b) => b[1].income - a[1].income);
    return { income, expense, profit: income - expense, cats, sites, count: monthEntries.length };
  }, [entries, mKey]);

  const maxCat = data.cats.length ? data.cats[0][1] : 1;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="rounded-lg px-3 py-1 text-lg">
          ‹
        </button>
        <h2 className="text-lg font-bold">{formatJpMonth(mKey)} の収支</h2>
        <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="rounded-lg px-3 py-1 text-lg">
          ›
        </button>
      </div>

      {/* 大きな差引利益 */}
      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">差引利益</p>
        <p className="text-3xl font-bold">{yen(data.profit)}</p>
        <div className="mt-3 flex justify-between text-sm">
          <span>売上 {yen(data.income)}</span>
          <span>経費 {yen(data.expense)}</span>
        </div>
      </div>

      {/* 経費のカテゴリ内訳 */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">経費の内訳</h3>
        {data.cats.length === 0 ? (
          <p className="text-sm text-black/40">経費の記録はありません</p>
        ) : (
          <div className="space-y-2">
            {data.cats.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm">
                  <span>{cat}</span>
                  <span className="font-medium">{yen(amt)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-black/5">
                  <div
                    className="h-2 rounded-full bg-red-400"
                    style={{ width: `${Math.max(4, (amt / maxCat) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 現場別 */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">現場別のまとめ</h3>
        {data.sites.length === 0 ? (
          <p className="text-sm text-black/40">記録はありません</p>
        ) : (
          <div className="divide-y divide-black/5">
            {data.sites.map(([site, v]) => (
              <div key={site} className="flex items-center justify-between py-2">
                <span className="min-w-0 truncate pr-2 text-sm">{site}</span>
                <span className="shrink-0 text-right text-sm">
                  <span className="text-blue-600">{yen(v.income)}</span>
                  <span className="mx-1 text-black/30">/</span>
                  <span className="text-red-500">{yen(v.expense)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-black/40">記録件数: {data.count}件</p>
    </div>
  );
}
