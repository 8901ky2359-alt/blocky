'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { summarize, Totals } from '@/lib/finance';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';
import { downloadCsv, entriesToCsv } from '@/lib/csv';

type Mode = 'month' | 'year';

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

// 収支カード（売上 − 自己負担経費 ＝ 差引利益。常駐立替は別枠）
function BalanceCard({ t, label }: { t: Totals; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-brand-primary text-white shadow">
      <div className="p-4">
        <p className="text-sm opacity-80">{label}</p>
        <p className="mt-0.5 text-3xl font-bold">{yen(t.net)}</p>
        <p className="mt-1 text-xs opacity-70">差引（手取り）／作業 {t.count}件</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/15 border-t border-white/15 text-center text-sm">
        <div className="p-2.5">
          <p className="text-[11px] opacity-70">売上合計</p>
          <p className="font-bold">{yen(t.income)}</p>
        </div>
        <div className="p-2.5">
          <p className="text-[11px] opacity-70">自己負担経費（請負）</p>
          <p className="font-bold text-red-200">−{yen(t.selfExpense)}</p>
        </div>
      </div>
      {t.reimburseExpense > 0 && (
        <div className="bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold">
          常駐の立替経費 {yen(t.reimburseExpense)}　→ 中野さんに請求して受け取る（差引ゼロ）
        </div>
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
    const rows = entries.filter((e) => e.kind === 'income' && e.date.slice(0, 7) === mKey);
    const t = summarize(rows);
    const bySite = new Map<string, { total: number; count: number; expense: number }>();
    for (const e of rows) {
      const site = e.site || '（現場名なし）';
      const cur = bySite.get(site) ?? { total: 0, count: 0, expense: 0 };
      cur.total += e.amount;
      cur.expense += e.expense || 0;
      cur.count += 1;
      bySite.set(site, cur);
    }
    return { t, sites: [...bySite.entries()].sort((a, b) => b[1].total - a[1].total), rows };
  }, [entries, mKey]);

  return (
    <>
      <Nav title={`${formatJpMonth(mKey)} の収支`} onShift={onShift} />

      <BalanceCard t={data.t} label={`${formatJpMonth(mKey)} の差引利益`} />

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">現場別の売上・経費</h3>
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
                <span className="shrink-0 text-right">
                  <span className="font-medium text-blue-600">{yen(v.total)}</span>
                  {v.expense > 0 && (
                    <span className="ml-2 text-xs text-red-500">経費 −{yen(v.expense)}</span>
                  )}
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
    const rows = entries.filter((e) => e.kind === 'income' && e.date.slice(0, 4) === prefix);
    const t = summarize(rows);
    const months = Array.from({ length: 12 }, () => ({ income: 0, net: 0 }));
    for (const e of rows) {
      const m = Number(e.date.slice(5, 7)) - 1;
      months[m].income += e.amount;
    }
    // 月ごとの差引は月単位でsummarizeし直す
    for (let m = 0; m < 12; m++) {
      const mm = String(m + 1).padStart(2, '0');
      months[m].net = summarize(rows.filter((e) => e.date.slice(5, 7) === mm)).net;
    }
    return { rows, months, t, maxV: Math.max(1, ...months.map((v) => v.income)) };
  }, [entries, year]);

  return (
    <>
      <Nav title={`${year}年の収支集計`} onShift={onShift} />

      <BalanceCard t={data.t} label={`${year}年 の差引利益`} />

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">月別の売上</h3>
        <div className="space-y-1.5">
          {data.months.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 text-black/50">{i + 1}月</span>
              <div className="h-3 flex-1 rounded-full bg-black/5">
                <div
                  className="h-3 rounded-full bg-blue-400"
                  style={{ width: `${(v.income / data.maxV) * 100}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-black/60">{yen(v.income)}</span>
            </div>
          ))}
        </div>
      </section>

      <CsvButton
        disabled={data.rows.length === 0}
        onClick={() => downloadCsv(`収支_${year}年.csv`, entriesToCsv(data.rows))}
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
