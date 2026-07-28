'use client';

import { Item } from '@/lib/ba/types';
import { buildCompareImage, dataUrlToFile, shareOrDownload, downloadFile } from '@/lib/ba/share';
import PhotoSlot from './PhotoSlot';

export default function ItemRow({
  index,
  item,
  projectName,
  busyKind,
  onPick,
  onClear,
  notify,
}: {
  index: number;
  item: Item;
  projectName: string;
  busyKind: 'before' | 'after' | null;
  onPick: (kind: 'before' | 'after', file: File) => void;
  onClear: (kind: 'before' | 'after') => void;
  notify: (msg: string) => void;
}) {
  const no = index + 1;
  const prefix = projectName ? `${projectName}_` : '';
  const done = !!item.before && !!item.after;

  function saveOne(kind: 'before' | 'after') {
    const shot = item[kind];
    if (!shot) return;
    downloadFile(dataUrlToFile(shot.dataUrl, `${prefix}${no}_${kind}.jpg`));
    notify('保存しました');
  }

  async function shareOne(kind: 'before' | 'after') {
    const shot = item[kind];
    if (!shot) return;
    const r = await shareOrDownload(
      [dataUrlToFile(shot.dataUrl, `${prefix}${no}_${kind}.jpg`)],
      `${no}番 ${kind === 'before' ? 'ビフォー' : 'アフター'}`,
    );
    if (r === 'downloaded') notify('端末に保存しました（共有非対応のため）');
    else if (r === 'failed') notify('共有できませんでした');
  }

  async function sharePair() {
    if (!item.before || !item.after) {
      notify('ビフォーとアフターの両方が必要です');
      return;
    }
    const files = [
      dataUrlToFile(item.before.dataUrl, `${prefix}${no}_before.jpg`),
      dataUrlToFile(item.after.dataUrl, `${prefix}${no}_after.jpg`),
    ];
    const r = await shareOrDownload(files, `${no}番 ビフォー・アフター`);
    if (r === 'downloaded') notify('2枚を端末に保存しました（共有非対応のため）');
    else if (r === 'failed') notify('共有できませんでした');
  }

  async function shareCompare() {
    if (!item.before || !item.after) {
      notify('ビフォーとアフターの両方が必要です');
      return;
    }
    const url = await buildCompareImage(
      item.before.dataUrl,
      item.after.dataUrl,
      `${projectName ? projectName + '　' : ''}${no}番`,
    );
    const r = await shareOrDownload([dataUrlToFile(url, `${prefix}${no}_比較.jpg`)], `${no}番 比較`);
    if (r === 'downloaded') notify('比較画像を保存しました（共有非対応のため）');
    else if (r === 'failed') notify('共有できませんでした');
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {no}
          </span>
          <span className="text-sm font-semibold text-slate-700">{no}番</span>
        </div>
        {done && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            ✓ 完了
          </span>
        )}
      </div>

      <div className="flex gap-2.5">
        <PhotoSlot
          kind="before"
          shot={item.before}
          busy={busyKind === 'before'}
          onPick={(f) => onPick('before', f)}
          onClear={() => onClear('before')}
          onSaveOne={() => saveOne('before')}
          onShareOne={() => shareOne('before')}
        />
        <PhotoSlot
          kind="after"
          shot={item.after}
          busy={busyKind === 'after'}
          onPick={(f) => onPick('after', f)}
          onClear={() => onClear('after')}
          onSaveOne={() => saveOne('after')}
          onShareOne={() => shareOne('after')}
        />
      </div>

      {/* この番号の共有 */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          onClick={sharePair}
          disabled={!done}
          className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
        >
          2枚セットで共有
        </button>
        <button
          onClick={shareCompare}
          disabled={!done}
          className="rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 disabled:border-slate-200 disabled:text-slate-300"
        >
          比較画像で共有
        </button>
      </div>
    </div>
  );
}
