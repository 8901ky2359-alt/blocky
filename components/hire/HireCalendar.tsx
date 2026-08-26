'use client';

import { useMemo, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
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

// 報酬額テキストから金額を推定（例: "1人工 20,000円" → 20000）
function rateYen(s: string): number {
  const m = (s || '').match(/[\d,]+/g);
  if (!m) return 0;
  return Number(m[m.length - 1].replace(/,/g, '')) || 0;
}

// 開始〜終了の各日（最大60日まで）
function rangeDays(start: string, end?: string): string[] {
  if (!end || end === start) return [start];
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const out: string[] = [];
  const cur = new Date(ys, ms - 1, ds);
  const last = new Date(ye, me - 1, de);
  let guard = 0;
  while (cur <= last && guard < 60) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out.length ? out : [start];
}

export default function HireCalendar({
  records,
  onOpen,
}: {
  records: HireRecord[];
  onOpen: (rec: HireRecord) => void;
}) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [selected, setSelected] = useState<string | null>(todayStr());

  // 日付 → その日に該当する依頼
  const byDate = useMemo(() => {
    const map = new Map<string, HireRecord[]>();
    for (const r of records) {
      for (const d of rangeDays(r.dateStart, r.dateEnd)) {
        const arr = map.get(d) ?? [];
        arr.push(r);
        map.set(d, arr);
      }
    }
    return map;
  }, [records]);

  // 月サマリー（開始日がその月のものを集計）
  const summary = useMemo(() => {
    const list = records.filter((r) => r.dateStart.slice(0, 7) === mKey);
    const total = list.reduce((s, r) => s + rateYen(r.rate), 0);
    return { count: list.length, total };
  }, [records, mKey]);

  const cells = calendarCells(mKey);
  const dayRecords = selected ? byDate.get(selected) ?? [] : [];
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
          <p className="text-xs text-black/50">依頼件数</p>
          <p className="font-bold text-brand-primary">{summary.count}件</p>
        </div>
        <div>
          <p className="text-xs text-black/50">報酬合計（概算）</p>
          <p className="font-bold text-blue-600">{yen(summary.total)}</p>
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
            const recs = byDate.get(c);
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
                {recs && recs.length > 0 && (
                  <span className="mt-0.5 w-full truncate rounded bg-indigo-100 px-0.5 text-center text-[9px] font-bold text-indigo-700">
                    {recs.length === 1 ? recs[0].worker || '依頼' : `${recs.length}件`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の依頼 */}
      {selected && (
        <div className="space-y-2">
          <h3 className="font-semibold">{formatJpDate(selected)}</h3>
          {dayRecords.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              この日の作業依頼はありません
            </p>
          ) : (
            dayRecords.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpen(r)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-black text-brand-primary">
                  {r.worker.slice(0, 1) || '作'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{r.worker || '（作業者未記入）'}</span>
                  <span className="block truncate text-xs text-slate-500">{r.workContent || '作業内容なし'}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-blue-600">{r.rate}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
