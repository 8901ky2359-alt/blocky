'use client';

// 写真の全画面プレビュー（同じ番号のビフォー／アフターを切り替えられる）。どこかをタップで閉じる

import { useEffect, useRef, useState } from 'react';
import { Item } from '@/lib/ba/types';
import { getFull } from '@/lib/ba/db';

type Kind = 'before' | 'after';
const LABEL: Record<Kind, string> = { before: 'ビフォー', after: 'アフター' };

export default function PhotoPreview({ no, item, initial, onClose }: { no: number; item: Item; initial: Kind; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>(initial);
  const shot = item[kind];
  // まず一覧用の小さい画像を出し、元の画質を読み込めたら差し替える
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!shot) return;
    let url: string | null = null;
    let alive = true;
    getFull(shot.id)
      .then((b) => {
        url = URL.createObjectURL(b);
        if (alive) setFullUrl(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      setFullUrl(null);
      if (url) URL.revokeObjectURL(url);
    };
  }, [shot]);
  // 長押しの指を離した直後のタップでは閉じない
  const openedAt = useRef(Date.now());
  const close = () => {
    if (Date.now() - openedAt.current > 400) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={close}>
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))] text-white">
        <span className="text-sm font-bold">{no}番</span>
        <div className="grid grid-cols-2 rounded-[10px] bg-white/15 p-0.5 text-sm font-semibold" onClick={(e) => e.stopPropagation()}>
          {(['before', 'after'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              disabled={!item[k]}
              className={`rounded-lg px-4 py-1.5 disabled:opacity-30 ${kind === k ? 'bg-white text-black' : ''}`}
            >
              {LABEL[k]}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-sm">
          閉じる
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fullUrl ?? shot.thumb} alt={`${no}番 ${LABEL[kind]}`} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-sm text-white/60">{LABEL[kind]}の写真はまだありません</p>
        )}
      </div>
      <p className="pb-[max(16px,env(safe-area-inset-bottom))] text-center text-xs text-white/50">タップで閉じる</p>
    </div>
  );
}
