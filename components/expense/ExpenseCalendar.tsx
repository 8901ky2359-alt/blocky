'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { expenseByDate, summarizeExpenses } from '@/lib/finance';
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
import ExpenseCard from './ExpenseCard';

export default function ExpenseCalendar({
  entries,
  onAddOnDate,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  onAddOnDate: (date: string) => void;
  onEdit: (e: Entry) => void;
  onDelete: (id: string) => void;
}) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [selected, setSelected] = useState<string | null>(todayStr());

  const byDate = useMemo(() => expenseByDate(entries), [entries]);
  const monthTotals = useMemo(
    () => summarizeExpenses(entries.filter((e) => e.date.slice(0, 7) === mKey)),
    [entries, mKey],
  );

  const cells = calendarCells(mKey);
  const selectedEntries = selected
    ? entries.filter((e) => e.kind === 'expense' && e.date === selected)
    : [];
  const today = todayStr();

  return (
    <div className="space-y-4 pb-4">
      {/* 月ヘッダ */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="rounded-lg px-3 py-1 text-lg">
          ‹
        </button>
        <h2 className="text-lg font-bold">{formatJpMonth(mKey)}</h2>
        <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="rounded-lg px-3 py-1 text-lg">
          ›
        </button>
      </div>

      {/* 月サマリー */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-black/5 text-center">
          <div className="px-1">
            <p className="text-[11px] text-black/50">経費合計</p>
            <p className="text-sm font-bold text-red-600">{yen(monthTotals.total)}</p>
          </div>
          <div className="px-1">
            <p className="text-[11px] text-black/50">自己負担</p>
            <p className="text-sm font-bold text-slate-700">{yen(monthTotals.self)}</p>
          </div>
          <div className="px-1">
            <p className="text-[11px] text-black/50">立替（要請求）</p>
            <p className="text-sm font-bold text-amber-600">{yen(monthTotals.reimburse)}</p>
          </div>
        </div>
      </div>

      {/* カレンダー */}
      <div className="rounded-xl bg-white p-2 shadow-sm">
        <div className="grid grid-cols-7 text-center text-xs text-black/40">
          {WEEK_LABELS.map((w, i) => (
            <div key={w} className={`py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const info = byDate.get(c);
            const day = Number(c.slice(8));
            const isToday = c === today;
            const isSel = c === selected;
            return (
              <button
                key={c}
                onClick={() => setSelected(c)}
                className={`flex min-h-[54px] flex-col items-center rounded-lg px-0.5 py-1 text-xs ${
                  isSel ? 'bg-brand-soft' : ''
                } ${isToday ? 'ring-1 ring-brand-primary' : ''}`}
              >
                <span className={`flex items-center gap-0.5 ${isToday ? 'font-bold text-brand-primary' : ''}`}>
                  {day}
                  {info?.photo ? <span className="text-[8px] leading-none">📷</span> : null}
                </span>
                {info?.total ? (
                  <span className="mt-0.5 w-full truncate text-center text-[10px] font-semibold text-red-500">
                    {manYen(info.total)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{formatJpDate(selected)}</h3>
            <button
              onClick={() => onAddOnDate(selected)}
              className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white"
            >
              ＋この日に経費
            </button>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              この日の経費はまだありません
            </p>
          ) : (
            selectedEntries.map((e) => <ExpenseCard key={e.id} entry={e} onEdit={onEdit} onDelete={onDelete} />)
          )}
        </div>
      )}
    </div>
  );
}
