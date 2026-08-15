'use client';

import { useEffect, useRef, useState } from 'react';

// 指やペンで署名を書くパッド。dataURL(PNG)で保存。
export default function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);

  // キャンバス初期化（描き始めるとき）
  useEffect(() => {
    if (!editing) return;
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [editing]);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }
  function up() {
    drawing.current = false;
    last.current = null;
  }

  function saveSig() {
    const c = canvasRef.current;
    if (!c) return;
    onChange(c.toDataURL('image/png'));
    setEditing(false);
  }
  function clearSig() {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-black/70">{label}</p>
      {value && !editing ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={`${label}の署名`} className="mx-auto h-24 object-contain" />
          <div className="mt-2 flex justify-center gap-3 text-xs">
            <button onClick={() => setEditing(true)} className="text-brand-primary underline">
              書き直す
            </button>
            <button onClick={() => onChange(undefined)} className="text-red-500 underline">
              消す
            </button>
          </div>
        </div>
      ) : editing ? (
        <div>
          <canvas
            ref={canvasRef}
            className="h-32 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
          />
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <button onClick={clearSig} className="rounded-lg border border-black/15 py-2 font-semibold text-black/60">
              消去
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg border border-black/15 py-2 font-semibold text-black/60">
              やめる
            </button>
            <button onClick={saveSig} className="rounded-lg bg-brand-primary py-2 font-semibold text-white">
              確定
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-500"
        >
          ✍️ ここに署名する
        </button>
      )}
    </div>
  );
}
