'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pair,
  Slot,
  toFiveByFour,
  buildComparison,
  loadProject,
  saveProject,
  clearProject,
  dataUrlToFile,
  downloadDataUrl,
  shareImageFiles,
} from '@/lib/beforeAfter';
import { uid } from '@/lib/format';

type Phase = 'setup' | 'work';

const PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];

function makePairs(n: number): Pair[] {
  return Array.from({ length: n }, () => ({ id: uid() }));
}

export default function BeforeAfterPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(5);
  const [title, setTitle] = useState('');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // 起動時: 端末内に作業中データがあれば復帰する
  useEffect(() => {
    (async () => {
      const saved = await loadProject();
      if (saved && saved.pairs && saved.pairs.length > 0) {
        setTitle(saved.title || '');
        setPairs(saved.pairs);
        setCount(saved.pairs.length);
        setPhase('work');
      }
      setReady(true);
    })();
  }, []);

  // 自動保存（電波が無くても失われないよう端末内へ）
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'work' || pairs.length === 0) return;
    savedRef.current = true;
    const t = setTimeout(() => {
      saveProject({ title, pairs });
    }, 400);
    return () => clearTimeout(t);
  }, [phase, title, pairs]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  }, []);

  function start(n: number) {
    setPairs(makePairs(n));
    setPhase('work');
    window.scrollTo({ top: 0 });
  }

  async function resetAll() {
    if (!confirm('現在の写真をすべて消去して、新しく始めますか？')) return;
    await clearProject();
    setPairs([]);
    setTitle('');
    setPhase('setup');
  }

  function setSlot(pairId: string, slot: Slot, dataUrl: string | undefined) {
    setPairs((prev) => prev.map((p) => (p.id === pairId ? { ...p, [slot]: dataUrl } : p)));
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-900 text-slate-300">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {phase === 'setup' ? (
        <SetupScreen count={count} onCount={setCount} onStart={start} />
      ) : (
        <WorkScreen
          title={title}
          onTitle={setTitle}
          pairs={pairs}
          onSlot={setSlot}
          onReset={resetAll}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto rounded-full bg-slate-900/95 px-5 py-2.5 text-sm font-medium text-white shadow-lg ring-1 ring-white/10">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* 最初の画面: 撮影する箇所数を選ぶ                                      */
/* ================================================================== */

function SetupScreen({
  count,
  onCount,
  onStart,
}: {
  count: number;
  onCount: (n: number) => void;
  onStart: (n: number) => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] flex-col px-5 pb-10 pt-14">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-lg text-white">
          ◧
        </span>
        <span className="text-sm font-bold tracking-wide text-slate-500">SITE BEFORE / AFTER</span>
      </div>
      <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-tight">
        現場写真ビフォーアフター
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
        作業前と作業後の写真を、番号ごとに並べて記録します。
        <br />
        まずは、撮影する箇所の数を選んでください。
      </p>

      <div className="mt-9">
        <p className="mb-3 text-sm font-semibold text-slate-600">撮影する箇所の数</p>
        <div className="grid grid-cols-4 gap-2.5">
          {PRESETS.map((n) => {
            const active = n === count;
            return (
              <button
                key={n}
                onClick={() => onCount(n)}
                className={`aspect-square rounded-2xl text-lg font-bold transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* 細かい調整 */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <span className="pl-2 text-sm font-medium text-slate-600">個数を調整</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onCount(Math.max(1, count - 1))}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl font-bold text-slate-700 active:scale-95"
              aria-label="減らす"
            >
              −
            </button>
            <span className="w-10 text-center text-xl font-bold tabular-nums">{count}</span>
            <button
              onClick={() => onCount(Math.min(30, count + 1))}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl font-bold text-slate-700 active:scale-95"
              aria-label="増やす"
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <button
          onClick={() => onStart(count)}
          className="w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.99]"
        >
          {count}箇所ではじめる
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          オフラインでも動作します・後から個数は変更できます
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 作業画面: ビフォー(左)/アフター(右)を番号順に                         */
/* ================================================================== */

function WorkScreen({
  title,
  onTitle,
  pairs,
  onSlot,
  onReset,
  onToast,
}: {
  title: string;
  onTitle: (v: string) => void;
  pairs: Pair[];
  onSlot: (pairId: string, slot: Slot, dataUrl: string | undefined) => void;
  onReset: () => void;
  onToast: (m: string) => void;
}) {
  const doneCount = pairs.filter((p) => p.before && p.after).length;

  return (
    <div>
      {/* 上部バー */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-[900px] items-center gap-3 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-base">
            ◧
          </span>
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="案件名（現場名など・任意）"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold text-white placeholder:text-white/40 focus:outline-none"
          />
          <span className="hidden shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 sm:inline">
            {doneCount}/{pairs.length} 完了
          </span>
          <button
            onClick={onReset}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 ring-1 ring-white/15 transition hover:bg-white/10"
          >
            新規
          </button>
        </div>
        {/* 進捗バー */}
        <div className="h-1 w-full bg-white/10">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: `${pairs.length ? (doneCount / pairs.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 pb-32 pt-4">
        <div className="space-y-4">
          {pairs.map((pair, i) => (
            <PairCard
              key={pair.id}
              index={i}
              pair={pair}
              title={title}
              onSlot={onSlot}
              onToast={onToast}
            />
          ))}
        </div>
      </main>

      {/* 下部の一括共有バー */}
      <ShareAllBar pairs={pairs} title={title} onToast={onToast} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 番号ごとのカード（左:ビフォー / 右:アフター）                          */
/* ------------------------------------------------------------------ */

function PairCard({
  index,
  pair,
  title,
  onSlot,
  onToast,
}: {
  index: number;
  pair: Pair;
  title: string;
  onSlot: (pairId: string, slot: Slot, dataUrl: string | undefined) => void;
  onToast: (m: string) => void;
}) {
  const [busy, setBusy] = useState<Slot | null>(null);
  const [sharing, setSharing] = useState(false);
  const num = index + 1;
  const base = (title.trim() || '現場').replace(/[\\/:*?"<>|\s]+/g, '_');

  async function pickAndSet(slot: Slot, useCamera: boolean) {
    const file = await pickImageFile(useCamera);
    if (!file) return;
    setBusy(slot);
    try {
      const raw = await readAsDataUrl(file);
      const cropped = await toFiveByFour(raw);
      onSlot(pair.id, slot, cropped);
    } catch {
      onToast('写真を読み込めませんでした');
    } finally {
      setBusy(null);
    }
  }

  function filesForPair(): File[] {
    const files: File[] = [];
    if (pair.before) files.push(dataUrlToFile(pair.before, `${base}_${num}_before.jpg`));
    if (pair.after) files.push(dataUrlToFile(pair.after, `${base}_${num}_after.jpg`));
    return files;
  }

  // ビフォー/アフターの2枚を1セットで共有（LINE等）
  async function sharePair() {
    const files = filesForPair();
    if (files.length === 0) return;
    setSharing(true);
    try {
      const r = await shareImageFiles(files, `${base} ${num}番 ビフォーアフター`);
      if (r === 'unsupported') {
        files.forEach((f) => downloadDataUrl(URL_from(f), f.name));
        onToast('この端末は共有に非対応のため保存しました');
      } else if (r === 'failed') {
        onToast('共有できませんでした');
      }
    } finally {
      setSharing(false);
    }
  }

  // 2枚を端末に保存（ダウンロード）
  function savePair() {
    let saved = 0;
    if (pair.before) {
      downloadDataUrl(pair.before, `${base}_${num}_before.jpg`);
      saved++;
    }
    if (pair.after) {
      downloadDataUrl(pair.after, `${base}_${num}_after.jpg`);
      saved++;
    }
    if (saved) onToast(`${saved}枚を保存しました`);
  }

  // 並べて1枚の比較画像として共有（おまけ）
  async function shareComparison() {
    if (!pair.before || !pair.after) return;
    setSharing(true);
    try {
      const composite = await buildComparison(pair.before, pair.after);
      if (!composite) {
        onToast('画像を作成できませんでした');
        return;
      }
      const file = dataUrlToFile(composite, `${base}_${num}_比較.jpg`);
      const r = await shareImageFiles([file], `${base} ${num}番 比較`);
      if (r === 'unsupported') {
        downloadDataUrl(composite, file.name);
        onToast('比較画像を保存しました');
      }
    } finally {
      setSharing(false);
    }
  }

  const hasAny = !!(pair.before || pair.after);
  const both = !!(pair.before && pair.after);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {/* カード見出し */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
          {num}
        </span>
        <span className="text-sm font-semibold text-slate-500">{num}番</span>
        {both && (
          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
            完了
          </span>
        )}
      </div>

      {/* 2枚並べ */}
      <div className="grid grid-cols-2 gap-3 p-3">
        <PhotoSlot
          slot="before"
          label="ビフォー"
          tag="BEFORE"
          accent="blue"
          value={pair.before}
          busy={busy === 'before'}
          onCapture={() => pickAndSet('before', true)}
          onAlbum={() => pickAndSet('before', false)}
          onClear={() => onSlot(pair.id, 'before', undefined)}
        />
        <PhotoSlot
          slot="after"
          label="アフター"
          tag="AFTER"
          accent="emerald"
          value={pair.after}
          busy={busy === 'after'}
          onCapture={() => pickAndSet('after', true)}
          onAlbum={() => pickAndSet('after', false)}
          onClear={() => onSlot(pair.id, 'after', undefined)}
        />
      </div>

      {/* 撮影後アクション */}
      {hasAny && (
        <div className="border-t border-slate-100 p-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={savePair}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.99]"
            >
              <span>⤓</span> 写真を保存する
            </button>
            <button
              onClick={sharePair}
              disabled={sharing}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50"
            >
              <span>↗</span> {sharing ? '共有中…' : both ? '2枚を共有する' : '写真を共有する'}
            </button>
          </div>
          {both && (
            <button
              onClick={shareComparison}
              disabled={sharing}
              className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
            >
              並べて1枚の画像として共有する
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 1スロット（ビフォー or アフター）。5:4の枠で表示。                     */
/* ------------------------------------------------------------------ */

function PhotoSlot({
  label,
  tag,
  accent,
  value,
  busy,
  onCapture,
  onAlbum,
  onClear,
}: {
  slot: Slot;
  label: string;
  tag: string;
  accent: 'blue' | 'emerald';
  value?: string;
  busy: boolean;
  onCapture: () => void;
  onAlbum: () => void;
  onClear: () => void;
}) {
  const accentText = accent === 'blue' ? 'text-blue-600' : 'text-emerald-600';
  const accentBg = accent === 'blue' ? 'bg-blue-50' : 'bg-emerald-50';

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`rounded-md ${accentBg} px-1.5 py-0.5 text-[10px] font-bold ${accentText}`}>
          {tag}
        </span>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>

      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-1.5">
              <button
                onClick={onCapture}
                className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur"
              >
                撮り直す
              </button>
              <button
                onClick={onClear}
                className="rounded-md bg-black/40 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur"
              >
                削除
              </button>
            </div>
          </>
        ) : busy ? (
          <div className="grid h-full w-full place-items-center text-xs text-slate-400">
            処理中…
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2">
            <button
              onClick={onCapture}
              className="flex w-full max-w-[150px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95"
            >
              <span>📷</span> 写真を撮影する
            </button>
            <button
              onClick={onAlbum}
              className="flex w-full max-w-[150px] items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95"
            >
              <span>🖼</span> アルバムから
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 下部: すべての写真をまとめて共有                                      */
/* ------------------------------------------------------------------ */

function ShareAllBar({
  pairs,
  title,
  onToast,
}: {
  pairs: Pair[];
  title: string;
  onToast: (m: string) => void;
}) {
  const [sharing, setSharing] = useState(false);
  const total = pairs.reduce((s, p) => s + (p.before ? 1 : 0) + (p.after ? 1 : 0), 0);
  const base = (title.trim() || '現場').replace(/[\\/:*?"<>|\s]+/g, '_');

  async function shareAll() {
    if (total === 0) return;
    setSharing(true);
    try {
      const files: File[] = [];
      pairs.forEach((p, i) => {
        const n = i + 1;
        if (p.before) files.push(dataUrlToFile(p.before, `${base}_${n}_before.jpg`));
        if (p.after) files.push(dataUrlToFile(p.after, `${base}_${n}_after.jpg`));
      });
      const r = await shareImageFiles(files, `${base} ビフォーアフター（${files.length}枚）`);
      if (r === 'unsupported') onToast('この端末は一括共有に非対応です');
      else if (r === 'failed') onToast('共有できませんでした');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[900px] items-center gap-3 px-4 py-3">
        <div className="flex-1 text-sm">
          <span className="font-bold text-slate-800">{total}</span>
          <span className="text-slate-400"> 枚 撮影済み</span>
        </div>
        <button
          onClick={shareAll}
          disabled={sharing || total === 0}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40"
        >
          {sharing ? '共有中…' : 'すべて共有'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ユーティリティ                                                        */
/* ------------------------------------------------------------------ */

// カメラ or アルバムから画像を1枚選ぶ（ユーザー操作の中で呼ぶこと）
function pickImageFile(useCamera: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    input.onchange = () => {
      const f = input.files?.[0] ?? null;
      resolve(f);
      setTimeout(() => input.remove(), 0);
    };
    document.body.appendChild(input);
    input.click();
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// File → 一時URL（ダウンロード保存のフォールバック用）
function URL_from(file: File): string {
  return URL.createObjectURL(file);
}
