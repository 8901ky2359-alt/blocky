'use client';

import { useEffect, useRef, useState } from 'react';
import { Shot } from '@/lib/ba/types';

type Kind = 'before' | 'after';

const STYLE: Record<Kind, { label: string; badge: string; ring: string }> = {
  before: { label: 'BEFORE', badge: 'bg-blue-600', ring: 'ring-blue-200' },
  after: { label: 'AFTER', badge: 'bg-emerald-600', ring: 'ring-emerald-200' },
};

export default function PhotoSlot({
  kind,
  shot,
  busy,
  onRequestCamera,
  onPickFile,
  onClear,
  onSave,
}: {
  kind: Kind;
  shot: Shot | null;
  busy?: boolean;
  onRequestCamera: () => void;
  onPickFile: (file: File) => void;
  onClear: () => void;
  onSave: () => void;
}) {
  const albRef = useRef<HTMLInputElement>(null);
  const s = STYLE[kind];
  const [saved, setSaved] = useState(false);
  const savedT = useRef<number>();

  // 写真が変わったら保存完了表示をリセット
  useEffect(() => {
    setSaved(false);
  }, [shot?.dataUrl]);

  function doSave() {
    onSave();
    setSaved(true);
    window.clearTimeout(savedT.current);
    savedT.current = window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="flex-1">
      <div className="mb-1.5">
        <span className={`rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-wide text-white ${s.badge}`}>
          {s.label}
        </span>
      </div>

      <div className={`relative aspect-[5/4] overflow-hidden rounded-sm bg-slate-100 ring-1 ${s.ring}`}>
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.dataUrl} alt={s.label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
            <button
              onClick={onRequestCamera}
              disabled={busy}
              className="w-full max-w-[92%] rounded-none bg-slate-900 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              📷 {busy ? '処理中…' : '撮影する'}
            </button>
            <button
              onClick={() => albRef.current?.click()}
              disabled={busy}
              className="w-full max-w-[92%] rounded-none border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              🖼 アルバム
            </button>
          </div>
        )}
      </div>

      {shot && (
        <div className="mt-1.5 space-y-1.5">
          <button
            onClick={doSave}
            className={`w-full rounded-none py-2 text-xs font-bold text-white transition ${
              saved ? 'bg-emerald-600' : 'bg-slate-900'
            }`}
          >
            {saved ? '✓ 保存しました' : '💾 この写真を保存'}
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onRequestCamera}
              className="rounded-none border border-slate-300 py-1.5 text-[11px] font-semibold text-slate-600"
            >
              撮り直し
            </button>
            <button
              onClick={onClear}
              className="rounded-none border border-rose-200 py-1.5 text-[11px] font-semibold text-rose-500"
            >
              削除
            </button>
          </div>
        </div>
      )}

      <input
        ref={albRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onPickFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
