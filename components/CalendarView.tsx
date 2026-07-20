'use client';

import { useMemo, useState } from 'react';
import { Entry, workTypeOf } from '@/lib/types';
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
    const map = new Map<string, { ukeoi: number; jouchu: number; photo: boolean }>();
    for (const e of entries) {
      if (e.kind !== 'income') continue;
      const cur = map.get(e.date) ?? { ukeoi: 0, jouchu: 0, photo: false };
      if (workTypeOf(e) === '常駐') cur.jouchu += e.amount;
      else cur.ukeoi += e.amount;
      if (e.photos.length > 0) cur.photo = true;
      map.set(e.date, cur);
    }
    return map;
  }, [entries]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let count = 0;
    for (const e of entries) {
      if (e.date.slice(0, 7) !== mKey || e.kind !== 'income') continue;
      income += e.amount;
      count += 1;
    }
    return { income, count };
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
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 text-center shadow-sm">
        <div>
          <p className="text-xs text-black/50">売上合計</p>
          <p className="font-bold text-blue-600">{yen(monthTotals.income)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50">作業件数</p>
          <p className="font-bold text-brand-primary">{monthTotals.count}件</p>
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
                className={`flex min-h-[58px] flex-col items-center rounded-lg px-0.5 py-1 text-xs ${
                  isSel ? 'bg-brand-soft' : ''
                } ${isToday ? 'ring-1 ring-brand-primary' : ''}`}
              >
                <span className={`flex items-center gap-0.5 ${isToday ? 'font-bold text-brand-primary' : ''}`}>
                  {day}
                  {info?.photo ? <span className="text-[8px] leading-none">📷</span> : null}
                </span>
                <span className="mt-0.5 flex w-full flex-col items-center gap-px leading-none">
                  {info?.ukeoi ? (
                    <span className="w-full truncate text-center text-[10px] font-semibold text-blue-600">
                      請{manYen(info.ukeoi)}
                    </span>
                  ) : null}
                  {info?.jouchu ? (
                    <span className="w-full truncate text-center text-[10px] font-semibold text-emerald-600">
                      常{manYen(info.jouchu)}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex justify-center gap-5 text-[11px] text-black/50">
        <span>
          <span className="font-bold text-blue-600">請</span> = 請負
        </span>
        <span>
          <span className="font-bold text-emerald-600">常</span> = 常駐
        </span>
        <span>📷 = 写真あり</span>
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
