'use client';

import { Item } from '@/lib/ba/types';
import { dataUrlToFile, downloadFile } from '@/lib/ba/share';
import { useState } from 'react';
import PhotoSlot from './PhotoSlot';
import PhotoPreview from './PhotoPreview';

// 1箇所ぶん（左ビフォー／右アフター）
export default function ItemRow({
  index,
  no: noProp,
  item,
  busyKind,
  onPickFile,
  onClear,
  notify,
}: {
  index: number;
  no?: number; // 表示する番号（看板ありのときは看板の番号）
  item: Item;
  busyKind: 'before' | 'after' | null;
  onPickFile: (kind: 'before' | 'after', file: File) => void;
  onClear: (kind: 'before' | 'after') => void;
  notify: (msg: string) => void;
}) {
  const no = noProp ?? index + 1;
  const done = !!item.before && !!item.after;
  const [preview, setPreview] = useState<'before' | 'after' | null>(null);

  function saveOne(kind: 'before' | 'after') {
    const shot = item[kind];
    if (!shot) return;
    downloadFile(dataUrlToFile(shot.dataUrl, `${no}_${kind}.jpg`));
    notify('写真を保存しました');
  }

  return (
    <div className="rounded-2xl bg-fw-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-fw-ink px-1.5 text-sm font-bold text-fw-card">{no}</span>
          <span className="text-sm font-semibold">{no}番</span>
        </span>
        {done && <span className="rounded-full bg-fw-green/15 px-2 py-0.5 text-[11px] font-bold text-fw-green">✓ 完了</span>}
      </div>

      <div className="flex gap-2.5">
        {(['before', 'after'] as const).map((kind) => (
          <PhotoSlot
            key={kind}
            kind={kind}
            shot={item[kind]}
            busy={busyKind === kind}
            onPickFile={(f) => onPickFile(kind, f)}
            onClear={() => onClear(kind)}
            onSave={() => saveOne(kind)}
            onPreview={() => setPreview(kind)}
          />
        ))}
      </div>
      {preview && <PhotoPreview no={no} item={item} initial={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
