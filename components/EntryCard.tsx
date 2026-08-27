'use client';

import { useState } from 'react';
import { Entry, Photo } from '@/lib/types';
import { formatJpDate, yen } from '@/lib/format';
import { dataUrlToFile, shareTextAndFiles } from '@/lib/report';

function photoLabel(p: Photo): string {
  if (p.photoKind === 'receipt') return 'レシート';
  if (p.phase === 'before') return 'before';
  if (p.phase === 'after') return 'after';
  return '現場';
}

// 共有テキスト（1現場の記録内容）
function buildText(e: Entry): string {
  const lines = [`【現場記録】${formatJpDate(e.date)}`];
  if (e.site) lines.push(`現場: ${e.site}`);
  if (e.address) lines.push(`住所: ${e.address}`);
  if (e.lat != null && e.lng != null) lines.push(`地図: https://www.google.com/maps?q=${e.lat},${e.lng}`);
  lines.push(`売上: ${yen(e.amount)}`);
  if (e.billTo) lines.push(`請求先: ${e.billTo}`);
  if (e.expense) lines.push(`経費: ${yen(e.expense)}`);
  if (e.memo) lines.push(`メモ: ${e.memo}`);
  return lines.join('\n');
}

export default function EntryCard({
  entry,
  onEdit,
  onDelete,
  showDate,
}: {
  entry: Entry;
  onEdit?: (e: Entry) => void;
  onDelete?: (id: string) => void;
  showDate?: boolean;
}) {
  const income = entry.kind === 'income';
  const [msg, setMsg] = useState('');

  async function share() {
    const files = entry.photos.map((p, i) =>
      dataUrlToFile(p.dataUrl, `${entry.site || '現場'}_${photoLabel(p)}_${i + 1}.jpg`),
    );
    const r = await shareTextAndFiles(buildText(entry), files);
    if (r === 'fallback') {
      setMsg('コピー＆保存しました（共有シート非対応のため）');
      setTimeout(() => setMsg(''), 2600);
    } else if (r === 'failed') {
      setMsg('共有できませんでした');
      setTimeout(() => setMsg(''), 2600);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-800">
            {entry.site || '（現場名なし）'}
          </span>
          {showDate && <p className="mt-0.5 text-xs text-slate-400">{entry.date}</p>}
          {entry.address && (
            <p className="mt-0.5 truncate text-xs text-slate-500">📍 {entry.address}</p>
          )}
          {entry.billTo && (
            <p className="mt-0.5 truncate text-xs font-semibold text-emerald-700">請求先: {entry.billTo}</p>
          )}
          {entry.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.memo}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-bold ${income ? 'text-blue-600' : 'text-red-600'}`}>
            {income ? '+' : '−'}
            {yen(entry.amount)}
          </div>
          {!!entry.expense && entry.expense > 0 && (
            <div className="text-xs font-semibold text-red-500">経費 −{yen(entry.expense)}</div>
          )}
        </div>
      </div>

      {(() => {
        const before = entry.photos.filter((p) => p.photoKind === 'site' && p.phase === 'before');
        const after = entry.photos.filter((p) => p.photoKind === 'site' && p.phase === 'after');
        const others = entry.photos.filter(
          (p) => p.photoKind === 'site' && p.phase !== 'before' && p.phase !== 'after',
        );
        const receipts = entry.photos.filter((p) => p.photoKind === 'receipt');
        const col = (list: Photo[]) =>
          list.length === 0 ? (
            <div className="grid aspect-[4/3] place-items-center rounded-md bg-slate-100 text-[11px] text-slate-400">
              なし
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.dataUrl} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
              ))}
            </div>
          );
        return (
          <div className="mt-2 space-y-2">
            {(before.length > 0 || after.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-[10px] font-bold tracking-wide text-blue-600">BEFORE（作業前）</p>
                  {col(before)}
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold tracking-wide text-emerald-600">AFTER（作業後）</p>
                  {col(after)}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {others.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.dataUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                ))}
              </div>
            )}
            {receipts.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-500">レシート・購入品</p>
                <div className="flex gap-1.5 overflow-x-auto">
                  {receipts.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.id} src={p.dataUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 共有（日付・現場・住所・位置・金額・経費＋全写真をまとめて） */}
      <button
        onClick={share}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 text-sm font-bold text-white"
      >
        <span className="text-base leading-none">📤</span> 共有する
        {entry.photos.length > 0 ? `（写真${entry.photos.length}枚つき）` : ''}
      </button>
      {msg && <p className="mt-1 text-center text-xs text-brand-primary">{msg}</p>}

      {(onEdit || onDelete) && (
        <div className="mt-2 flex justify-end gap-3 text-xs text-slate-400">
          {onEdit && (
            <button onClick={() => onEdit(entry)} className="underline">
              編集
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('この記録を削除しますか？')) onDelete(entry.id);
              }}
              className="text-red-500 underline"
            >
              削除
            </button>
          )}
        </div>
      )}
    </div>
  );
}
