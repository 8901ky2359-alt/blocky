'use client';

import { useState } from 'react';

const PRESETS = [5, 10, 20, 30, 50, 100];

export default function Setup({ onStart }: { onStart: (count: number) => void }) {
  const [count, setCount] = useState(5);
  const clamp = (n: number) => Math.max(1, Math.min(999, Math.floor(n) || 1));

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-sm bg-slate-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-white">
          BEFORE / AFTER
        </div>
        <h1 className="text-2xl font-bold text-slate-900">現場ビフォーアフター</h1>
        <p className="mt-2 text-sm text-slate-500">
          撮影する箇所数を選んで始めましょう。
          <br />
          番号ごとにビフォー／アフターを記録できます。
        </p>
      </div>

      <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">箇所数を選ぶ</p>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setCount(p)}
              className={`rounded-none py-3 text-sm font-bold transition ${
                count === p
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={() => setCount((c) => clamp(c - 1))}
            className="grid h-12 w-12 place-items-center rounded-none border border-slate-200 text-2xl text-slate-600 active:bg-slate-100"
            aria-label="減らす"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={count}
            onChange={(e) => setCount(clamp(Number(e.target.value)))}
            className="w-24 rounded-none border-b-2 border-slate-200 text-center text-4xl font-bold text-slate-900 outline-none"
            aria-label="箇所数"
          />
          <button
            onClick={() => setCount((c) => clamp(c + 1))}
            className="grid h-12 w-12 place-items-center rounded-none border border-slate-200 text-2xl text-slate-600 active:bg-slate-100"
            aria-label="増やす"
          >
            ＋
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          箇所数は自由に設定できます（後から「箇所を追加」もできます）
        </p>
      </div>

      <button
        onClick={() => onStart(count)}
        className="mt-6 w-full rounded-none bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition active:scale-[.99]"
      >
        {count}箇所ではじめる
      </button>

      <p className="mt-4 text-center text-xs text-slate-400">
        データはこの端末に自動保存され、オフラインでも使えます
      </p>
    </div>
  );
}
