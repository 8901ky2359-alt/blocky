'use client';

import { useMemo, useState } from 'react';
import { TimesheetEntry } from '@/lib/timesheet/types';
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

export default function EntryCalendar({
  entries,
  onAddOnDate,
  onOpen,
}: {
  entries: TimesheetEntry[];
  onAddOnDate: (date: string) => void;
  onOpen: (entry: TimesheetEntry) => void;
}) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [selected, setSelected] = useState<string | null>(todayStr());

  const byDate = useMemo(() => {
    const map = new Map<string, { total: number; count: number; pending: number }>();
    for (const e of entries) {
      if (!e.date) continue;
      const cur = map.get(e.date) ?? { total: 0, count: 0, pending: 0 };
      cur.total += e.amount;
      cur.count += 1;
      if (e.status === 'pending') cur.pending += 1;
      map.set(e.date, cur);
    }
    return map;
  }, [entries]);

  const monthTotal = useMemo(() => {
    const list = entries.filter((e) => e.date.slice(0, 7) === mKey);
    return {
      total: list.reduce((s, e) => s + e.amount, 0),
      count: list.length,
      pending: list.filter((e) => e.status === 'pending').length,
    };
  }, [entries, mKey]);

  const cells = calendarCells(mKey);
  const dayEntries = selected ? entries.filter((e) => e.date === selected) : [];
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

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center shadow-sm">
        <div>
          <p className="text-xs text-black/50">件数</p>
          <p className="font-bold text-brand-primary">{monthTotal.count}件</p>
        </div>
        <div>
          <p className="text-xs text-black/50">合計金額</p>
          <p className="font-bold text-blue-600">{yen(monthTotal.total)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50">承認待ち</p>
          <p className="font-bold text-amber-600">{monthTotal.pending}件</p>
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
                  <span
                    className={`mt-0.5 w-full truncate text-center text-[10px] font-semibold ${
                      info.pending > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
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
          {dayEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              この日の記録はありません
            </p>
          ) : (
            dayEntries.map((e) => (
              <button
                key={e.id}
                onClick={() => onOpen(e)}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    e.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {e.status === 'approved' ? '承認済み' : '承認待ち'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{e.site || '現場名なし'}</span>
                  <span className="block truncate text-xs text-slate-500">{e.workContent || '（作業内容なし）'}</span>
                  {e.editedByAdmin && e.adminMemo && (
                    <span className="mt-0.5 block truncate text-[11px] text-indigo-600">
                      ✎ 管理者修正: {e.adminMemo}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-bold text-blue-600">{yen(e.amount)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
