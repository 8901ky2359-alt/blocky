'use client';

// ビフォーアフターの撮影設定：最初に「看板を入れるか」と「枚数」を決める

import { useState } from 'react';
import { SignSettings } from '@/lib/ba/types';
import { SignColor } from '@/lib/signboard';

const PRESETS = [5, 10, 20, 30];
const MAX = 999;

export default function Setup({ onStart }: { onStart: (count: number, sign: SignSettings | null) => void }) {
  const [withSign, setWithSign] = useState(true);
  const [title, setTitle] = useState('除草');
  const [place, setPlace] = useState('');
  const [color, setColor] = useState<SignColor>('white');
  const [startNo, setStartNo] = useState('1'); // 文字列で持つ（先頭の数字を消して打ち直せるように）
  const [beforeKind, setBeforeKind] = useState('除草前');
  const [afterKind, setAfterKind] = useState('除草後');
  const [count, setCount] = useState(10);
  const clamp = (n: number) => Math.max(1, Math.min(MAX, Math.floor(n) || 1));

  function start() {
    onStart(
      count,
      withSign
        ? {
            title: title.trim(),
            place: place.trim(),
            color,
            startNo: Math.max(1, parseInt(startNo, 10) || 1),
            beforeKind: beforeKind.trim() || '除草前',
            afterKind: afterKind.trim() || '除草後',
          }
        : null,
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] pb-32">
      <h1 className="px-4 pb-1 pt-[max(20px,env(safe-area-inset-top))] text-[28px] font-extrabold">ビフォーアフター</h1>
      <p className="px-4 pb-4 text-sm text-fw-muted">撮影を始める前に、看板を入れるかと枚数を決めます。左がビフォー、右がアフターで番号ごとに並びます。</p>

      <h2 className="px-8 pb-1.5 text-[13px] text-fw-muted">看板</h2>
      <div className="mx-4 mb-5 grid grid-cols-2 gap-2">
        {[
          { on: true, label: '入れる', sub: '工事名の看板を写真に合成' },
          { on: false, label: '入れない', sub: '写真だけ撮る' },
        ].map((o) => (
          <button
            key={o.label}
            onClick={() => setWithSign(o.on)}
            className={`grid gap-0.5 rounded-2xl border-2 bg-fw-card px-3 py-3 text-center ${withSign === o.on ? 'border-fw-green text-fw-green' : 'border-transparent'}`}
          >
            <span className="font-bold">{o.label}</span>
            <span className="text-[11px] text-fw-muted">{o.sub}</span>
          </button>
        ))}
      </div>

      {withSign && (
        <div className="mx-4 mb-5 grid gap-3 rounded-2xl bg-fw-card p-4">
          <Field label="工事名">
            <input id="sign-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 除草" className="input" />
          </Field>
          <Field label="場所">
            <input id="sign-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="例: 羽賀発電所" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="ビフォーの看板">
              <input id="sign-before" value={beforeKind} onChange={(e) => setBeforeKind(e.target.value)} className="input" />
            </Field>
            <Field label="アフターの看板">
              <input id="sign-after" value={afterKind} onChange={(e) => setAfterKind(e.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="看板の色">
              <div className="grid grid-cols-2 rounded-[10px] bg-fw-fill p-0.5 text-sm font-semibold">
                {(
                  [
                    ['white', '白'],
                    ['green', '緑'],
                  ] as const
                ).map(([c, l]) => (
                  <button key={c} onClick={() => setColor(c)} className={`rounded-lg py-2 ${color === c ? 'bg-fw-card shadow-sm' : ''}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="開始番号">
              <input
                id="sign-start"
                type="number"
                inputMode="numeric"
                value={startNo}
                onChange={(e) => setStartNo(e.target.value)}
                className="input tabular-nums"
              />
            </Field>
          </div>
          <p className="text-xs text-fw-muted">
            同じ番号の箇所は、ビフォーに「{beforeKind || '除草前'}」、アフターに「{afterKind || '除草後'}」の看板が入ります。
          </p>
        </div>
      )}

      <h2 className="px-8 pb-1.5 text-[13px] text-fw-muted">枚数（ビフォーとアフターで1組）</h2>
      <div className="mx-4 mb-5 grid gap-3 rounded-2xl bg-fw-card p-4">
        <div className="flex items-center justify-center gap-5">
          <button onClick={() => setCount((c) => clamp(c - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-fw-fill text-2xl" aria-label="減らす">
            −
          </button>
          <input
            id="count"
            type="number"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(clamp(Number(e.target.value)))}
            className="w-24 bg-transparent text-center text-4xl font-extrabold tabular-nums outline-none"
            aria-label="枚数"
          />
          <button onClick={() => setCount((c) => clamp(c + 1))} className="grid h-11 w-11 place-items-center rounded-full bg-fw-fill text-2xl" aria-label="増やす">
            ＋
          </button>
        </div>
        <div className="flex justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setCount(p)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${count === p ? 'bg-fw-green text-white' : 'bg-fw-fill'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-fw-muted">あとから「箇所を追加」もできます</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-fw-line bg-fw-card/95 backdrop-blur">
        <div className="mx-auto max-w-[560px] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <button onClick={start} className="w-full rounded-xl bg-fw-green py-3.5 font-bold text-white">
            {count}組で撮影をはじめる
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] text-fw-muted">{label}</span>
      {children}
    </div>
  );
}
