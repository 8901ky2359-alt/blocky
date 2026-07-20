'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';
import { downloadCsv, entriesToCsv } from '@/lib/csv';

type Mode = 'month' | 'year';

// 収入のみを対象にする
function incomeOnly(entries: Entry[]): Entry[] {
  return entries.filter((e) => e.kind === 'income');
}

export default function SummaryView({ entries }: { entries: Entry[] }) {
  const [mode, setMode] = useState<Mode>('month');
  const [mKey, setMKey] = useState(currentMonthKey());
  const [year, setYear] = useState(Number(currentMonthKey().slice(0, 4)));

  return (
    <div className="space-y-4 pb-4">
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
    const rows = incomeOnly(entries).filter((e) => e.date.slice(0, 7) === mKey);
    let income = 0;
    const bySite = new Map<string, { total: number; count: number }>();
    for (const e of rows) {
      income += e.amount;
      const site = e.site || '（現場名なし）';
      const cur = bySite.get(site) ?? { total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      bySite.set(site, cur);
    }
    return {
      income,
      sites: [...bySite.entries()].sort((a, b) => b[1].total - a[1].total),
      count: rows.length,
      rows,
    };
  }, [entries, mKey]);

  return (
    <>
      <Nav title={`${formatJpMonth(mKey)} の売上`} onShift={onShift} />

      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">売上合計</p>
        <p className="text-3xl font-bold">{yen(data.income)}</p>
        <p className="mt-2 text-sm opacity-80">作業 {data.count}件</p>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">現場別の売上</h3>
        {data.sites.length === 0 ? (
          <p className="text-sm text-black/40">記録はありません</p>
        ) : (
          <div className="divide-y divide-black/5">
            {data.sites.map(([site, v]) => (
              <div key={site} className="flex items-center justify-between py-2">
                <span className="min-w-0 truncate pr-2 text-sm">
                  {site}
                  <span className="ml-1 text-xs text-black/40">×{v.count}</span>
                </span>
                <span className="shrink-0 font-medium text-blue-600">{yen(v.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <CsvButton
        disabled={data.rows.length === 0}
        onClick={() => downloadCsv(`売上_${mKey}.csv`, entriesToCsv(data.rows))}
      />
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
    const rows = incomeOnly(entries).filter((e) => e.date.slice(0, 4) === prefix);
    const months = Array.from({ length: 12 }, () => 0);
    let income = 0;
    for (const e of rows) {
      const m = Number(e.date.slice(5, 7)) - 1;
      months[m] += e.amount;
      income += e.amount;
    }
    return { rows, months, income, maxV: Math.max(1, ...months) };
  }, [entries, year]);

  return (
    <>
      <Nav title={`${year}年の売上集計`} onShift={onShift} />

      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">年間 売上合計</p>
        <p className="text-3xl font-bold">{yen(data.income)}</p>
        <p className="mt-2 text-sm opacity-80">作業 {data.rows.length}件</p>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">月別の売上</h3>
        <div className="space-y-1.5">
          {data.months.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 text-black/50">{i + 1}月</span>
              <div className="h-3 flex-1 rounded-full bg-black/5">
                <div className="h-3 rounded-full bg-blue-400" style={{ width: `${(v / data.maxV) * 100}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right text-black/60">{yen(v)}</span>
            </div>
          ))}
        </div>
      </section>

      <CsvButton
        disabled={data.rows.length === 0}
        onClick={() => downloadCsv(`売上_${year}年.csv`, entriesToCsv(data.rows))}
        label={`${year}年の明細をCSVで書き出す（確定申告用）`}
      />
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
