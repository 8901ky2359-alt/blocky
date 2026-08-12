'use client';

import { useEffect, useMemo, useState } from 'react';
import { Entry, workTypeOf } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';
import { dataUrlToFile, shareTextAndFiles } from '@/lib/report';

function shortDate(d: string) {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
}

function buildText(mKey: string, list: Entry[]): string {
  const lines = [`【経費報告】${formatJpMonth(mKey)}`];
  let self = 0;
  let reimburse = 0;
  for (const e of list) {
    const tag = workTypeOf(e) === '常駐' ? '（立替）' : '';
    lines.push(`${shortDate(e.date)} ${e.category || '経費'} ${yen(e.amount)}${tag}`);
    if (workTypeOf(e) === '常駐') reimburse += e.amount;
    else self += e.amount;
  }
  lines.push(`合計 ${yen(self + reimburse)}`);
  if (reimburse > 0) lines.push(`（自己負担 ${yen(self)} ／ 立替・要請求 ${yen(reimburse)}）`);
  return lines.join('\n');
}

export default function ExpenseReport({ entries }: { entries: Entry[] }) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');

  const monthExpenses = useMemo(
    () =>
      entries
        .filter((e) => e.kind === 'expense' && e.date.slice(0, 7) === mKey)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries, mKey],
  );

  // 月を変えたら選択はその月の全件を初期選択
  const monthKeyIds = monthExpenses.map((e) => e.id).join(',');
  useEffect(() => {
    setSel(new Set(monthKeyIds ? monthKeyIds.split(',') : []));
  }, [monthKeyIds]);

  const selected = monthExpenses.filter((e) => sel.has(e.id));
  const selTotal = selected.reduce((s, e) => s + e.amount, 0);
  const photoCount = selected.reduce((n, e) => n + e.photos.filter((p) => p.photoKind === 'receipt').length, 0);

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function share() {
    if (selected.length === 0) return;
    const files = selected.flatMap((e) =>
      e.photos
        .filter((p) => p.photoKind === 'receipt')
        .map((p, i) => dataUrlToFile(p.dataUrl, `${e.date}_${e.category || '経費'}_${i + 1}.jpg`)),
    );
    const r = await shareTextAndFiles(buildText(mKey, selected), files);
    if (r === 'fallback') setMsg('コピー＆保存しました（共有シート非対応のため）');
    else if (r === 'failed') setMsg('共有できませんでした');
    if (r !== 'shared') setTimeout(() => setMsg(''), 2600);
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="rounded-lg px-3 py-1 text-lg">
          ‹
        </button>
        <h2 className="text-lg font-bold">{formatJpMonth(mKey)} の経費報告</h2>
        <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="rounded-lg px-3 py-1 text-lg">
          ›
        </button>
      </div>

      <div className="rounded-2xl bg-brand-primary p-4 text-white shadow">
        <p className="text-sm opacity-80">選択した経費の合計</p>
        <p className="text-3xl font-bold">{yen(selTotal)}</p>
        <p className="mt-1 text-xs opacity-70">
          {selected.length}件／レシート写真 {photoCount}枚
        </p>
      </div>

      {monthExpenses.length > 0 && (
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setSel(new Set(monthExpenses.map((e) => e.id)))}
            className="rounded-lg border border-black/15 px-3 py-1.5 font-semibold text-black/60"
          >
            すべて選択
          </button>
          <button
            onClick={() => setSel(new Set())}
            className="rounded-lg border border-black/15 px-3 py-1.5 font-semibold text-black/60"
          >
            選択解除
          </button>
        </div>
      )}

      {monthExpenses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
          この月の経費はありません
        </p>
      ) : (
        <div className="space-y-2">
          {monthExpenses.map((e) => {
            const on = sel.has(e.id);
            const receipts = e.photos.filter((p) => p.photoKind === 'receipt');
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                className={`flex w-full items-center gap-2 rounded-xl border bg-white p-3 text-left shadow-card ${
                  on ? 'border-brand-primary ring-1 ring-brand-primary/30' : 'border-slate-200'
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-xs font-black ${
                    on ? 'border-brand-primary bg-brand-primary text-white' : 'border-slate-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">
                    {shortDate(e.date)} {e.category || '経費'}
                  </span>
                  {e.memo && <span className="block truncate text-xs text-slate-500">{e.memo}</span>}
                  {receipts.length > 0 && (
                    <span className="text-[10px] text-blue-600">📷 レシート{receipts.length}枚</span>
                  )}
                </span>
                <span className="shrink-0 text-right font-bold text-red-600">− {yen(e.amount)}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={share}
        disabled={selected.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-bold text-white disabled:opacity-40"
      >
        📤 選んだ経費を報告（{selected.length}件{photoCount > 0 ? `・写真${photoCount}枚` : ''}）
      </button>
      {msg && <p className="text-center text-xs text-brand-primary">{msg}</p>}
    </div>
  );
}
