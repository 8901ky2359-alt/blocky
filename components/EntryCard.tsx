'use client';

import { Entry } from '@/lib/types';
import { yen } from '@/lib/format';

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
  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                income ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {entry.category}
            </span>
            {entry.site && <span className="truncate text-sm text-black/60">{entry.site}</span>}
          </div>
          {showDate && <p className="mt-0.5 text-xs text-black/40">{entry.date}</p>}
          {entry.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">{entry.memo}</p>}
        </div>
        <div className={`shrink-0 text-right font-bold ${income ? 'text-blue-600' : 'text-red-600'}`}>
          {income ? '+' : '−'}
          {yen(entry.amount)}
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
