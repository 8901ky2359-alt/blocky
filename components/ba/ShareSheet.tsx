'use client';

import { useMemo, useState } from 'react';
import { Project } from '@/lib/ba/types';
import { buildCompareImage, dataUrlToFile, shareOrDownload } from '@/lib/ba/share';

type Cell = { i: number; kind: 'before' | 'after'; url: string };

export default function ShareSheet({
  project,
  onClose,
  notify,
}: {
  project: Project;
  onClose: () => void;
  notify: (msg: string) => void;
}) {
  const cells = useMemo<Cell[]>(() => {
    const list: Cell[] = [];
    project.items.forEach((it, i) => {
      if (it.before) list.push({ i, kind: 'before', url: it.before.dataUrl });
      if (it.after) list.push({ i, kind: 'after', url: it.after.dataUrl });
    });
    return list;
  }, [project.items]);

  const key = (c: { i: number; kind: string }) => `${c.i}:${c.kind}`;
  const [sel, setSel] = useState<Set<string>>(() => new Set(cells.map(key)));
  const [busy, setBusy] = useState(false);

  const p = project.name ? `${project.name}_` : '';
  const toggle = (k: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const selectAll = () => setSel(new Set(cells.map(key)));
  const clear = () => setSel(new Set());
  const pairsOnly = () => {
    const n = new Set<string>();
    project.items.forEach((it, i) => {
      if (it.before && it.after) {
        n.add(`${i}:before`);
        n.add(`${i}:after`);
      }
    });
    setSel(n);
  };

  const selectedCells = cells.filter((c) => sel.has(key(c)));

  async function shareSelected() {
    if (selectedCells.length === 0) return;
    setBusy(true);
    try {
      const files = selectedCells.map((c) =>
        dataUrlToFile(c.url, `${p}${c.i + 1}_${c.kind}.jpg`),
      );
      const r = await shareOrDownload(files, `${project.name || '現場'} ビフォーアフター`);
      if (r === 'downloaded') notify(`${files.length}枚を保存しました（共有非対応のため）`);
      else if (r === 'failed') notify('共有できませんでした');
      else onClose();
    } finally {
      setBusy(false);
    }
  }

  async function shareCompare() {
    // 両方選択されている番号のみ比較画像に
    const nums = project.items
      .map((it, i) => i)
      .filter((i) => sel.has(`${i}:before`) && sel.has(`${i}:after`));
    if (nums.length === 0) {
      notify('比較画像には、番号ごとにビフォーとアフターの両方を選んでください');
      return;
    }
    setBusy(true);
    try {
      const files: File[] = [];
      for (const i of nums) {
        const it = project.items[i];
        const url = await buildCompareImage(
          it.before!.dataUrl,
          it.after!.dataUrl,
          `${project.name ? project.name + '　' : ''}${i + 1}番`,
        );
        files.push(dataUrlToFile(url, `${p}${i + 1}_比較.jpg`));
      }
      const r = await shareOrDownload(files, `${project.name || '現場'} 比較画像`);
      if (r === 'downloaded') notify(`${files.length}枚の比較画像を保存しました`);
      else if (r === 'failed') notify('共有できませんでした');
      else onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/50" onClick={onClose}>
      <div className="mt-auto max-h-[88dvh] overflow-hidden bg-slate-50" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダ */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">共有する写真を選ぶ</h3>
          <button onClick={onClose} className="px-2 text-sm font-semibold text-slate-500">
            ✕
          </button>
        </div>

        {/* クイック選択 */}
        <div className="flex gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs">
          <button onClick={selectAll} className="rounded-none bg-slate-900 px-3 py-1.5 font-semibold text-white">
            すべて
          </button>
          <button onClick={pairsOnly} className="rounded-none border border-slate-300 px-3 py-1.5 font-semibold text-slate-600">
            完了ペアのみ
          </button>
          <button onClick={clear} className="rounded-none border border-slate-300 px-3 py-1.5 font-semibold text-slate-600">
            クリア
          </button>
          <span className="ml-auto self-center font-semibold text-slate-500">{sel.size}枚 選択中</span>
        </div>

        {/* 写真グリッド */}
        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: '48dvh' }}>
          {cells.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">共有できる写真がありません</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {cells.map((c) => {
                const k = key(c);
                const on = sel.has(k);
                const isB = c.kind === 'before';
                return (
                  <button
                    key={k}
                    onClick={() => toggle(k)}
                    className={`relative overflow-hidden rounded-sm border-2 ${
                      on ? (isB ? 'border-blue-600' : 'border-emerald-600') : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" className="aspect-[5/4] w-full object-cover" />
                    <span
                      className={`absolute left-1 top-1 rounded-sm px-1 py-0.5 text-[9px] font-bold text-white ${
                        isB ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                    >
                      {c.i + 1}・{isB ? 'B' : 'A'}
                    </span>
                    <span
                      className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-sm text-[11px] font-bold ${
                        on ? 'bg-white text-slate-900' : 'bg-black/30 text-white/70'
                      }`}
                    >
                      {on ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* アクション */}
        <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
          <button
            onClick={shareSelected}
            disabled={busy || sel.size === 0}
            className="w-full rounded-none bg-slate-900 py-3.5 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
          >
            選んだ写真を共有（{sel.size}枚）
          </button>
          <button
            onClick={shareCompare}
            disabled={busy}
            className="w-full rounded-none border border-slate-300 py-3 text-sm font-bold text-slate-700"
          >
            比較画像にまとめて共有（ペア）
          </button>
        </div>
      </div>
    </div>
  );
}
