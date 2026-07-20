'use client';

import { useRef, useState } from 'react';
import { Photo, PhotoKind, PhotoPhase } from '@/lib/types';
import { fileToCompressedDataUrl } from '@/lib/image';
import { uid } from '@/lib/format';

export default function PhotoInput({
  photos,
  photoKind,
  phase,
  onChange,
  label,
}: {
  photos: Photo[];
  photoKind: PhotoKind;
  phase?: PhotoPhase;
  onChange: (next: Photo[]) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added: Photo[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await fileToCompressedDataUrl(file);
        added.push({ id: uid(), photoKind, phase, dataUrl });
      }
      onChange([...photos, ...added]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.dataUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-black/70 text-xs text-white"
              aria-label="削除"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-primary/50 text-xs text-brand-primary"
        >
          <span className="text-2xl leading-none">＋</span>
          <span>{busy ? '処理中…' : label}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
