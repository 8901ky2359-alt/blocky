'use client';

import { useState } from 'react';
import { geocodeAddress } from '@/lib/geocode';
import { todayStr } from '@/lib/format';
import { Project } from '@/lib/ba/types';

const PRESETS = [5, 10, 20, 30, 50, 100];

export default function ProjectForm({
  editing,
  onSave,
  onCancel,
}: {
  editing?: Project | null;
  onSave: (input: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    startDate: string;
    count: number;
    showSign: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [startDate, setStartDate] = useState(editing?.startDate ?? todayStr());
  const [count, setCount] = useState(editing?.count && editing.count > 0 ? editing.count : 5);
  const [showSign, setShowSign] = useState(editing?.showSign ?? false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoResult, setGeoResult] = useState<{ lat: number; lng: number; matched: string } | null>(
    editing?.lat != null && editing?.lng != null
      ? { lat: editing.lat, lng: editing.lng, matched: editing.address ?? '' }
      : null,
  );

  const clamp = (n: number) => Math.max(1, Math.min(999, Math.floor(n) || 1));

  async function lookup() {
    if (!address.trim()) return;
    setGeocoding(true);
    setGeoResult(null);
    try {
      const r = await geocodeAddress(address);
      if (r) setGeoResult(r);
    } finally {
      setGeocoding(false);
    }
  }

  function submit() {
    onSave({
      name: name.trim(),
      address: address.trim(),
      lat: geoResult?.lat,
      lng: geoResult?.lng,
      startDate,
      count,
      showSign,
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-5">
      <h2 className="text-lg font-bold text-slate-900">{editing ? '現場情報を編集' : '現場を記録する'}</h2>

      <Field label="現場名">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 〇〇様邸 / △△線 河川敷"
          className="input"
        />
      </Field>

      <Field label="住所（座標入力）">
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setGeoResult(null);
            }}
            placeholder="例: 東京都〇〇市△△1-2-3"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={lookup}
            disabled={geocoding || !address.trim()}
            className="shrink-0 rounded-none border border-slate-300 px-3 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            {geocoding ? '検索中…' : '📍 検索'}
          </button>
        </div>
        {geoResult && (
          <p className="mt-1 text-xs text-emerald-600">✓ 地図に登録できます（{geoResult.matched}）</p>
        )}
        {!geoResult && (
          <p className="mt-1 text-[11px] text-slate-400">
            住所を入れて「検索」を押すと、地図表示にピンが立ちます（未入力でも記録は可能）
          </p>
        )}
      </Field>

      <Field label="作業開始日">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
      </Field>

      {!editing && (
        <Field label="箇所数">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCount(p)}
                className={`rounded-none py-3 text-sm font-bold transition ${
                  count === p ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c - 1))}
              className="grid h-11 w-11 place-items-center rounded-none border border-slate-200 text-2xl text-slate-600 active:bg-slate-100"
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
              className="w-20 rounded-none border-b-2 border-slate-200 text-center text-3xl font-bold text-slate-900 outline-none"
              aria-label="箇所数"
            />
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c + 1))}
              className="grid h-11 w-11 place-items-center rounded-none border border-slate-200 text-2xl text-slate-600 active:bg-slate-100"
              aria-label="増やす"
            >
              ＋
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">後から「箇所を追加」もできます</p>
        </Field>
      )}

      <Field label="看板">
        <button
          type="button"
          onClick={() => setShowSign((v) => !v)}
          className={`flex w-full items-center justify-between rounded-none border px-3 py-3 text-sm font-semibold ${
            showSign ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'
          }`}
        >
          <span>アフター写真に管理看板を入れる</span>
          <span
            className={`grid h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition ${
              showSign ? 'justify-end bg-emerald-500' : 'justify-start bg-slate-300'
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </span>
        </button>
        <p className="mt-1 text-[11px] text-slate-400">写真の左下に少し小さめに重ねて表示・保存されます</p>
      </Field>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-none border border-slate-300 py-3.5 text-sm font-bold text-slate-600"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={submit}
          className="flex-[2] rounded-none bg-blue-600 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-600/20"
        >
          {editing ? '保存する' : `${count}箇所ではじめる`}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
