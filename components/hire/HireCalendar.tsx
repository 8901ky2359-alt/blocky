'use client';

import { useMemo, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
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

export default function HireCalendar({
  records,
  onOpen,
  onAddOnDate,
}: {
  records: HireRecord[];
  onOpen: (rec: HireRecord) => void;
  onAddOnDate: (date: string) => void;
}) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [selected, setSelected] = useState<string | null>(todayStr());

  const byDate = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of records) {
      if (!r.date) continue;
      const cur = map.get(r.date) ?? { total: 0, count: 0 };
      cur.total += r.amount;
      cur.count += 1;
      map.set(r.date, cur);
    }
    return map;
  }, [records]);

  const monthTotal = useMemo(() => {
    const list = records.filter((r) => r.date.slice(0, 7) === mKey);
    return { total: list.reduce((s, r) => s + r.amount, 0), count: list.length };
  }, [records, mKey]);

  const cells = calendarCells(mKey);
  const dayRecords = selected ? records.filter((r) => r.date === selected) : [];
  const today = todayStr();

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="rounded-lg px-3 py-1 text-lg">
          ‹
        </button>
        <h2 className="text-lg font-bold">{formatJpMonth(mKey)}</h2>
        <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="rounded-lg px-3 py-1 text-lg">
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 text-center shadow-sm">
        <div>
          <p className="text-xs text-black/50">件数</p>
          <p className="font-bold text-brand-primary">{monthTotal.count}件</p>
        </div>
        <div>
          <p className="text-xs text-black/50">合計金額</p>
          <p className="font-bold text-blue-600">{yen(monthTotal.total)}</p>
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
                <span className={isToday ? 'font-bold text-brand-primary' : ''}>{day}</span>
                {info ? (
                  <span className="mt-0.5 w-full truncate text-center text-[10px] font-semibold text-blue-600">
                    {manYen(info.total)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

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
          {dayRecords.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              この日の記録はありません
            </p>
          ) : (
            dayRecords.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpen(r)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-black text-brand-primary">
                  {r.name.slice(0, 1) || '?'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{r.name || '（名前なし）'}</span>
                  <span className="block truncate text-xs text-slate-500">{r.site || '現場名なし'}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-blue-600">{yen(r.amount)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
