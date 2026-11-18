'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Project, Shot } from '@/lib/ba/types';
import { processShot } from '@/lib/ba/process';
import { getFull, putPhoto } from '@/lib/ba/db';
import { shareOrDownload } from '@/lib/ba/share';
import { PHOTO_JPEG, PHOTO_MAX_W } from '@/lib/ba/quality';
import ItemRow from './ItemRow';
import ShareSheet from './ShareSheet';

export default function WorkScreen({
  project,
  onSetShot,
  onSetName,
  onReset,
  onAddItems,
  back,
}: {
  back?: { href: string; label: string };
  project: Project;
  onSetShot: (index: number, kind: 'before' | 'after', shot: Shot | null) => void;
  onSetName: (name: string) => void;
  onReset: () => void;
  onAddItems: (n: number) => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const firstNo = project.sign?.startNo ?? 1;
  const [busy, setBusy] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const toastT = useRef<number>();

  function notify(msg: string) {
    setToast(msg);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2400);
  }

  async function handlePick(index: number, kind: 'before' | 'after', file: File) {
    const k = `${index}:${kind}`;
    setBusy(k);
    let photo: { full: Blob; thumb: Blob };
    try {
      // 看板ありなら、左下に看板（ビフォー＝除草前／アフター＝除草後・同じ番号）を合成する
      const sign = project.sign;
      photo = await processShot(
        file,
        PHOTO_MAX_W,
        PHOTO_JPEG,
        sign
          ? {
              fields: { title: sign.title, place: sign.place, kind: kind === 'before' ? sign.beforeKind : sign.afterKind, no: sign.startNo + index },
              color: sign.color,
            }
          : null,
      );
    } catch {
      notify('写真を読み込めませんでした');
      setBusy(null);
      return;
    }
    try {
      // この1枚だけを端末に保存（保存が終わってから一覧に出す）
      const id = await putPhoto(photo.full, photo.thumb);
      onSetShot(index, kind, { id, thumb: URL.createObjectURL(photo.thumb) });
    } catch {
      notify('保存できませんでした（端末の空き容量を確認してください）');
    } finally {
      setBusy(null);
    }
  }

  // すべての写真を一括保存（iPhone: 共有シートの「画像を保存」で全枚数をまとめて保存 / PC: 一括ダウンロード）
  async function saveAll() {
    const prefix = project.name ? `${project.name}_` : '';
    if (totalShots === 0) {
      notify('保存できる写真がありません');
      return;
    }
    setSaving(true);
    try {
      // 元の画質の写真を1枚ずつ読み出す
      const files: File[] = [];
      for (const [i, it] of project.items.entries()) {
        for (const kind of ['before', 'after'] as const) {
          const s = it[kind];
          if (s) files.push(new File([await getFull(s.id)], `${prefix}${firstNo + i}_${kind}.jpg`, { type: 'image/jpeg' }));
        }
      }
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
    <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] pb-28">
      <header className="sticky top-0 z-10 bg-fw-bg/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex min-h-[36px] items-center justify-between">
          {back ? (
            <Link href={back.href} className="text-[15px] text-fw-green">
              ‹ {back.label}
            </Link>
          ) : (
            <span />
          )}
          <button onClick={onReset} className="text-[15px] text-fw-green">
            新しく始める
          </button>
        </div>
        <input
          id="ba-name"
          value={project.name}
          onChange={(e) => onSetName(e.target.value)}
          placeholder="現場名（任意）"
          className="input mt-1"
        />
        {project.sign && (
          <p className="mt-2 truncate rounded-lg bg-fw-card px-2.5 py-1 text-xs text-fw-muted">
            看板あり：{project.sign.title}
            {project.sign.place && ` ・ ${project.sign.place}`} ・ {project.sign.beforeKind}／{project.sign.afterKind} ・ No.{firstNo}〜
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fw-fill">
            <div className="h-full rounded-full bg-fw-green transition-all" style={{ width: `${(doneCount / project.count) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-fw-muted tabular-nums">
            完了 {doneCount}/{project.count}
          </span>
        </div>
      </header>

      <p className="mx-4 mb-3 text-xs text-fw-muted">
        スマホは縦向きのまま撮影できます。写真は真ん中を横長（5:4）で切り取り、高画質で保存します。撮った写真は長押しで大きく表示できます。
      </p>

      <div className="grid gap-3 px-4">
        {project.items.map((it, i) => (
          <ItemRow
            key={i}
            index={i}
            no={firstNo + i}
            item={it}
            busyKind={busy === `${i}:before` ? 'before' : busy === `${i}:after` ? 'after' : null}
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
              className="rounded-xl border-2 border-dashed border-fw-line py-3 text-sm font-bold text-fw-muted"
            >
              ＋{n}箇所
            </button>
          ))}
        </div>
      </div>

      {/* 下部の保存・共有バー */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-fw-line bg-fw-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <button
            onClick={saveAll}
            disabled={saving || totalShots === 0}
            className="rounded-xl bg-fw-fill py-3.5 font-bold disabled:opacity-40"
          >
            {saving ? '保存中…' : `すべて保存（${totalShots}枚）`}
          </button>
          <button
            onClick={() => setShowShare(true)}
            disabled={totalShots === 0}
            className="rounded-xl bg-fw-green py-3.5 font-bold text-white disabled:opacity-40"
          >
            共有する（{totalShots}枚）
          </button>
        </div>
      </div>

      {/* 共有選択シート */}
      {showShare && <ShareSheet project={project} onClose={() => setShowShare(false)} notify={notify} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-28 z-30 mx-auto w-fit max-w-[90%] rounded-full bg-fw-ink/90 px-4 py-2 text-center text-sm text-fw-card">
          {toast}
        </div>
      )}
    </div>
  );
}
