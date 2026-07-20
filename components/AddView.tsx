'use client';

import { useEffect, useMemo, useState } from 'react';
import { Entry, Photo, Template, INCOME_CATEGORIES } from '@/lib/types';
import { todayStr, yen } from '@/lib/format';
import { addTemplate, loadTemplates } from '@/lib/templates';
import { geocodeAddress } from '@/lib/geocode';
import PhotoInput from './PhotoInput';

export default function AddView({
  editing,
  defaultDate,
  knownSites,
  onSaved,
  onCancel,
  onSave,
}: {
  editing?: Entry | null;
  defaultDate?: string;
  knownSites: string[];
  onSaved: () => void;
  onCancel?: () => void;
  onSave: (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Entry>;
}) {
  const cats = INCOME_CATEGORIES;
  const [date, setDate] = useState(editing?.date ?? defaultDate ?? todayStr());
  const [category, setCategory] = useState(editing?.category ?? cats[0]);
  const [site, setSite] = useState(editing?.site ?? '');
  const [amount, setAmount] = useState(editing?.amount ? String(editing.amount) : '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [photos, setPhotos] = useState<Photo[]>(editing?.photos ?? []);
  const [address, setAddress] = useState(editing?.address ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    editing?.lat != null && editing?.lng != null ? { lat: editing.lat, lng: editing.lng } : null,
  );
  const [geoStatus, setGeoStatus] = useState<'idle' | 'searching' | 'ok' | 'fail'>('idle');
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!editing) setTemplates(loadTemplates());
  }, [editing]);

  function applyTemplate(t: Template) {
    setCategory(cats.includes(t.category as never) ? t.category : cats[0]);
    if (t.amount) setAmount(String(t.amount));
    if (t.memo) setMemo(t.memo);
  }

  function saveAsTemplate() {
    const label = prompt('この内容を「よく使う作業」に登録します。ボタン名を入力してください', category);
    if (!label) return;
    const num = Number(amount.replace(/[, ¥]/g, '')) || 0;
    setTemplates(addTemplate({ label, kind: 'income', category, amount: num, memo: memo.trim() }));
  }

  const beforePhotos = photos.filter((p) => p.photoKind === 'site' && p.phase === 'before');
  const afterPhotos = photos.filter((p) => p.photoKind === 'site' && p.phase === 'after');

  function setBefore(next: Photo[]) {
    setPhotos([...afterPhotos, ...next]);
  }
  function setAfter(next: Photo[]) {
    setPhotos([...beforePhotos, ...next]);
  }

  async function doGeocode() {
    if (!address.trim()) return;
    setGeoStatus('searching');
    const r = await geocodeAddress(address);
    if (r) {
      setCoords({ lat: r.lat, lng: r.lng });
      setGeoStatus('ok');
    } else {
      setCoords(null);
      setGeoStatus('fail');
    }
  }

  async function handleSubmit() {
    const num = Number(amount.replace(/[, ¥]/g, ''));
    if (!Number.isFinite(num) || num < 0) {
      alert('金額を正しく入力してください');
      return;
    }
    setSaving(true);
    try {
      let loc = coords;
      if (address.trim() && !loc) {
        const r = await geocodeAddress(address);
        if (r) loc = { lat: r.lat, lng: r.lng };
      }
      await onSave({
        id: editing?.id,
        date,
        kind: 'income',
        category,
        site: site.trim(),
        amount: num,
        memo: memo.trim(),
        photos,
        address: address.trim() || undefined,
        lat: loc?.lat,
        lng: loc?.lng,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">{editing ? '記録を編集' : '売上を記録する'}</h2>

      {/* よく使う作業（定型ボタン） */}
      {!editing && templates.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium text-black/70">よく使う作業（タップで入力）</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
              >
                {t.label}
                {t.amount ? ` ${yen(t.amount)}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="日付">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </Field>

      <Field label="金額（円）">
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="input text-right text-xl font-bold"
        />
        {amount && <p className="mt-1 text-right text-sm text-black/50">{yen(Number(amount) || 0)}</p>}
      </Field>

      <Field label="カテゴリ">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="現場名">
        <input
          list="known-sites"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="例: 〇〇様宅 / △△線 河川敷"
          className="input"
        />
        <datalist id="known-sites">
          {knownSites.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>

      <Field label="住所（地図に登録・任意）">
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setCoords(null);
              setGeoStatus('idle');
            }}
            placeholder="例: 山口県〇〇市△△町1-2"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={doGeocode}
            disabled={!address.trim() || geoStatus === 'searching'}
            className="shrink-0 rounded-xl border border-brand-primary px-3 text-sm font-semibold text-brand-primary disabled:opacity-40"
          >
            {geoStatus === 'searching' ? '検索中' : '地図に登録'}
          </button>
        </div>
        {geoStatus === 'ok' && coords && (
          <p className="mt-1 text-xs text-brand-primary">✓ 地図に登録できます（保存すると地図タブにピンが立ちます）</p>
        )}
        {geoStatus === 'fail' && (
          <p className="mt-1 text-xs text-red-500">住所が見つかりませんでした。市区町村まで入れると見つかりやすいです</p>
        )}
      </Field>

      <Field label="メモ">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="作業内容・台数・面積など"
          className="input h-20"
        />
      </Field>

      <div className="rounded-xl border border-black/10 bg-white p-3">
        <p className="mb-2 text-sm font-medium text-black/70">現場写真</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-black/50">作業前（Before）</p>
            <PhotoInput photos={beforePhotos} photoKind="site" phase="before" onChange={setBefore} label="作業前" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-black/50">作業後（After）</p>
            <PhotoInput photos={afterPhotos} photoKind="site" phase="after" onChange={setAfter} label="作業後" />
          </div>
        </div>
      </div>

      {!editing && (amount || memo) && (
        <button
          type="button"
          onClick={saveAsTemplate}
          className="w-full rounded-xl border border-dashed border-brand-primary/50 py-2 text-sm text-brand-primary"
        >
          ＋ この内容を「よく使う作業」に登録
        </button>
      )}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-black/15 py-3">
            キャンセル
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-[2] rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存する'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-black/70">{label}</span>
      {children}
    </label>
  );
}
