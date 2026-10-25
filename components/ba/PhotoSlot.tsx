'use client';

// ビフォー／アフター1枠。「撮影」はスマホのカメラを起動、「アルバム」は1枚選んで取り込む

import { useEffect, useRef, useState } from 'react';
import { Shot } from '@/lib/ba/types';

type Kind = 'before' | 'after';

const STYLE: Record<Kind, { label: string; badge: string }> = {
  before: { label: 'ビフォー', badge: 'bg-fw-blue' },
  after: { label: 'アフター', badge: 'bg-fw-green' },
};

export default function PhotoSlot({
  kind,
  shot,
  busy,
  onPickFile,
  onClear,
  onSave,
}: {
  kind: Kind;
  shot: Shot | null;
  busy?: boolean;
  onPickFile: (file: File) => void;
  onClear: () => void;
  onSave: () => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
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

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onPickFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div className="min-w-0 flex-1">
      <span className={`mb-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${s.badge}`}>{s.label}</span>

      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-fw-fill">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.dataUrl} alt={s.label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2">
            <button
              onClick={() => camRef.current?.click()}
              disabled={busy}
              className="w-full rounded-lg bg-fw-ink py-2.5 text-xs font-bold text-fw-card disabled:opacity-50"
            >
              {busy ? '取り込み中…' : '📷 撮影'}
            </button>
            <button
              onClick={() => albRef.current?.click()}
              disabled={busy}
              className="w-full rounded-lg bg-fw-card py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              🖼 アルバム
            </button>
          </div>
        )}
      </div>

      {shot && (
        <div className="mt-1.5 grid gap-1.5">
          <button
            onClick={doSave}
            className={`w-full rounded-lg py-2 text-xs font-bold text-white ${saved ? 'bg-fw-green' : 'bg-fw-ink'}`}
          >
            {saved ? '✓ 保存しました' : '💾 この写真を保存'}
          </button>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => camRef.current?.click()} className="rounded-lg bg-fw-fill py-1.5 text-[11px] font-semibold">
              撮り直し
            </button>
            <button onClick={() => albRef.current?.click()} className="rounded-lg bg-fw-fill py-1.5 text-[11px] font-semibold">
              アルバム
            </button>
            <button onClick={onClear} className="rounded-lg bg-fw-fill py-1.5 text-[11px] font-semibold text-fw-red">
              削除
            </button>
          </div>
        </div>
      )}

      {/* capture でスマホ標準のカメラを起動（縦向きのまま撮影でOK。真ん中を横長5:4で切り出す） */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={albRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}
