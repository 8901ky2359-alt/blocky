'use client';

import { useState } from 'react';
import { Entry, Photo, WorkType, EXPENSE_CATEGORIES } from '@/lib/types';
import { shiftDay, todayStr, yen } from '@/lib/format';
import PhotoInput from '@/components/PhotoInput';

export default function ExpenseAddView({
  editing,
  defaultDate,
  onSave,
  onSaved,
  onCancel,
}: {
  editing?: Entry | null;
  defaultDate?: string;
  onSave: (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Entry>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(editing?.date ?? defaultDate ?? todayStr());
  const [amount, setAmount] = useState(editing?.amount ? String(editing.amount) : '');
  const [category, setCategory] = useState(editing?.category || EXPENSE_CATEGORIES[0]);
  const [workType, setWorkType] = useState<WorkType>(editing?.workType ?? '請負');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [photos, setPhotos] = useState<Photo[]>(editing?.photos ?? []);
  const [saving, setSaving] = useState(false);

  const receipts = photos.filter((p) => p.photoKind === 'receipt');

  async function handleSubmit() {
    const num = Number(amount.replace(/[, ¥]/g, ''));
    if (!Number.isFinite(num) || num <= 0) {
      alert('経費の金額を入力してください');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editing?.id,
        date,
        kind: 'expense',
        category,
        site: '',
        amount: num,
        memo: memo.trim(),
        photos,
        workType,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">{editing ? '経費を編集' : '経費を記録する'}</h2>

      {/* 日付 */}
      <div className="space-y-1">
        <span className="text-sm font-medium text-black/70">日付</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(shiftDay(date, -1))}
            className="shrink-0 rounded-xl border border-black/15 px-3 py-3 text-sm font-semibold text-black/70"
          >
            ‹ 前日
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input flex-1" />
          <button
            type="button"
            onClick={() => setDate(shiftDay(date, 1))}
            className="shrink-0 rounded-xl border border-black/15 px-3 py-3 text-sm font-semibold text-black/70"
          >
            翌日 ›
          </button>
        </div>
      </div>

      {/* 金額 */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">経費の金額（円）</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="input text-right text-xl font-bold"
        />
        {amount && <p className="mt-1 text-right text-sm text-red-500">− {yen(Number(amount) || 0)}</p>}
      </label>

      {/* 費目 */}
      <div className="space-y-1">
        <span className="text-sm font-medium text-black/70">費目</span>
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                category === c ? 'border-brand-primary bg-brand-soft text-brand-primary' : 'border-black/15 text-black/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 負担区分 */}
      <div className="space-y-1">
        <span className="text-sm font-medium text-black/70">負担区分</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setWorkType('請負')}
            className={`rounded-xl border py-3 text-sm font-bold ${
              workType === '請負' ? 'border-slate-500 bg-slate-50 text-slate-700' : 'border-black/10 text-black/50'
            }`}
          >
            自己負担（請負）
          </button>
          <button
            type="button"
            onClick={() => setWorkType('常駐')}
            className={`rounded-xl border py-3 text-sm font-bold ${
              workType === '常駐' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-black/10 text-black/50'
            }`}
          >
            立替（常駐・要請求）
          </button>
        </div>
        <p className="text-[11px] text-black/40">
          {workType === '常駐'
            ? '常駐の経費は中野さんに請求して受け取る前提（差引ゼロ）で集計します。'
            : '請負の経費は自己負担として利益から差し引きます。'}
        </p>
      </div>

      {/* レシート写真 */}
      <div className="space-y-1">
        <span className="text-sm font-medium text-black/70">レシート・領収書の写真</span>
        <PhotoInput photos={receipts} photoKind="receipt" maxCount={15} onChange={setPhotos} label="レシート" />
      </div>

      {/* メモ */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">メモ（任意）</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="購入内容・現場名など"
          className="input h-20"
        />
      </label>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-black/15 py-3">
          キャンセル
        </button>
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
