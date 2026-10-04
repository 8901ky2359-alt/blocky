'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { summarize, Totals } from '@/lib/finance';
import { isBillGroup, billGroupDueDate, billGroupText } from '@/lib/billgroup';
import {
  WEEK_LABELS,
  calendarCells,
  currentMonthKey,
  formatJpDate,
  formatJpMonth,
  manYen,
  shiftMonth,
  todayStr,
  yen,
} from '@/lib/format';
import { downloadCsv, entriesToCsv } from '@/lib/csv';

type Mode = 'month' | 'year' | 'incoming';

export default function SummaryView({ entries }: { entries: Entry[] }) {
  const [mode, setMode] = useState<Mode>('month');
  const [mKey, setMKey] = useState(currentMonthKey());
  const [year, setYear] = useState(Number(currentMonthKey().slice(0, 4)));
  const [payMKey, setPayMKey] = useState(currentMonthKey());

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setMode('month')}
          className={`rounded-xl border py-2 text-xs font-semibold sm:text-sm ${
            mode === 'month' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          月ごと
        </button>
        <button
          onClick={() => setMode('year')}
          className={`rounded-xl border py-2 text-xs font-semibold sm:text-sm ${
            mode === 'year' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          年間（確定申告）
        </button>
        <button
          onClick={() => setMode('incoming')}
          className={`rounded-xl border py-2 text-xs font-semibold sm:text-sm ${
            mode === 'incoming' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          入金カレンダー
        </button>
      </div>

      {mode === 'month' ? (
        <MonthSummary entries={entries} mKey={mKey} onShift={(d) => setMKey(shiftMonth(mKey, d))} />
      ) : mode === 'year' ? (
        <YearSummary entries={entries} year={year} onShift={(d) => setYear(year + d)} />
      ) : (
        <IncomingCalendar
          entries={entries}
          payMKey={payMKey}
          onShift={(d) => setPayMKey(shiftMonth(payMKey, d))}
        />
      )}
    </div>
  );
}

// 入金カレンダー：締日グループ（A/B/C）から導いた「お金が実際に入ってくる日」を家計簿のように表示
function IncomingCalendar({
  entries,
  payMKey,
  onShift,
}: {
  entries: Entry[];
  payMKey: string;
  onShift: (d: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const workMKey = shiftMonth(payMKey, -1);

  const data = useMemo(() => {
    const rows = entries.filter(
      (e) => e.kind === 'income' && e.date.slice(0, 7) === workMKey && isBillGroup(e.billGroup),
    );
    const byDate = new Map<string, { total: number; items: Entry[]; clients: string[] }>();
    for (const e of rows) {
      const due = billGroupDueDate(workMKey, e.billGroup);
      if (!due) continue;
      const g = byDate.get(due) ?? { total: 0, items: [], clients: [] };
      g.total += e.amount;
      g.items.push(e);
      const bk = clientNameOf(e);
      if (!g.clients.includes(bk)) g.clients.push(bk);
      byDate.set(due, g);
    }
    const undated = entries.filter(
      (e) => e.kind === 'income' && e.date.slice(0, 7) === workMKey && !isBillGroup(e.billGroup),
    );
    const undatedTotal = undated.reduce((s, e) => s + e.amount, 0);
    const monthTotal = rows.reduce((s, e) => s + e.amount, 0);
    return { byDate, undatedTotal, undatedCount: undated.length, monthTotal };
  }, [entries, workMKey]);

  const cells = calendarCells(payMKey);
  const today = todayStr();
  const selInfo = selected ? data.byDate.get(selected) : null;
  const selGroups = useMemo(() => (selInfo ? groupByClient(selInfo.items) : []), [selInfo]);

  return (
    <>
      <Nav title={`${formatJpMonth(payMKey)} の入金予定`} onShift={onShift} />

      <div className="overflow-hidden rounded-2xl bg-emerald-600 text-white shadow">
        <div className="p-4">
          <p className="text-sm opacity-80">{formatJpMonth(payMKey)} に入ってくる金額の合計（税込）</p>
          <p className="mt-0.5 text-3xl font-bold">{yen(withTax(data.monthTotal))}</p>
          <p className="mt-1 text-xs opacity-70">{formatJpMonth(workMKey)}分の売上（締日グループ設定済み）</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-2 shadow-sm">
        <div className="grid grid-cols-7 text-center text-xs text-black/40">
          {WEEK_LABELS.map((w, i) => (
            <div key={w} className={`py-1 ${i === 6 ? 'text-red-400' : i === 5 ? 'text-blue-400' : ''}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const day = Number(c.slice(8));
            const info = data.byDate.get(c);
            const isToday = c === today;
            const isSel = c === selected;
            return (
              <button
                key={c}
                onClick={() => setSelected(isSel ? null : c)}
                className={`flex min-h-[58px] flex-col items-center justify-start rounded-lg px-0.5 py-1 text-xs ${
                  isSel ? 'bg-brand-soft' : info ? 'bg-emerald-50' : ''
                } ${isToday ? 'ring-1 ring-brand-primary' : ''}`}
              >
                <span className={isToday ? 'font-bold text-brand-primary' : ''}>{day}</span>
                {info && (
                  <>
                    <span className="mt-0.5 text-[10px] font-bold text-emerald-600">
                      {manYen(withTax(info.total))}
                    </span>
                    <span className="mt-0.5 flex gap-0.5">
                      {info.clients.slice(0, 4).map((c2) => (
                        <span
                          key={c2}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: clientColor(c2) }}
                        />
                      ))}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {data.undatedCount > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          {formatJpMonth(workMKey)}分に締日未設定の記録が{data.undatedCount}件（{yen(withTax(data.undatedTotal))}
          ・税込）あります。入金日を表示するには、各記録で締日（A/B/C）を設定してください。
        </p>
      )}

      {selected && selInfo && (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">
            {formatJpDate(selected)} の入金予定
            <span className="text-emerald-600">{yen(withTax(selInfo.total))}</span>
            <span className="ml-1 text-[11px] font-normal text-black/40">税込</span>
          </h3>
          <div className="space-y-3">
            {selGroups.map(([client, g]) => (
              <div key={client}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: clientColor(client) }}
                  />
                  <span className="min-w-0 truncate text-sm font-semibold">{client}</span>
                  <span className="ml-auto shrink-0 text-sm font-bold" style={{ color: clientColor(client) }}>
                    {yen(withTax(g.total))}
                    <span className="ml-1 text-[11px] font-normal text-black/40">（{g.items.length}件）</span>
                  </span>
                </div>
                <div className="divide-y divide-black/5 pl-4">
                  {g.items.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-1 text-xs text-black/60">
                      <span className="min-w-0 truncate pr-2">
                        {billGroupText(e.billGroup)}・{e.site}
                      </span>
                      <span className="shrink-0 font-medium">{yen(withTax(e.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// 消費税（10%・切り捨て）を含めた金額
function withTax(n: number): number {
  return n + Math.floor(n * 0.1);
}

function clientNameOf(e: Entry): string {
  return e.billTo && e.billTo.trim() ? e.billTo.trim() : e.site || '請求先なし';
}

// 請求先ごとにグルーピング（金額の大きい順）
function groupByClient(items: Entry[]): [string, { total: number; items: Entry[] }][] {
  const m = new Map<string, { total: number; items: Entry[] }>();
  for (const e of items) {
    const key = clientNameOf(e);
    const g = m.get(key) ?? { total: 0, items: [] };
    g.total += e.amount;
    g.items.push(e);
    m.set(key, g);
  }
  return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
}

// 請求先名から一意な色を割り当てる（カレンダーの点・内訳の見出しに使用）
const CLIENT_COLORS = [
  '#34d399',
  '#38bdf8',
  '#fbbf24',
  '#e879f9',
  '#fb923c',
  '#a3e635',
  '#fb7185',
  '#a78bfa',
  '#22d3ee',
  '#2dd4bf',
];
function clientColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CLIENT_COLORS[h % CLIENT_COLORS.length];
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
