'use client';

import { Entry, Photo } from '@/lib/types';
import { yen } from '@/lib/format';
import { dataUrlToFile, downloadFile, shareFiles } from '@/lib/report';

function photoLabel(p: Photo): string {
  if (p.photoKind === 'receipt') return 'レシート';
  if (p.phase === 'before') return 'before';
  if (p.phase === 'after') return 'after';
  return '現場';
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

  async function shareAllPhotos() {
    if (entry.photos.length === 0) return;
    const base = entry.site || '現場';
    const files = entry.photos.map((p, i) =>
      dataUrlToFile(p.dataUrl, `${base}_${photoLabel(p)}_${i + 1}.jpg`),
    );
    const r = await shareFiles(files, base);
    if (r !== 'shared') files.forEach(downloadFile);
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{entry.site || '（現場名なし）'}</span>
          </div>
          {showDate && <p className="mt-0.5 text-xs text-black/40">{entry.date}</p>}
          {entry.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">{entry.memo}</p>}
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

      {entry.photos.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {entry.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.dataUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {entry.photos.length > 0 && (
        <button
          onClick={shareAllPhotos}
          className="mt-2 w-full rounded-lg bg-brand-primary py-2 text-xs font-bold text-white"
        >
          📷 この現場の写真を共有（{entry.photos.length}枚・Before/After・レシート）
        </button>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-2 flex justify-end gap-3 text-xs text-black/50">
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
