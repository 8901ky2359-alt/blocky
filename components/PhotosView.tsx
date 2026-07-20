'use client';

import { useMemo, useState } from 'react';
import { Entry, Photo, PhotoKind } from '@/lib/types';

type Item = { photo: Photo; entry: Entry };

export default function PhotosView({ entries }: { entries: Entry[] }) {
  const [filter, setFilter] = useState<PhotoKind>('site');
  const [zoom, setZoom] = useState<Item | null>(null);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    for (const e of entries) {
      for (const p of e.photos) {
        if (p.photoKind === filter) list.push({ photo: p, entry: e });
      }
    }
    return list;
  }, [entries, filter]);

  // 日付ごとにグループ化
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.entry.date) ?? [];
      arr.push(it);
      map.set(it.entry.date, arr);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">写真</h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setFilter('site')}
          className={`rounded-xl border py-2 text-sm font-semibold ${
            filter === 'site' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          🖼 現場写真
        </button>
        <button
          onClick={() => setFilter('receipt')}
          className={`rounded-xl border py-2 text-sm font-semibold ${
            filter === 'receipt' ? 'border-brand-primary bg-brand-soft' : 'border-black/10 text-black/50'
          }`}
        >
          🧾 レシート
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
          まだ写真がありません
        </p>
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
            <p>{zoom.entry.date}　{zoom.entry.site}</p>
            {zoom.entry.memo && <p className="text-white/60">{zoom.entry.memo}</p>}
          </div>
          <button className="mt-4 rounded-full bg-white/20 px-6 py-2 text-white">閉じる</button>
        </div>
      )}
    </div>
  );
}
