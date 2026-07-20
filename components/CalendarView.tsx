'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import {
  WEEK_LABELS,
  calendarCells,
  currentMonthKey,
  formatJpDate,
  formatJpMonth,
  shiftMonth,
  todayStr,
  yen,
} from '@/lib/format';
import EntryCard from './EntryCard';

export default function CalendarView({
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

  const byDate = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; photo: boolean }>();
    for (const e of entries) {
      const cur = map.get(e.date) ?? { income: 0, expense: 0, photo: false };
      if (e.kind === 'income') cur.income += e.amount;
      else cur.expense += e.amount;
      if (e.photos.length > 0) cur.photo = true;
      map.set(e.date, cur);
    }
    return map;
  }, [entries]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (e.date.slice(0, 7) !== mKey) continue;
      if (e.kind === 'income') income += e.amount;
      else expense += e.amount;
    }
    return { income, expense, profit: income - expense };
  }, [entries, mKey]);

  const cells = calendarCells(mKey);
  const selectedEntries = selected ? entries.filter((e) => e.date === selected) : [];
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
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center shadow-sm">
        <div>
          <p className="text-xs text-black/50">売上</p>
          <p className="font-bold text-blue-600">{yen(monthTotals.income)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50">経費</p>
          <p className="font-bold text-red-600">{yen(monthTotals.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50">差引</p>
          <p className={`font-bold ${monthTotals.profit >= 0 ? 'text-brand-primary' : 'text-red-600'}`}>
            {yen(monthTotals.profit)}
          </p>
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
                className={`flex min-h-[46px] flex-col items-center rounded-lg p-1 text-xs ${
                  isSel ? 'bg-brand-soft' : ''
                } ${isToday ? 'ring-1 ring-brand-primary' : ''}`}
              >
                <span className={isToday ? 'font-bold text-brand-primary' : ''}>{day}</span>
                <span className="mt-0.5 flex gap-0.5">
                  {info?.income ? <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> : null}
                  {info?.expense ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
                  {info?.photo ? <span className="text-[8px] leading-none">📷</span> : null}
                </span>
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
              ＋この日に記録
            </button>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              この日の記録はまだありません
            </p>
          ) : (
            selectedEntries.map((e) => (
              <EntryCard key={e.id} entry={e} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
