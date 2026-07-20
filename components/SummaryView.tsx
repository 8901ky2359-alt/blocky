'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';
import { downloadCsv, entriesToCsv } from '@/lib/csv';

type Mode = 'month' | 'year';

export default function SummaryView({ entries }: { entries: Entry[] }) {
  const [mode, setMode] = useState<Mode>('month');
  const [mKey, setMKey] = useState(currentMonthKey());
  const [year, setYear] = useState(Number(currentMonthKey().slice(0, 4)));

  return (
    <div className="space-y-4 pb-4">
      {/* 月 / 年 切替 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('month')}
          className={`rounded-xl border py-2 text-sm font-semibold ${
            mode === 'month' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          月ごと
        </button>
        <button
          onClick={() => setMode('year')}
          className={`rounded-xl border py-2 text-sm font-semibold ${
            mode === 'year' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          年間（確定申告）
        </button>
      </div>

      {mode === 'month' ? (
        <MonthSummary entries={entries} mKey={mKey} onShift={(d) => setMKey(shiftMonth(mKey, d))} />
      ) : (
        <YearSummary entries={entries} year={year} onShift={(d) => setYear(year + d)} />
      )}
    </div>
  );
}

function MonthSummary({
  entries,
  mKey,
  onShift,
}: {
  entries: Entry[];
  mKey: string;
  onShift: (d: number) => void;
}) {
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
    return {
      income,
      expense,
      profit: income - expense,
      cats: [...expenseByCat.entries()].sort((a, b) => b[1] - a[1]),
      sites: [...bySite.entries()].sort((a, b) => b[1].income - a[1].income),
      count: monthEntries.length,
      rows: monthEntries,
    };
  }, [entries, mKey]);

  const maxCat = data.cats.length ? data.cats[0][1] : 1;

  return (
    <>
      <Nav title={`${formatJpMonth(mKey)} の収支`} onShift={onShift} />

      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">差引利益</p>
        <p className="text-3xl font-bold">{yen(data.profit)}</p>
        <div className="mt-3 flex justify-between text-sm">
          <span>売上 {yen(data.income)}</span>
          <span>経費 {yen(data.expense)}</span>
        </div>
      </div>

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

      <CsvButton
        disabled={data.rows.length === 0}
        onClick={() => downloadCsv(`収支_${mKey}.csv`, entriesToCsv(data.rows))}
      />
      <p className="text-center text-xs text-black/40">記録件数: {data.count}件</p>
    </>
  );
}

function YearSummary({
  entries,
  year,
  onShift,
}: {
  entries: Entry[];
  year: number;
  onShift: (d: number) => void;
}) {
  const data = useMemo(() => {
    const prefix = String(year);
    const yearEntries = entries.filter((e) => e.date.slice(0, 4) === prefix);
    const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
    let income = 0;
    let expense = 0;
    for (const e of yearEntries) {
      const m = Number(e.date.slice(5, 7)) - 1;
      if (e.kind === 'income') {
        months[m].income += e.amount;
        income += e.amount;
      } else {
        months[m].expense += e.amount;
        expense += e.amount;
      }
    }
    const maxV = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
    return { yearEntries, months, income, expense, profit: income - expense, maxV };
  }, [entries, year]);

  return (
    <>
      <Nav title={`${year}年の集計`} onShift={onShift} />

      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">年間 差引利益</p>
        <p className="text-3xl font-bold">{yen(data.profit)}</p>
        <div className="mt-3 flex justify-between text-sm">
          <span>売上 {yen(data.income)}</span>
          <span>経費 {yen(data.expense)}</span>
        </div>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">月別の売上・経費</h3>
        <div className="space-y-1.5">
          {data.months.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 text-black/50">{i + 1}月</span>
              <div className="flex-1 space-y-0.5">
                <div className="h-2 rounded-full bg-blue-400" style={{ width: `${(m.income / data.maxV) * 100}%` }} />
                <div className="h-2 rounded-full bg-red-300" style={{ width: `${(m.expense / data.maxV) * 100}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right text-black/60">{yen(m.income - m.expense)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-black/50">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-full bg-blue-400" />売上
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-full bg-red-300" />経費
          </span>
        </div>
      </section>

      <CsvButton
        disabled={data.yearEntries.length === 0}
        onClick={() => downloadCsv(`収支_${year}年.csv`, entriesToCsv(data.yearEntries))}
        label={`${year}年の明細をCSVで書き出す（確定申告用）`}
      />
      <p className="text-center text-xs text-black/40">記録件数: {data.yearEntries.length}件</p>
    </>
  );
}

function Nav({ title, onShift }: { title: string; onShift: (d: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={() => onShift(-1)} className="rounded-lg px-3 py-1 text-lg">
        ‹
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
      <button onClick={() => onShift(1)} className="rounded-lg px-3 py-1 text-lg">
        ›
      </button>
    </div>
  );
}

function CsvButton({
  onClick,
  disabled,
  label = 'この月の明細をCSVで書き出す',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl border border-brand-primary py-3 text-sm font-semibold text-brand-primary disabled:opacity-40"
    >
      📊 {label}
    </button>
  );
}
