'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drawSignboard, signboardHeight, SignFields } from '@/lib/signboard';
import { dataUrlToFile, shareOrDownload } from '@/lib/ba/share';

type Shot = { no: number; dataUrl: string };
type Phase = 'setup' | 'shoot';

const MAX_LIMIT = 100;
const KIND_PRESETS = ['除草前', '除草後'];
// 看板：画像に対する幅の割合と余白
const BOARD_W_RATIO = 0.34;
const BOARD_MARGIN = 0.03;
const CAPTURE_MAX_W = 1600;

export default function SignPhoto() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [title, setTitle] = useState('除草');
  const [place, setPlace] = useState('');
  const [kind, setKind] = useState('除草前');
  const [startNo, setStartNo] = useState(1);
  const [maxCount, setMaxCount] = useState(100);
  const [shots, setShots] = useState<Shot[]>([]);
  const [camError, setCamError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const nextNo = startNo + shots.length;
  const reachedMax = shots.length >= maxCount;
  const fields: SignFields = { title: title.trim(), place: place.trim(), kind, no: nextNo };

  // ライブプレビュー上の看板を描く
  const drawOverlay = useCallback(() => {
    const cv = overlayRef.current;
    const v = videoRef.current;
    if (!cv || !v) return;
    const cw = v.clientWidth;
    const ch = v.clientHeight;
    if (!cw || !ch) return;
    if (cv.width !== cw) cv.width = cw;
    if (cv.height !== ch) cv.height = ch;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    const bw = cw * BOARD_W_RATIO;
    const bh = signboardHeight(bw);
    const m = cw * BOARD_MARGIN;
    drawSignboard(ctx, m, ch - bh - m, bw, { ...fields });
  }, [fields.title, fields.place, fields.kind, fields.no]);

  // カメラ開始/停止
  useEffect(() => {
    if (phase !== 'shoot') return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setCamError('');
      } catch (e) {
        setCamError('カメラを起動できませんでした。ブラウザのカメラ許可を確認するか、下の「写真を選ぶ」で撮影してください。');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [phase]);

  // オーバーレイの再描画（内容変更・リサイズ時）
  useEffect(() => {
    if (phase !== 'shoot') return;
    let raf = 0;
    const loop = () => {
      drawOverlay();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, drawOverlay]);

  // 1枚を合成して保存
  const composite = useCallback(
    (source: CanvasImageSource, sw: number, sh: number) => {
      const scale = Math.min(1, CAPTURE_MAX_W / sw);
      const outW = Math.round(sw * scale);
      const outH = Math.round(sh * scale);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, outW, outH);
      const bw = outW * BOARD_W_RATIO;
      const bh = signboardHeight(bw);
      const m = outW * BOARD_MARGIN;
      drawSignboard(ctx, m, outH - bh - m, bw, { title: title.trim(), place: place.trim(), kind, no: nextNo });
      return canvas.toDataURL('image/jpeg', 0.85);
    },
    [title, place, kind, nextNo],
  );

  function capture() {
    if (reachedMax) return;
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const url = composite(v, v.videoWidth, v.videoHeight);
    if (url) setShots((s) => [...s, { no: nextNo, dataUrl: url }]);
  }

  // カメラが使えないときのフォールバック（端末カメラ/写真から）
  async function onPickFile(file: File | undefined) {
    if (!file || reachedMax) return;
    const img = await loadImage(URL.createObjectURL(file));
    const url = composite(img, img.naturalWidth, img.naturalHeight);
    if (url) setShots((s) => [...s, { no: nextNo, dataUrl: url }]);
  }

  function removeShot(no: number) {
    setShots((s) => s.filter((x) => x.no !== no));
  }

  async function saveAll() {
    if (shots.length === 0) return;
    setSaving(true);
    setMsg('');
    try {
      const files = shots.map((s) =>
        dataUrlToFile(s.dataUrl, `${sanitize(title)}_${sanitize(kind)}_${String(s.no).padStart(3, '0')}.jpg`),
      );
      const r = await shareOrDownload(files, `${title.trim()} ${kind}`);
      setMsg(r === 'shared' ? '共有しました' : r === 'downloaded' ? '保存（ダウンロード）しました' : '保存できませんでした');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2500);
    }
  }

  // ---- 設定画面 ----
  if (phase === 'setup') {
    return (
      <div className="space-y-4 pb-8">
        <h2 className="text-lg font-bold">看板の設定</h2>
        <p className="text-xs text-black/50">
          撮影を始める前に看板の内容を決めます。撮影した写真の左下に、この看板が自動で入ります。番号は撮るごとに自動で増えます。
        </p>

        <Field label="工事名">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 除草" />
        </Field>
        <Field label="場所">
          <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="例: 羽賀発電所" />
        </Field>

        <div className="space-y-1">
          <span className="text-sm font-medium text-black/70">種別（看板の縦書き）</span>
          <div className="flex flex-wrap gap-2">
            {KIND_PRESETS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  kind === k ? 'border-brand-primary bg-brand-soft text-brand-primary' : 'border-black/15 text-black/60'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            className="input mt-1"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            placeholder="自由入力も可（例: 除草前）"
          />
          <p className="text-[11px] text-black/40">この種別が、これから撮る全ての看板に入ります。</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="開始番号">
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={startNo}
              onChange={(e) => setStartNo(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label={`撮影上限（最大${MAX_LIMIT}枚）`}>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={maxCount}
              onChange={(e) => setMaxCount(clamp(Number(e.target.value) || 1, 1, MAX_LIMIT))}
            />
          </Field>
        </div>

        {/* プレビュー */}
        <div className="space-y-1">
          <span className="text-sm font-medium text-black/70">看板プレビュー</span>
          <SignPreview fields={{ title: title.trim(), place: place.trim(), kind, no: startNo }} />
        </div>

        <button
          onClick={() => {
            setShots([]);
            setPhase('shoot');
          }}
          className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white"
        >
          📷 撮影を開始する
        </button>
      </div>
    );
  }

  // ---- 撮影画面 ----
  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setPhase('setup')} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm">
          ‹ 設定に戻る
        </button>
        <span className="text-sm text-black/60">
          {shots.length} / {maxCount} 枚
        </span>
      </div>

      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        {title || '（工事名）'}／{place || '（場所）'}／<b>{kind}</b>　次の番号：<b>{nextNo}</b>
      </p>

      {/* カメラ＋看板オーバーレイ */}
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="block h-auto w-full" />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      {camError && <p className="text-xs text-red-500">{camError}</p>}

      <div className="flex gap-2">
        <button
          onClick={capture}
          disabled={reachedMax || !!camError}
          className="flex-[2] rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-40"
        >
          {reachedMax ? '上限に達しました' : '● 撮影する'}
        </button>
        <label className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/15 py-3 text-sm font-semibold text-black/70">
          写真を選ぶ
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onPickFile(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {/* 一括保存 */}
      <div className="flex items-center gap-2">
        <button
          onClick={saveAll}
          disabled={saving || shots.length === 0}
          className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40"
        >
          {saving ? '保存中…' : `⬇ ${shots.length}枚をまとめて保存 / 共有`}
        </button>
        {shots.length > 0 && (
          <button
            onClick={() => {
              if (confirm('撮影した写真をすべて消去しますか？')) setShots([]);
            }}
            className="rounded-xl border border-black/15 px-3 py-3 text-sm text-black/60"
          >
            全消去
          </button>
        )}
      </div>
      {msg && <p className="text-center text-xs text-brand-primary">{msg}</p>}

      {/* 撮影済み一覧 */}
      {shots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {shots.map((s) => (
            <div key={s.no} className="relative overflow-hidden rounded-lg border border-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.dataUrl} alt={`${s.no}`} className="block aspect-[4/3] w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs font-bold text-white">
                {s.no}
              </span>
              <button
                onClick={() => removeShot(s.no)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-sm text-white"
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 設定画面のプレビュー（Canvasで実物と同じ見た目を描画）
function SignPreview({ fields }: { fields: SignFields }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const W = 320;
    const bw = W * BOARD_W_RATIO * 2.2; // プレビューでは看板を大きめに
    const bh = signboardHeight(bw);
    cv.width = W;
    cv.height = Math.round(bh + 24);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#5b6b82';
    ctx.fillRect(0, 0, cv.width, cv.height);
    drawSignboard(ctx, 12, 12, bw, fields);
  }, [fields.title, fields.place, fields.kind, fields.no]);
  return <canvas ref={ref} className="w-full rounded-lg border border-black/10" />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-black/70">{label}</span>
      {children}
    </label>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function sanitize(s: string) {
  return (s || '写真').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 20);
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
