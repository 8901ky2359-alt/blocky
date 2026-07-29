'use client';

import { useRef, useState } from 'react';
import { toFiveFour } from '@/lib/ba/image';

// ビフォー or アフターの1列（撮影＋アルバム添付／サムネイル／削除）
export default function PhotoColumn({
  title,
  color,
  photos,
  onAdd,
  onRemove,
}: {
  title: string;
  color: 'before' | 'after';
  photos: string[];
  onAdd: (dataUrl: string) => void;
  onRemove: (index: number) => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const albRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const head = color === 'before' ? 'text-blue-700' : 'text-emerald-700';
  const band = color === 'before' ? 'bg-blue-600' : 'bg-emerald-600';
  const soft = color === 'before' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50';

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        const url = await toFiveFour(f);
        onAdd(url);
      }
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = '';
      if (albRef.current) albRef.current.value = '';
    }
  }

  return (
    <div className={`rounded-xl border p-2 ${soft}`}>
      <div className={`mb-2 flex items-center justify-between text-[11px] font-bold tracking-wide ${head}`}>
        <span>{title}</span>
        <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px]">{photos.length}枚</span>
      </div>

      {/* サムネイル（5:4） */}
      <div className="space-y-2">
        {photos.map((url, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="aspect-[5/4] w-full rounded-lg object-cover" />
            <button
              onClick={() => onRemove(i)}
              aria-label="削除"
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white"
            >
              ×
            </button>
            <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white ${band}`}>
              {color === 'before' ? 'BEFORE' : 'AFTER'}
            </span>
          </div>
        ))}
        {photos.length === 0 && (
          <div className="grid aspect-[5/4] place-items-center rounded-lg border border-dashed border-black/15 bg-white/50 text-[11px] text-black/40">
            写真なし
          </div>
        )}
      </div>

      {/* 撮影／アルバム */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => camRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-brand-primary py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          📷 撮影
        </button>
        <button
          onClick={() => albRef.current?.click()}
          disabled={busy}
          className="rounded-lg border border-black/20 bg-white py-2 text-[12px] font-bold text-slate-700 disabled:opacity-50"
        >
          🖼 アルバム
        </button>
      </div>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={albRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy && <p className="mt-1 text-center text-[10px] text-black/40">処理中…</p>}
    </div>
  );
}
