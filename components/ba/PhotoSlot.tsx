'use client';

import { useRef } from 'react';
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
  onPick,
  onClear,
  onSaveOne,
  onShareOne,
}: {
  kind: Kind;
  shot: Shot | null;
  busy?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onSaveOne: () => void;
  onShareOne: () => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const albRef = useRef<HTMLInputElement>(null);
  const s = STYLE[kind];

  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide text-white ${s.badge}`}>
          {s.label}
        </span>
      </div>

      <div className={`relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-100 ring-1 ${s.ring}`}>
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.dataUrl} alt={s.label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
            <button
              onClick={() => camRef.current?.click()}
              disabled={busy}
              className="flex w-full max-w-[90%] items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              📷 {busy ? '処理中…' : '撮影する'}
            </button>
            <button
              onClick={() => albRef.current?.click()}
              disabled={busy}
              className="flex w-full max-w-[90%] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              🖼 アルバム
            </button>
          </div>
        )}
      </div>

      {/* 撮影後のアクション */}
      {shot && (
        <div className="mt-1.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onSaveOne}
              className="rounded-lg border border-slate-300 bg-white py-1.5 text-[11px] font-semibold text-slate-600"
            >
              保存
            </button>
            <button
              onClick={onShareOne}
              className="rounded-lg bg-slate-900 py-1.5 text-[11px] font-semibold text-white"
            >
              共有
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => camRef.current?.click()}
              className="rounded-lg py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
            >
              撮り直し
            </button>
            <button
              onClick={onClear}
              className="rounded-lg py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50"
            >
              削除
            </button>
          </div>
        </div>
      )}

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onPick(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={albRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onPick(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
