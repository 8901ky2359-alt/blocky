'use client';

import { Item } from '@/lib/ba/types';
import { dataUrlToFile, downloadFile } from '@/lib/ba/share';
import PhotoSlot from './PhotoSlot';

export default function ItemRow({
  index,
  item,
  busyKind,
  onRequestCamera,
  onPickFile,
  onClear,
  notify,
}: {
  index: number;
  item: Item;
  busyKind: 'before' | 'after' | null;
  onRequestCamera: (kind: 'before' | 'after') => void;
  onPickFile: (kind: 'before' | 'after', file: File) => void;
  onClear: (kind: 'before' | 'after') => void;
  notify: (msg: string) => void;
}) {
  const no = index + 1;
  const done = !!item.before && !!item.after;

  function saveOne(kind: 'before' | 'after') {
    const shot = item[kind];
    if (!shot) return;
    downloadFile(dataUrlToFile(shot.dataUrl, `${no}_${kind}.jpg`));
    notify('写真を保存しました');
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-slate-900 text-sm font-bold text-white">
            {no}
          </span>
          <span className="text-sm font-semibold text-slate-700">{no}番</span>
        </div>
        {done && (
          <span className="rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            ✓ 完了
          </span>
        )}
      </div>

      <div className="flex gap-2.5">
        <PhotoSlot
          kind="before"
          shot={item.before}
          busy={busyKind === 'before'}
          onRequestCamera={() => onRequestCamera('before')}
          onPickFile={(f) => onPickFile('before', f)}
          onClear={() => onClear('before')}
          onSave={() => saveOne('before')}
        />
        <PhotoSlot
          kind="after"
          shot={item.after}
          busy={busyKind === 'after'}
          onRequestCamera={() => onRequestCamera('after')}
          onPickFile={(f) => onPickFile('after', f)}
          onClear={() => onClear('after')}
          onSave={() => saveOne('after')}
        />
      </div>
    </div>
  );
}
