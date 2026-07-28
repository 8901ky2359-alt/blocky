'use client';

import { useMemo, useRef, useState } from 'react';
import { Project, Shot } from '@/lib/ba/types';
import { toFiveFour } from '@/lib/ba/image';
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
      const dataUrl = await toFiveFour(file);
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

      {/* 下部の共有バー */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <button
            onClick={() => setShowShare(true)}
            className="w-full rounded-none bg-slate-900 py-4 text-base font-bold text-white shadow-lg active:scale-[.99]"
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
