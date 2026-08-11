'use client';

import { useMemo, useRef, useState } from 'react';
import { Project, Shot } from '@/lib/ba/types';
import { toFiveFour } from '@/lib/ba/image';
import { dataUrlToFile, shareOrDownload } from '@/lib/ba/share';
import { getQuality, qualityParams } from '@/lib/ba/quality';
import ItemRow from './ItemRow';
import Camera from './Camera';
import ShareSheet from './ShareSheet';

type Target = { index: number; kind: 'before' | 'after' };

export default function WorkScreen({
  project,
  onSetShot,
  onSetName,
  onReset,
}: {
  project: Project;
  onSetShot: (index: number, kind: 'before' | 'after', shot: Shot | null) => void;
  onSetName: (name: string) => void;
  onReset: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [camTarget, setCamTarget] = useState<Target | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const nativeRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Target | null>(null);
  const toastT = useRef<number>();

  function notify(msg: string) {
    setToast(msg);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2400);
  }

  async function handlePick(index: number, kind: 'before' | 'after', file: File) {
    const k = `${index}:${kind}`;
    setBusy(k);
    try {
      const { maxW, jpeg } = qualityParams(getQuality());
      const dataUrl = await toFiveFour(file, maxW, jpeg);
      onSetShot(index, kind, { dataUrl });
    } catch {
      notify('写真を読み込めませんでした');
    } finally {
      setBusy(null);
    }
  }

  function onCameraCapture(file: File) {
    const t = camTarget;
    setCamTarget(null);
    if (t) handlePick(t.index, t.kind, file);
  }
  function onCameraFallback() {
    pendingRef.current = camTarget;
    setCamTarget(null);
    nativeRef.current?.click();
  }

  // すべての写真を一括保存（iPhone: 共有シートの「画像を保存」で全枚数をまとめて保存 / PC: 一括ダウンロード）
  async function saveAll() {
    const prefix = project.name ? `${project.name}_` : '';
    const files: File[] = [];
    project.items.forEach((it, i) => {
      if (it.before) files.push(dataUrlToFile(it.before.dataUrl, `${prefix}${i + 1}_before.jpg`));
      if (it.after) files.push(dataUrlToFile(it.after.dataUrl, `${prefix}${i + 1}_after.jpg`));
    });
    if (files.length === 0) {
      notify('保存できる写真がありません');
      return;
    }
    setSaving(true);
    try {
      const r = await shareOrDownload(files);
      if (r === 'downloaded') notify(`${files.length}枚を保存しました`);
      else if (r === 'failed') notify('保存できませんでした');
      // shared の場合はiOS側で「画像を保存」を選ぶと全枚数がカメラロールへ保存される
    } finally {
      setSaving(false);
    }
  }

  const doneCount = useMemo(
    () => project.items.filter((it) => it.before && it.after).length,
    [project.items],
  );
  const totalShots = useMemo(
    () => project.items.reduce((n, it) => n + (it.before ? 1 : 0) + (it.after ? 1 : 0), 0),
    [project.items],
  );

  return (
    <div className="min-h-[100dvh] pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={project.name}
              onChange={(e) => onSetName(e.target.value)}
              placeholder="案件名・現場名（任意）"
              className="min-w-0 flex-1 rounded-none border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
            <button
              onClick={onReset}
              className="shrink-0 rounded-none border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
            >
              新規
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-none bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(doneCount / project.count) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              完了 {doneCount}/{project.count}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {project.items.map((it, i) => (
          <ItemRow
            key={i}
            index={i}
            item={it}
            busyKind={busy === `${i}:before` ? 'before' : busy === `${i}:after` ? 'after' : null}
            onRequestCamera={(kind) => setCamTarget({ index: i, kind })}
            onPickFile={(kind, file) => handlePick(i, kind, file)}
            onClear={(kind) => onSetShot(i, kind, null)}
            notify={notify}
          />
        ))}
      </div>

      {/* 下部の保存・共有バー */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2 px-4 py-3">
          <button
            onClick={saveAll}
            disabled={saving || totalShots === 0}
            className="rounded-none border-2 border-slate-900 py-4 text-base font-bold text-slate-900 active:scale-[.99] disabled:border-slate-200 disabled:text-slate-300"
          >
            {saving ? '保存中…' : `📥 すべて保存（${totalShots}枚）`}
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="rounded-none bg-slate-900 py-4 text-base font-bold text-white shadow-lg active:scale-[.99]"
          >
            共有する（{totalShots}枚）
          </button>
        </div>
      </div>

      {/* アプリ内カメラ */}
      {camTarget && (
        <Camera
          label={`${camTarget.index + 1}番 ${camTarget.kind === 'before' ? 'ビフォー' : 'アフター'}`}
          onCapture={onCameraCapture}
          onClose={() => setCamTarget(null)}
          onFallback={onCameraFallback}
        />
      )}

      {/* 共有選択シート */}
      {showShare && (
        <ShareSheet project={project} onClose={() => setShowShare(false)} notify={notify} />
      )}

      {/* カメラ不可時の標準カメラ・フォールバック */}
      <input
        ref={nativeRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const t = pendingRef.current;
          pendingRef.current = null;
          if (e.target.files?.[0] && t) handlePick(t.index, t.kind, e.target.files[0]);
          e.target.value = '';
        }}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto w-fit max-w-[90%] rounded-sm bg-slate-900/90 px-4 py-2 text-center text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
