'use client';

import { useState } from 'react';
import { SiteSeed, SiteState } from '@/lib/list/types';
import { dataUrlToFile, shareOrDownload } from '@/lib/ba/share';
import PhotoColumn from './PhotoColumn';

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// 共有テキスト（工番・物件名・住所・地図）
function buildText(site: SiteSeed, state: SiteState): string {
  const lines = [`【現場】${site.name}（工番${site.workNo}）`];
  lines.push(`住所: ${site.address}`);
  lines.push(`地図: ${mapsUrl(site.lat, site.lng)}`);
  lines.push(`鍵: ${site.hasKey ? '有' : '無'} / 地積: ${site.area}㎡`);
  lines.push(`状態: ${state.done ? '✅ 作業完了' : '⬜ 未完了'}`);
  return lines.join('\n');
}

export default function SiteCard({
  site,
  state,
  onToggleDone,
  onAddPhoto,
  onRemovePhoto,
}: {
  site: SiteSeed;
  state: SiteState;
  onToggleDone: () => void;
  onAddPhoto: (side: 'before' | 'after', dataUrl: string) => void;
  onRemovePhoto: (side: 'before' | 'after', index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  async function share() {
    // 左＝ビフォー、右＝アフターの順にファイル名を付けて共有
    const files = [
      ...state.before.map((u, i) => dataUrlToFile(u, `${site.workNo}_before_${i + 1}.jpg`)),
      ...state.after.map((u, i) => dataUrlToFile(u, `${site.workNo}_after_${i + 1}.jpg`)),
    ];
    const r = await shareOrDownload(files, buildText(site, state));
    if (r === 'downloaded') {
      setMsg('共有シート非対応のため画像を保存しました');
      setTimeout(() => setMsg(''), 2600);
    } else if (r === 'failed') {
      setMsg('共有できませんでした');
      setTimeout(() => setMsg(''), 2600);
    }
  }

  const hasPhotos = state.before.length > 0 || state.after.length > 0;

  return (
    <div
      className={`rounded-xl border bg-white shadow-card ${
        state.done ? 'border-emerald-300' : 'border-slate-200'
      }`}
    >
      {/* ヘッダー行 */}
      <div className="flex items-start gap-2 p-3">
        {/* 完了トグル */}
        <button
          onClick={onToggleDone}
          aria-label={state.done ? '未完了に戻す' : '完了にする'}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 text-sm font-black ${
            state.done
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-300 bg-white text-transparent'
          }`}
        >
          ✓
        </button>

        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-800">{site.name}</span>
            {site.priority && (
              <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                優先
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">工番 {site.workNo}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">📍 {site.address}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={`rounded px-1.5 py-0.5 font-bold ${
                site.hasKey ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              鍵 {site.hasKey ? '有' : '無'}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{site.area}㎡</span>
            {hasPhotos && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
                📷 前{state.before.length}・後{state.after.length}
              </span>
            )}
            {state.done && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">完了</span>
            )}
          </div>
        </button>

        {/* Googleマップ */}
        <a
          href={mapsUrl(site.lat, site.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px] font-bold text-slate-600"
        >
          🗺<br />地図
        </a>
      </div>

      {/* 展開：ビフォーアフター＋共有 */}
      {open && (
        <div className="border-t border-slate-100 p-3">
          <div className="grid grid-cols-2 gap-2">
            <PhotoColumn
              title="ビフォー（作業前）"
              color="before"
              photos={state.before}
              onAdd={(u) => onAddPhoto('before', u)}
              onRemove={(i) => onRemovePhoto('before', i)}
            />
            <PhotoColumn
              title="アフター（作業後）"
              color="after"
              photos={state.after}
              onAdd={(u) => onAddPhoto('after', u)}
              onRemove={(i) => onRemovePhoto('after', i)}
            />
          </div>

          <button
            onClick={share}
            disabled={!hasPhotos}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            📤 共有する
            {hasPhotos ? `（写真${state.before.length + state.after.length}枚）` : '（写真を追加してください）'}
          </button>
          {msg && <p className="mt-1 text-center text-xs text-brand-primary">{msg}</p>}

          <a
            href={mapsUrl(site.lat, site.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600"
          >
            🗺 Googleマップで開く（{site.lat.toFixed(5)}, {site.lng.toFixed(5)}）
          </a>
        </div>
      )}
    </div>
  );
}
