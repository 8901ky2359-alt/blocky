'use client';

import { useMemo, useState } from 'react';
import { Entry, Photo } from '@/lib/types';

type Item = { photo: Photo; entry: Entry };
type Mode = 'site' | 'ba';

export default function PhotosView({ entries }: { entries: Entry[] }) {
  const [mode, setMode] = useState<Mode>('site');
  const [zoom, setZoom] = useState<Item | null>(null);

  // 通常のギャラリー用（site全体 / receipt）
  const items = useMemo<Item[]>(() => {
    if (mode === 'ba') return [];
    const list: Item[] = [];
    for (const e of entries) {
      for (const p of e.photos) {
        if (p.photoKind === 'site') list.push({ photo: p, entry: e });
      }
    }
    return list;
  }, [entries, mode]);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.entry.date) ?? [];
      arr.push(it);
      map.set(it.entry.date, arr);
    }
    return [...map.entries()];
  }, [items]);

  // Before/After比較用: before か after を持つ記録
  const baEntries = useMemo(
    () =>
      entries.filter((e) =>
        e.photos.some((p) => p.photoKind === 'site' && (p.phase === 'before' || p.phase === 'after')),
      ),
    [entries],
  );

  const btn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`rounded-xl border py-2 text-sm font-semibold ${
        mode === m ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">写真</h2>

      <div className="grid grid-cols-2 gap-2">
        {btn('site', '🖼 現場')}
        {btn('ba', '↔ Before/After')}
      </div>

      {mode === 'ba' ? (
        baEntries.length === 0 ? (
          <Empty text="作業前/後の写真がありません" />
        ) : (
          baEntries.map((e) => {
            const before = e.photos.filter((p) => p.phase === 'before');
            const after = e.photos.filter((p) => p.phase === 'after');
            return (
              <div key={e.id} className="rounded-xl border border-black/10 bg-white p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{e.site || '（現場名なし）'}</span>
                  <span className="text-black/40">{e.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <BaColumn label="作業前" photos={before} onZoom={(p) => setZoom({ photo: p, entry: e })} />
                  <BaColumn label="作業後" photos={after} onZoom={(p) => setZoom({ photo: p, entry: e })} />
                </div>
              </div>
            );
          })
        )
      ) : groups.length === 0 ? (
        <Empty text="まだ写真がありません" />
      ) : (
        groups.map(([date, its]) => (
          <div key={date} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm text-black/50">
              <span>{date}</span>
              <span className="truncate pl-2 text-xs">{its[0].entry.site}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {its.map((it) => (
                <button key={it.photo.id} onClick={() => setZoom(it)} className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.photo.dataUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.photo.dataUrl} alt="" className="max-h-[80vh] max-w-full rounded-lg object-contain" />
          <div className="mt-3 text-center text-sm text-white/80">
            <p>
              {zoom.entry.date}　{zoom.entry.site}
            </p>
            {zoom.entry.memo && <p className="text-white/60">{zoom.entry.memo}</p>}
          </div>
          <button className="mt-4 rounded-full bg-white/20 px-6 py-2 text-white">閉じる</button>
        </div>
      )}
    </div>
  );
}

function BaColumn({
  label,
  photos,
  onZoom,
}: {
  label: string;
  photos: Photo[];
  onZoom: (p: Photo) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-center text-xs font-semibold text-black/50">{label}</p>
      {photos.length === 0 ? (
        <div className="grid aspect-square place-items-center rounded-lg bg-black/5 text-xs text-black/30">
          なし
        </div>
      ) : (
        <div className="space-y-1">
          {photos.map((p) => (
            <button key={p.id} onClick={() => onZoom(p)} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
      {text}
    </p>
  );
}
