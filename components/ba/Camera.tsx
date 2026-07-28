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
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
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

      {/* プレビュー領域 */}
      <div className="relative flex-1 overflow-hidden bg-black">
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
          <img src={shot} alt="" className="h-full w-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
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
              className="h-18 w-18 border-4 border-white bg-white/20 active:bg-white/40"
              style={{ height: 72, width: 72 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
