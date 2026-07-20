'use client';

import { useEffect, useMemo, useState } from 'react';
import { Entry, EntryKind, Photo, Template, categoriesFor } from '@/lib/types';
import { todayStr, yen } from '@/lib/format';
import { addTemplate, loadTemplates } from '@/lib/templates';
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
  const [kind, setKind] = useState<EntryKind>(editing?.kind ?? 'income');
  const [date, setDate] = useState(editing?.date ?? defaultDate ?? todayStr());
  const cats = useMemo(() => categoriesFor(kind), [kind]);
  const [category, setCategory] = useState(editing?.category ?? cats[0]);
  const [site, setSite] = useState(editing?.site ?? '');
  const [amount, setAmount] = useState(editing?.amount ? String(editing.amount) : '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [photos, setPhotos] = useState<Photo[]>(editing?.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!editing) setTemplates(loadTemplates());
  }, [editing]);

  function switchKind(next: EntryKind) {
    setKind(next);
    const nextCats = categoriesFor(next);
    if (!nextCats.includes(category as never)) setCategory(nextCats[0]);
  }

  function applyTemplate(t: Template) {
    setKind(t.kind);
    setCategory(t.category);
    if (t.amount) setAmount(String(t.amount));
    if (t.memo) setMemo(t.memo);
  }

  function saveAsTemplate() {
    const label = prompt('この内容を「よく使う作業」に登録します。ボタン名を入力してください', category);
    if (!label) return;
    const num = Number(amount.replace(/[, ¥]/g, '')) || 0;
    setTemplates(addTemplate({ label, kind, category, amount: num, memo: memo.trim() }));
  }

  const receiptPhotos = photos.filter((p) => p.photoKind === 'receipt');
  const beforePhotos = photos.filter((p) => p.photoKind === 'site' && p.phase === 'before');
  const afterPhotos = photos.filter((p) => p.photoKind === 'site' && p.phase === 'after');

  function setReceipts(next: Photo[]) {
    setPhotos([...beforePhotos, ...afterPhotos, ...next]);
  }
  function setBefore(next: Photo[]) {
    setPhotos([...receiptPhotos, ...afterPhotos, ...next]);
  }
  function setAfter(next: Photo[]) {
    setPhotos([...receiptPhotos, ...beforePhotos, ...next]);
  }

  async function handleSubmit() {
    const num = Number(amount.replace(/[, ¥]/g, ''));
    if (!Number.isFinite(num) || num < 0) {
      alert('金額を正しく入力してください');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editing?.id,
        date,
        kind,
        category,
        site: site.trim(),
        amount: num,
        memo: memo.trim(),
        photos,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">{editing ? '記録を編集' : '記録する'}</h2>

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
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  t.kind === 'income'
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-red-300 bg-red-50 text-red-700'
                }`}
              >
                {t.label}
                {t.amount ? ` ${yen(t.amount)}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 収入 / 経費 切替 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchKind('income')}
          className={`rounded-xl border py-3 font-semibold ${
            kind === 'income'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-black/10 text-black/60'
          }`}
        >
          ＋ 収入・売上
        </button>
        <button
          type="button"
          onClick={() => switchKind('expense')}
          className={`rounded-xl border py-3 font-semibold ${
            kind === 'expense'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-black/10 text-black/60'
          }`}
        >
          − 経費・支払い
        </button>
      </div>

      <Field label="日付">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
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

      <Field label="メモ">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="作業内容・台数・面積など"
          className="input h-20"
        />
      </Field>

      {kind === 'expense' && (
        <Field label="レシート写真">
          <PhotoInput photos={receiptPhotos} photoKind="receipt" onChange={setReceipts} label="レシート" />
        </Field>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-3">
        <p className="mb-2 text-sm font-medium text-black/70">現場写真</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-black/50">作業前（Before）</p>
            <PhotoInput
              photos={beforePhotos}
              photoKind="site"
              phase="before"
              onChange={setBefore}
              label="作業前"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-black/50">作業後（After）</p>
            <PhotoInput
              photos={afterPhotos}
              photoKind="site"
              phase="after"
              onChange={setAfter}
              label="作業後"
            />
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
