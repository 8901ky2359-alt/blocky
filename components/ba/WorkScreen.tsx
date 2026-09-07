'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Project, Shot } from '@/lib/ba/types';
import { toFiveFour } from '@/lib/ba/image';
import { dataUrlToFile, shareOrDownload } from '@/lib/ba/share';
import { getQuality, qualityParams } from '@/lib/ba/quality';
import { composeSignboard, getSignImage, setSignImage } from '@/lib/ba/sign';
import { formatJpDate } from '@/lib/format';
import ItemRow from './ItemRow';
import Camera from './Camera';

type Target = { index: number; kind: 'before' | 'after' };

export default function WorkScreen({
  project,
  onSetShot,
  onBulkImport,
  onEdit,
  onBack,
  onAddItems,
}: {
  project: Project;
  onSetShot: (index: number, kind: 'before' | 'after', shot: Shot | null) => void;
  onBulkImport: (kind: 'before' | 'after', shots: Shot[]) => void;
  onEdit: () => void;
  onBack: () => void;
  onAddItems: (n: number) => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [camTarget, setCamTarget] = useState<Target | null>(null);
  const [saving, setSaving] = useState(false);
  const [signImage, setSignImageState] = useState<string | null>(null);
  const [composed, setComposed] = useState<Map<string, string>>(new Map());
  const [bulkBusy, setBulkBusy] = useState<'before' | 'after' | null>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Target | null>(null);
  const toastT = useRef<number>();
  const bulkRef = useRef<{ before: HTMLInputElement | null; after: HTMLInputElement | null }>({
    before: null,
    after: null,
  });
  const signUploadRef = useRef<HTMLInputElement>(null);

  function notify(msg: string) {
    setToast(msg);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    getSignImage().then(setSignImageState);
  }, []);

  // 看板を重ねた「アフター」表示画像を作る（元データは変えず、表示・保存の直前に合成）
  useEffect(() => {
    if (!project.showSign || !signImage) {
      setComposed(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const next = new Map<string, string>();
      for (const it of project.items) {
        if (!it.after) continue;
        try {
          next.set(it.after.dataUrl, await composeSignboard(it.after.dataUrl, signImage));
        } catch {
          /* 合成に失敗したら元画像のまま */
        }
      }
      if (!cancelled) setComposed(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [project.showSign, signImage, project.items]);

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

  // 一括アップロード：写真をまとめて整形し、空いている枠への割り当ては親（プロジェクト側）に任せる
  async function handleBulkFiles(kind: 'before' | 'after', files: FileList | null) {
    if (!files || files.length === 0) return;
    setBulkBusy(kind);
    try {
      const { maxW, jpeg } = qualityParams(getQuality());
      const list = Array.from(files);
      const shots: Shot[] = [];
      for (const file of list) {
        try {
          shots.push({ dataUrl: await toFiveFour(file, maxW, jpeg) });
        } catch {
          /* 1枚失敗しても続行 */
        }
      }
      if (shots.length > 0) {
        onBulkImport(kind, shots);
        notify(`${shots.length}枚を取り込みました`);
      }
    } finally {
      setBulkBusy(null);
    }
  }

  async function handleSignUpload(file: File) {
    try {
      const { maxW, jpeg } = qualityParams(getQuality());
      const dataUrl = await toFiveFour(file, maxW, jpeg);
      await setSignImage(dataUrl);
      setSignImageState(dataUrl);
      notify('看板画像を登録しました');
    } catch {
      notify('看板画像を読み込めませんでした');
    }
  }

  // すべての写真を一括保存（看板ONのアフターは合成後の画像を保存）
  async function saveAll() {
    const prefix = project.name ? `${project.name}_` : '';
    const files: File[] = [];
    project.items.forEach((it, i) => {
      if (it.before) files.push(dataUrlToFile(it.before.dataUrl, `${prefix}${i + 1}_before.jpg`));
      if (it.after) {
        const url = composed.get(it.after.dataUrl) ?? it.after.dataUrl;
        files.push(dataUrlToFile(url, `${prefix}${i + 1}_after.jpg`));
      }
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
          <div className="flex items-start justify-between gap-2">
            <button onClick={onBack} className="shrink-0 text-xs font-semibold text-slate-400">
              ‹ 一覧へ
            </button>
            <button
              onClick={onEdit}
              className="shrink-0 rounded-none border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500"
            >
              ✎ 現場情報を編集
            </button>
          </div>
          <h2 className="mt-1 truncate text-base font-bold text-slate-900">{project.name || '（現場名なし）'}</h2>
          <p className="truncate text-xs text-slate-400">
            {project.startDate ? formatJpDate(project.startDate) : ''}
            {project.address ? `　${project.address}` : ''}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-none bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(doneCount / Math.max(1, project.count)) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              完了 {doneCount}/{project.count}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {/* 看板設定（この現場でON、かつ看板画像が未登録のときだけ促す） */}
        {project.showSign && !signImage && (
          <div className="space-y-2 rounded-sm border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">
              看板を入れる設定になっていますが、看板画像がまだ登録されていません
            </p>
            <button
              onClick={() => signUploadRef.current?.click()}
              className="w-full rounded-none bg-amber-600 py-2.5 text-xs font-bold text-white"
            >
              看板画像を登録する
            </button>
          </div>
        )}
        {project.showSign && signImage && (
          <button
            onClick={() => signUploadRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-sm border border-slate-200 bg-white p-2 text-xs text-slate-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signImage} alt="看板" className="h-8 w-8 rounded-sm object-cover" />
            看板画像を変更する
          </button>
        )}
        <input
          ref={signUploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleSignUpload(e.target.files[0]);
            e.target.value = '';
          }}
        />

        {/* 一括アップロード */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => bulkRef.current.before?.click()}
            disabled={bulkBusy !== null}
            className="rounded-none border-2 border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 disabled:opacity-50"
          >
            {bulkBusy === 'before' ? '取込中…' : '🖼 ビフォーを一括アップロード'}
          </button>
          <button
            onClick={() => bulkRef.current.after?.click()}
            disabled={bulkBusy !== null}
            className="rounded-none border-2 border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700 disabled:opacity-50"
          >
            {bulkBusy === 'after' ? '取込中…' : '🖼 アフターを一括アップロード'}
          </button>
          <input
            ref={(el) => {
              bulkRef.current.before = el;
            }}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleBulkFiles('before', e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={(el) => {
              bulkRef.current.after = el;
            }}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleBulkFiles('after', e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        <p className="text-center text-[11px] text-slate-400">
          過去の写真をまとめて取り込むときに使えます（空いている枠に古い順で入ります・足りない分は自動で枠を追加）
        </p>

        {project.items.map((it, i) => (
          <ItemRow
            key={i}
            index={i}
            item={it}
            afterDisplayUrl={it.after ? composed.get(it.after.dataUrl) : undefined}
            busyKind={busy === `${i}:before` ? 'before' : busy === `${i}:after` ? 'after' : null}
            onRequestCamera={(kind) => setCamTarget({ index: i, kind })}
            onPickFile={(kind, file) => handlePick(i, kind, file)}
            onClear={(kind) => onSetShot(i, kind, null)}
            notify={notify}
          />
        ))}

        {/* 箇所を追加（何箇所でも） */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[1, 5, 10].map((n) => (
            <button
              key={n}
              onClick={() => onAddItems(n)}
              className="rounded-none border-2 border-dashed border-slate-300 py-3 text-sm font-bold text-slate-500 active:bg-slate-100"
            >
              ＋{n}箇所
            </button>
          ))}
        </div>
      </div>

      {/* 下部の保存バー */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <button
            onClick={saveAll}
            disabled={saving || totalShots === 0}
            className="w-full rounded-none bg-brand-accent py-4 text-base font-bold text-white shadow-lg active:scale-[.99] disabled:bg-slate-200 disabled:text-slate-400"
          >
            {saving ? '保存中…' : `📥 すべて保存する（${totalShots}枚）`}
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
