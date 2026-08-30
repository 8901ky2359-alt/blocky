'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { byDateInfo, summarize } from '@/lib/finance';
import { sendToNotion } from '@/lib/notion';
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
  const [notionBusy, setNotionBusy] = useState(false);
  const [notionMsg, setNotionMsg] = useState('');

  async function sendDay() {
    setNotionBusy(true);
    setNotionMsg('');
    try {
      const r = await sendToNotion(selectedEntries);
      if (r.ok) setNotionMsg(`✓ Notionに${r.created}件保存しました`);
      else if (r.error === 'not-configured')
        setNotionMsg('Notion連携が未設定です（設定手順をお伝えします）');
      else if (r.error === 'offline') setNotionMsg('ネットに接続できませんでした');
      else setNotionMsg('保存できませんでした');
    } finally {
      setNotionBusy(false);
    }
  }

  const byDate = useMemo(() => byDateInfo(entries), [entries]);

  const monthTotals = useMemo(
    () => summarize(entries.filter((e) => e.date.slice(0, 7) === mKey)),
    [entries, mKey],
  );

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

      {/* 月サマリー（収支） */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-black/5 text-center">
          <div className="px-1">
            <p className="text-[11px] text-black/50">売上</p>
            <p className="text-sm font-bold text-blue-600">{yen(monthTotals.income)}</p>
          </div>
          <div className="px-1">
            <p className="text-[11px] text-black/50">経費(自己負担)</p>
            <p className="text-sm font-bold text-red-500">−{yen(monthTotals.selfExpense)}</p>
          </div>
          <div className="px-1">
            <p className="text-[11px] text-black/50">差引</p>
            <p className="text-sm font-bold text-brand-primary">{yen(monthTotals.net)}</p>
          </div>
        </div>
        {monthTotals.reimburseExpense > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-center text-[11px] text-amber-700">
            常駐の立替経費 {yen(monthTotals.reimburseExpense)}（中野さんに請求／差引ゼロ）
          </p>
        )}
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
                className={`flex min-h-[74px] flex-col items-center rounded-lg px-0.5 py-1 text-xs ${
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
                  {info?.koyo ? (
                    <span className="w-full truncate text-center text-[10px] font-semibold text-indigo-600">
                      雇{manYen(info.koyo)}
                    </span>
                  ) : null}
                  {info?.expense ? (
                    <span className="w-full truncate text-center text-[9px] font-semibold text-red-400">
                      経{manYen(info.expense)}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-black/50">
        <span>
          <span className="font-bold text-blue-600">請</span> = 請負
        </span>
        <span>
          <span className="font-bold text-emerald-600">常</span> = 常駐
        </span>
        <span>
          <span className="font-bold text-indigo-600">雇</span> = 雇用
        </span>
        <span>
          <span className="font-bold text-red-400">経</span> = 経費
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
            <>
              {selectedEntries.map((e) => (
                <EntryCard key={e.id} entry={e} onEdit={onEdit} onDelete={onDelete} />
              ))}
              <button
                onClick={sendDay}
                disabled={notionBusy}
                className="w-full rounded-lg border border-slate-800 bg-white py-2.5 text-sm font-bold text-slate-800 disabled:opacity-50"
              >
                {notionBusy ? '送信中…' : `📥 この日の記録をNotionに保存（${selectedEntries.length}件）`}
              </button>
              {notionMsg && <p className="text-center text-xs text-brand-primary">{notionMsg}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
