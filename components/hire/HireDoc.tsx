'use client';

import { useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { dataUrlToFile, shareTextAndFiles } from '@/lib/report';

function period(r: HireRecord): string {
  return r.dateEnd && r.dateEnd !== r.dateStart ? `${r.dateStart} 〜 ${r.dateEnd}` : r.dateStart;
}

function buildText(r: HireRecord): string {
  const lines = [
    '【作業依頼書】',
    `発注者: ${r.orderer}`,
    `作業者: ${r.worker}`,
    `作業内容: ${r.workContent || '—'}`,
    `作業場所: ${r.location || '—'}`,
    `作業日・期間: ${period(r)}`,
    `報酬額: ${r.rate || '—'}`,
    `支払条件: ${r.paymentTerms || '—'}`,
    `交通費・宿泊費: ${r.travelLodging || '—'}`,
    `確認: 発注者 ${r.ordererConfirmed ? '✓' : '未'} ／ 作業者 ${r.workerConfirmed ? '✓' : '未'}`,
  ];
  if (r.memo) lines.push(`備考: ${r.memo}`);
  return lines.join('\n');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-100 py-2">
      <span className="w-28 shrink-0 text-xs font-bold text-slate-500">{label}</span>
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
    const files: File[] = [];
    if (rec.ordererSign) files.push(dataUrlToFile(rec.ordererSign, `署名_発注者_${rec.orderer}.png`));
    if (rec.workerSign) files.push(dataUrlToFile(rec.workerSign, `署名_作業者_${rec.worker}.png`));
    const r = await shareTextAndFiles(buildText(rec), files);
    if (r === 'fallback') setMsg('コピー＆保存しました（共有シート非対応のため）');
    else if (r === 'failed') setMsg('共有できませんでした');
    if (r !== 'shared') setTimeout(() => setMsg(''), 2600);
  }

  return (
    <div className="space-y-3 pb-4">
      <button onClick={onBack} className="text-sm text-brand-primary">‹ 一覧に戻る</button>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h2 className="mb-3 text-center text-lg font-bold tracking-wide text-slate-800">作業依頼書</h2>
        <Row label="発注者" value={rec.orderer} />
        <Row label="作業者" value={rec.worker} />
        <Row label="作業内容" value={rec.workContent} />
        <Row label="作業場所" value={rec.location} />
        <Row label="作業日・期間" value={period(rec)} />
        <Row label="報酬額" value={rec.rate} />
        <Row label="支払条件" value={rec.paymentTerms} />
        <Row label="交通費・宿泊費" value={rec.travelLodging} />
        {rec.memo && <Row label="備考" value={rec.memo} />}

        {/* 署名欄 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { who: `発注者（${rec.orderer}）`, sign: rec.ordererSign, ok: rec.ordererConfirmed },
            { who: `作業者（${rec.worker}）`, sign: rec.workerSign, ok: rec.workerConfirmed },
          ].map((s) => (
            <div key={s.who} className="rounded-lg border border-slate-200 p-2">
              <p className="mb-1 text-[11px] font-bold text-slate-500">{s.who}</p>
              {s.sign ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.sign} alt="署名" className="h-16 w-full object-contain" />
              ) : (
                <div className="grid h-16 place-items-center text-[11px] text-slate-300">署名なし</div>
              )}
              <p className={`mt-1 text-center text-[10px] font-bold ${s.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                {s.ok ? '✓ 確認済み' : '未確認'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button onClick={share} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-bold text-white">
        📤 この依頼書を共有（署名画像つき）
      </button>
      {msg && <p className="text-center text-xs text-brand-primary">{msg}</p>}

      <div className="flex justify-end gap-4 text-sm">
        <button onClick={onEdit} className="text-brand-primary underline">編集</button>
        <button
          onClick={() => {
            if (confirm('この作業依頼を削除しますか？')) onDelete();
          }}
          className="text-red-500 underline"
        >
          削除
        </button>
      </div>
    </div>
  );
}
