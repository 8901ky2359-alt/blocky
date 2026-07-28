'use client';

import { useEffect, useRef, useState } from 'react';

// アプリ内カメラ（getUserMedia）。撮影→確認→使う で File を返す。
export default function Camera({
  onCapture,
  onClose,
  onFallback,
  label,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void; // カメラ不可時：アルバム/標準カメラへ
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('この端末ではアプリ内カメラを使えません');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError('カメラを起動できませんでした（権限を許可してください）');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // 5:4 の横長で中央から切り出す（プレビューの見た目と一致）
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
    const outW = Math.min(1280, Math.round(cw));
    const outH = Math.round(outW / ratio);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, cx, cy, cw, ch, 0, 0, outW, outH);
    setShot(canvas.toDataURL('image/jpeg', 0.92));
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
        <button onClick={onClose} className="rounded-none px-3 py-1.5 text-sm font-semibold">
          ✕ 閉じる
        </button>
        <span className="text-sm font-semibold opacity-80">{label}</span>
        <span className="w-16" />
      </div>

      {/* プレビュー領域（5:4の横長フレーム。見たまま切り出し） */}
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
        ) : shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="" className="aspect-[5/4] w-full object-cover" />
        ) : (
          <div className="aspect-[5/4] w-full overflow-hidden bg-black ring-1 ring-white/15">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* 下バー */}
      {!error && (
        <div className="flex items-center justify-center gap-8 px-4 py-6">
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
