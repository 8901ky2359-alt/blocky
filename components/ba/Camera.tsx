'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playShutter, setSoundEnabled, soundEnabled } from '@/lib/ba/sound';
import { QualityLevel, getQuality, qualityParams, setQuality } from '@/lib/ba/quality';

export default function Camera({
  onCapture,
  onClose,
  onFallback,
  label,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [quality, setQ] = useState<QualityLevel>('high');
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvail, setTorchAvail] = useState(false);
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setSound(soundEnabled());
    setQ(getQuality());
  }, []);

  const start = useCallback(async (q: QualityLevel) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('この端末ではアプリ内カメラを使えません');
        return;
      }
      const { reqW, reqH } = qualityParams(q);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: reqW },
          height: { ideal: reqH },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // 連続オートフォーカス／トーチ対応検出
      try {
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          focusMode?: string[];
          torch?: boolean;
        };
        setTorchAvail(!!caps.torch);
        if (caps.focusMode?.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as never] });
        }
      } catch {
        /* noop */
      }
      setTorchOn(false);
    } catch {
      setError('カメラを起動できませんでした（権限を許可してください）');
    }
  }, []);

  useEffect(() => {
    start(getQuality());
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [start]);

  function changeQuality(q: QualityLevel) {
    setQ(q);
    setQuality(q);
    setShot(null);
    start(q);
  }

  async function toggleTorch() {
    const t = trackRef.current;
    if (!t) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !torchOn } as never] });
      setTorchOn((v) => !v);
    } catch {
      /* noop */
    }
  }

  // タップした場所にピントを合わせる
  async function focusAt(e: React.MouseEvent<HTMLDivElement>) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setRing({ x: px, y: py });
    window.setTimeout(() => setRing(null), 800);
    const t = trackRef.current;
    if (t) {
      const x = Math.min(1, Math.max(0, px / rect.width));
      const y = Math.min(1, Math.max(0, py / rect.height));
      try {
        await t.applyConstraints({
          advanced: [{ focusMode: 'single-shot', pointsOfInterest: [{ x, y }] } as never],
        });
      } catch {
        /* 端末非対応時は視覚フィードバックのみ */
      }
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    if (sound) playShutter();
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const ratio = 5 / 4;
    const srcRatio = vw / vh;
    let cw: number;
    let ch: number;
    let cx: number;
    let cy: number;
    if (srcRatio > ratio) {
      ch = vh;
      cw = vh * ratio;
      cx = (vw - cw) / 2;
      cy = 0;
    } else {
      cw = vw;
      ch = vw / ratio;
      cx = 0;
      cy = (vh - ch) / 2;
    }
    const { maxW, jpeg } = qualityParams(quality);
    const outW = Math.min(maxW, Math.round(cw));
    const outH = Math.round(outW / ratio);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, cx, cy, cw, ch, 0, 0, outW, outH);
    setShot(canvas.toDataURL('image/jpeg', jpeg));
  }

  function use() {
    if (!shot) return;
    const [head, body] = shot.split(',');
    const mime = /:(.*?);/.exec(head)?.[1] || 'image/jpeg';
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    onCapture(new File([arr], 'shot.jpg', { type: mime }));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* 上バー */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="px-2 py-1.5 text-sm font-semibold">
          ✕ 閉じる
        </button>
        <span className="text-sm font-semibold opacity-80">{label}</span>
        <button
          onClick={() => {
            const next = !sound;
            setSound(next);
            setSoundEnabled(next);
          }}
          className="px-2 text-lg"
          aria-label="シャッター音"
        >
          {sound ? '🔔' : '🔕'}
        </button>
      </div>

      {/* プレビュー（5:4・タップでピント） */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <p className="text-sm">{error}</p>
            <button
              onClick={onFallback}
              className="rounded-none bg-white px-5 py-3 text-sm font-bold text-black"
            >
              標準カメラ / アルバムで撮る
            </button>
          </div>
        ) : (
          <div
            ref={boxRef}
            onClick={shot ? undefined : focusAt}
            className="relative aspect-[5/4] w-full overflow-hidden bg-black ring-1 ring-white/15"
          >
            {/* 映像は常時マウント（撮り直しで黒画面にならないように） */}
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {shot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {ring && !shot && (
              <span
                className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-yellow-300"
                style={{ left: ring.x, top: ring.y }}
              />
            )}
            {!shot && (
              <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-white/70">
                画面をタップしてピント合わせ
              </span>
            )}
          </div>
        )}
      </div>

      {/* 画質・ライト（撮影前のみ） */}
      {!error && !shot && (
        <div className="flex items-center justify-center gap-2 px-4 pb-1">
          <div className="flex overflow-hidden rounded-none border border-white/30 text-xs">
            <button
              onClick={() => changeQuality('standard')}
              className={`px-3 py-1.5 font-semibold ${quality === 'standard' ? 'bg-white text-black' : 'text-white'}`}
            >
              標準
            </button>
            <button
              onClick={() => changeQuality('high')}
              className={`px-3 py-1.5 font-semibold ${quality === 'high' ? 'bg-white text-black' : 'text-white'}`}
            >
              高画質
            </button>
          </div>
          {torchAvail && (
            <button
              onClick={toggleTorch}
              className={`rounded-none border border-white/30 px-3 py-1.5 text-xs font-semibold ${
                torchOn ? 'bg-yellow-300 text-black' : 'text-white'
              }`}
            >
              {torchOn ? '💡 ライトON' : '🔦 ライト'}
            </button>
          )}
        </div>
      )}

      {/* 下バー */}
      {!error && (
        <div className="flex items-center justify-center gap-8 px-4 py-5">
          {shot ? (
            <>
              <button
                onClick={() => setShot(null)}
                className="rounded-none border border-white/40 px-6 py-3 text-sm font-bold text-white"
              >
                撮り直す
              </button>
              <button
                onClick={use}
                className="rounded-none bg-emerald-500 px-8 py-3 text-sm font-bold text-white"
              >
                この写真を使う
              </button>
            </>
          ) : (
            <button
              onClick={capture}
              aria-label="撮影"
              className="grid place-items-center rounded-full border-4 border-white/80 active:border-white"
              style={{ height: 76, width: 76 }}
            >
              <span className="block rounded-full bg-white" style={{ height: 56, width: 56 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
