'use client';

import { useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { formatJpDate, yen } from '@/lib/format';
import { shareTextAndFiles } from '@/lib/report';

function buildText(r: HireRecord): string {
  const lines = [
    `【雇用記録】${formatJpDate(r.date)}`,
    `名前: ${r.name}`,
    `現場: ${r.site || '—'}`,
    `発注元・請求先: ${r.client || '—'}`,
    `金額: ${yen(r.amount)}`,
  ];
  if (r.memo) lines.push(`メモ: ${r.memo}`);
  return lines.join('\n');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-100 py-2">
      <span className="w-20 shrink-0 text-xs font-bold text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-slate-800">{value || '—'}</span>
    </div>
  );
}

export default function HireDoc({
  rec,
  onEdit,
  onDelete,
  onBack,
}: {
  rec: HireRecord;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [msg, setMsg] = useState('');

  async function share() {
    const r = await shareTextAndFiles(buildText(rec), []);
    if (r === 'fallback') setMsg('コピーしました');
    else if (r === 'failed') setMsg('共有できませんでした');
    if (r !== 'shared') setTimeout(() => setMsg(''), 2600);
  }

  return (
    <div className="space-y-3 pb-4">
      <button onClick={onBack} className="text-sm text-brand-primary">‹ 戻る</button>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-2 text-right">
          <span className="text-2xl font-bold text-blue-600">{yen(rec.amount)}</span>
        </div>
        <Row label="日付" value={formatJpDate(rec.date)} />
        <Row label="名前" value={rec.name} />
        <Row label="現場名" value={rec.site} />
        <Row label="発注元・請求先" value={rec.client || ''} />
        {rec.memo && <Row label="メモ" value={rec.memo} />}
      </div>

      <button onClick={share} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-bold text-white">
        📤 共有する
      </button>
      {msg && <p className="text-center text-xs text-brand-primary">{msg}</p>}

      <div className="flex justify-end gap-4 text-sm">
        <button onClick={onEdit} className="text-brand-primary underline">編集</button>
        <button
          onClick={() => {
            if (confirm('この記録を削除しますか？')) onDelete();
          }}
          className="text-red-500 underline"
        >
          削除
        </button>
      </div>
    </div>
  );
}
