'use client';

import { Entry, workTypeOf } from '@/lib/types';
import { yen } from '@/lib/format';

export default function ExpenseCard({
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
  const receipts = entry.photos.filter((p) => p.photoKind === 'receipt');
  const jouchu = workTypeOf(entry) === '常駐';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-800">{entry.category || '経費'}</span>
          {showDate && <p className="mt-0.5 text-xs text-slate-400">{entry.date}</p>}
          <span
            className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
              jouchu ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {jouchu ? '立替（常駐・要請求）' : '自己負担（請負）'}
          </span>
          {entry.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.memo}</p>}
        </div>
        <div className="shrink-0 text-right font-bold text-red-600">− {yen(entry.amount)}</div>
      </div>

      {receipts.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {receipts.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.dataUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
          ))}
        </div>
      )}

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
                if (confirm('この経費を削除しますか？')) onDelete(entry.id);
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
