'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drawSignboard, signboardHeight, SignFields, SignColor } from '@/lib/signboard';
import { dataUrlToFile, shareOrDownload } from '@/lib/ba/share';

type Phase = 'setup' | 'grid';

const MAX_LIMIT = 100;
const KIND_PRESETS = ['除草前', '除草後'];
// 看板：画像に対する幅の割合と余白
const BOARD_W_RATIO = 0.34;
const CAPTURE_MAX_W = 1600;

// 出力比率 5:4（横長）
const OUT_RATIO = 5 / 4;

// 写真を5:4にセンター切り出しし、看板を合成して dataURL を返す
function compositeImage(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  fields: SignFields,
  color: SignColor,
): string | null {
  const outW = CAPTURE_MAX_W;
  const outH = Math.round(outW / OUT_RATIO); // 5:4
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // cover（中央切り出し）で歪みなく5:4に収める
  const scale = Math.max(outW / sw, outH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
  // 左下にぴったり詰める（余白なし・スタンドなし）
  const bw = outW * BOARD_W_RATIO;
  drawSignboard(ctx, 0, outH - signboardHeight(bw), bw, fields, false, color);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function sanitize(s: string) {
  return (s || '写真').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 20);
}

export default function SignPhoto() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [title, setTitle] = useState('除草');
  const [place, setPlace] = useState('');
  const [kind, setKind] = useState('除草前');
  const [color, setColor] = useState<SignColor>('white');
  const [startNo, setStartNo] = useState('1'); // 文字列で保持（先頭の数字を消せるように）
  const [count, setCount] = useState('20');
  const [slots, setSlots] = useState<(string | null)[]>([]); // 各枠の合成済みdataURL
  const [active, setActive] = useState<number | null>(null); // カメラ起動中の枠
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const startNoNum = Math.max(1, parseInt(startNo, 10) || 1);
  const numberOf = (i: number) => startNoNum + i;
  const fieldsFor = (i: number): SignFields => ({ title: title.trim(), place: place.trim(), kind, no: numberOf(i) });

  function begin() {
    const n = clamp(parseInt(count, 10) || 0, 1, MAX_LIMIT);
    setCount(String(n));
    setSlots(Array.from({ length: n }, () => null));
    setPhase('grid');
  }

  function setSlot(i: number, dataUrl: string | null) {
    setSlots((s) => s.map((v, idx) => (idx === i ? dataUrl : v)));
  }

  async function pickFromAlbum(i: number, file: File | undefined) {
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    const url = compositeImage(img, img.naturalWidth, img.naturalHeight, fieldsFor(i), color);
    if (url) setSlot(i, url);
  }

  const filled = slots.filter((s): s is string => !!s);

  async function saveAll() {
    if (filled.length === 0) return;
    setSaving(true);
    setMsg('');
    try {
      const files: File[] = [];
      slots.forEach((url, i) => {
        if (url) files.push(dataUrlToFile(url, `${sanitize(title)}_${sanitize(kind)}_${String(numberOf(i)).padStart(3, '0')}.jpg`));
      });
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
          撮影を始める前に看板の内容と枚数を決めます。設定した枚数ぶんの箱が並び、上から順に撮影して埋めていきます。
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

        <div className="space-y-1">
          <span className="text-sm font-medium text-black/70">看板の色</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setColor('white')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-bold ${
                color === 'white' ? 'border-brand-primary bg-brand-soft text-brand-primary' : 'border-black/15 text-black/60'
              }`}
            >
              <span className="inline-block h-4 w-4 rounded border border-black/30 bg-white" /> 白の看板
            </button>
            <button
              type="button"
              onClick={() => setColor('green')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-bold ${
                color === 'green' ? 'border-brand-primary bg-brand-soft text-brand-primary' : 'border-black/15 text-black/60'
              }`}
            >
              <span className="inline-block h-4 w-4 rounded border border-black/20 bg-[#2f8f43]" /> 緑の看板
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="開始番号">
            <input
              type="text"
              inputMode="numeric"
              className="input"
              value={startNo}
              onChange={(e) => setStartNo(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => setStartNo(String(Math.max(1, parseInt(startNo, 10) || 1)))}
            />
          </Field>
          <Field label={`枚数（最大${MAX_LIMIT}枚）`}>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => setCount(count === '' ? '' : String(clamp(parseInt(count, 10) || 1, 1, MAX_LIMIT)))}
              placeholder="例: 20"
            />
          </Field>
        </div>

        {/* プレビュー */}
        <div className="space-y-1">
          <span className="text-sm font-medium text-black/70">看板プレビュー</span>
          <SignPreview fields={{ title: title.trim(), place: place.trim(), kind, no: startNoNum }} color={color} />
        </div>

        <button
          onClick={begin}
          disabled={!count || parseInt(count, 10) < 1}
          className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-40"
        >
          📷 {count || 0}枚の撮影を始める
        </button>
      </div>
    );
  }

  // ---- 撮影グリッド ----
  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setPhase('setup')} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm">
          ‹ 設定に戻る
        </button>
        <span className="text-sm text-black/60">
          {filled.length} / {slots.length} 枚
        </span>
      </div>

      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        {title || '（工事名）'}／{place || '（場所）'}／<b>{kind}</b>
      </p>

      {/* 一括保存 */}
      <div className="flex items-center gap-2">
        <button
          onClick={saveAll}
          disabled={saving || filled.length === 0}
          className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40"
        >
          {saving ? '保存中…' : `⬇ ${filled.length}枚をまとめて保存 / 共有`}
        </button>
      </div>
      {msg && <p className="text-center text-xs text-brand-primary">{msg}</p>}

      {/* 空き箱を上から順に並べる */}
      <div className="space-y-2">
        {slots.map((url, i) => (
          <div key={i} className="flex items-stretch gap-2 rounded-xl border border-black/10 bg-white p-2">
            <div className="grid w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-lg font-black text-brand-primary">
              {numberOf(i)}
            </div>
            {url ? (
              <div className="relative min-w-0 flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${numberOf(i)}`} className="block aspect-[5/4] w-full rounded-lg object-cover" />
                <div className="absolute right-1 top-1 flex gap-1">
                  <button
                    onClick={() => setActive(i)}
                    className="rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white"
                  >
                    撮り直し
                  </button>
                  <button
                    onClick={() => setSlot(i, null)}
                    className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white"
                    aria-label="消去"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[92px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/15 p-2">
                <span className="text-xs text-black/40">{numberOf(i)}番の写真</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActive(i)}
                    className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-bold text-white"
                  >
                    📷 撮影
                  </button>
                  <label className="cursor-pointer rounded-lg border border-black/15 px-3 py-1.5 text-sm font-semibold text-black/70">
                    🖼 アルバム
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        pickFromAlbum(i, e.target.files?.[0]);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {active !== null && (
        <CameraModal
          fields={fieldsFor(active)}
          color={color}
          onCapture={(url) => {
            setSlot(active, url);
            setActive(null);
          }}
          onAlbum={async (file) => {
            await pickFromAlbum(active, file);
            setActive(null);
          }}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

// カメラのフルスクリーンモーダル（看板＋自撮り棒をライブ表示）
function CameraModal({
  fields,
  color,
  onCapture,
  onAlbum,
  onClose,
}: {
  fields: SignFields;
  color: SignColor;
  onCapture: (dataUrl: string) => void;
  onAlbum: (file: File | undefined) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState('');

  const draw = useCallback(() => {
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
    drawSignboard(ctx, 0, ch - signboardHeight(bw), bw, fields, false, color);
  }, [fields.title, fields.place, fields.kind, fields.no, color]);

  useEffect(() => {
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
      } catch {
        setErr('カメラを起動できませんでした。「アルバムから選ぶ」で追加してください。');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  function shoot() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const url = compositeImage(v, v.videoWidth, v.videoHeight, fields, color);
    if (url) onCapture(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="text-sm">
          ✕ 閉じる
        </button>
        <span className="text-sm font-bold">{fields.no}番を撮影</span>
        <span className="w-12" />
      </div>
      <div className="flex flex-1 items-center justify-center px-2">
        {/* 実際に保存される5:4の範囲をそのまま表示（object-coverで中央切り出し） */}
        <div className="relative aspect-[5/4] max-h-full w-full overflow-hidden">
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>
      </div>
      {err && <p className="px-4 py-2 text-center text-xs text-red-300">{err}</p>}
      <div className="flex items-center justify-around gap-3 px-4 py-5">
        <label className="cursor-pointer rounded-xl border border-white/40 px-4 py-3 text-sm font-semibold text-white">
          アルバム
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onAlbum(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
        </label>
        <button
          onClick={shoot}
          disabled={!!err}
          className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
          aria-label="撮影"
        >
          <span className="h-12 w-12 rounded-full bg-white" />
        </button>
        <span className="w-16" />
      </div>
    </div>
  );
}

// 設定画面のプレビュー（Canvasで実物と同じ見た目を描画）
function SignPreview({ fields, color }: { fields: SignFields; color: SignColor }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const W = 320;
    const bw = W * 0.5;
    cv.width = W;
    cv.height = Math.round(signboardHeight(bw) + 24);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#5b6b82';
    ctx.fillRect(0, 0, cv.width, cv.height);
    drawSignboard(ctx, 12, 12, bw, fields, false, color);
  }, [fields.title, fields.place, fields.kind, fields.no, color]);
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
