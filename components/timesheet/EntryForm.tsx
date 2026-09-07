'use client';

import { useState } from 'react';
import { EntryInput } from '@/lib/timesheet/api';
import { TimesheetEntry } from '@/lib/timesheet/types';
import { formatJpDate, yen } from '@/lib/format';

export default function EntryForm({
  editing,
  defaultDate,
  knownSites,
  knownWorkContents,
  knownAmounts,
  onSave,
  onCancel,
  busy,
}: {
  editing?: TimesheetEntry | null;
  defaultDate: string;
  knownSites: string[];
  knownWorkContents: string[];
  knownAmounts: number[];
  onSave: (input: EntryInput) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [date, setDate] = useState(editing?.date ?? defaultDate);
  const [site, setSite] = useState(editing?.site ?? '');
  const [workContent, setWorkContent] = useState(editing?.workContent ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const canSave = date && site.trim();
  const locked = editing?.status === 'approved';

  function submit() {
    if (!canSave) return;
    onSave({ date, site: site.trim(), workContent: workContent.trim(), amount: Number(amount) || 0, memo: memo.trim() });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-800">
        {editing ? '記録を編集' : '作業を記録'}
        <span className="text-xs font-normal text-slate-400">{formatJpDate(date)}</span>
      </h2>

      <label className="block text-xs font-semibold text-slate-500">日付</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />

      <label className="block text-xs font-semibold text-slate-500">現場名</label>
      <input
        list="ts-known-sites"
        value={site}
        onChange={(e) => setSite(e.target.value)}
        placeholder="例: ◯◯様邸"
        className="input"
      />
      <datalist id="ts-known-sites">
        {knownSites.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {knownSites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="w-full text-[11px] text-slate-400">過去の現場からタップで選ぶ</span>
          {knownSites.slice(0, 20).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSite(s)}
              className={`max-w-[180px] truncate rounded-full border px-3 py-1 text-xs ${
                site === s ? 'border-brand-accent bg-brand-soft text-brand-primary' : 'border-slate-300 text-slate-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <label className="block text-xs font-semibold text-slate-500">作業内容</label>
      <textarea
        value={workContent}
        onChange={(e) => setWorkContent(e.target.value)}
        placeholder="例: 草刈り、剪定、資材搬入 など"
        rows={3}
        className="input"
      />
      {knownWorkContents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="w-full text-[11px] text-slate-400">過去の作業内容からタップで選ぶ</span>
          {knownWorkContents.slice(0, 20).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWorkContent(w)}
              className={`max-w-[220px] truncate rounded-full border px-3 py-1 text-xs ${
                workContent === w ? 'border-brand-accent bg-brand-soft text-brand-primary' : 'border-slate-300 text-slate-500'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      <label className="block text-xs font-semibold text-slate-500">金額</label>
      <input
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
        className="input"
      />
      {knownAmounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="w-full text-[11px] text-slate-400">過去の金額からタップで選ぶ</span>
          {knownAmounts.slice(0, 20).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`rounded-full border px-3 py-1 text-xs ${
                Number(amount) === a ? 'border-brand-accent bg-brand-soft text-brand-primary' : 'border-slate-300 text-slate-500'
              }`}
            >
              {yen(a)}
            </button>
          ))}
        </div>
      )}

      <label className="block text-xs font-semibold text-slate-500">メモ（任意）</label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="補足があれば入力"
        rows={2}
        className="input"
      />

      {locked && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          この記録は承認済みのため編集できません。修正が必要な場合は管理者に連絡してください。
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button onClick={onCancel} className="rounded-xl border border-slate-300 py-3 font-semibold text-slate-600">
          キャンセル
        </button>
        <button
          onClick={submit}
          disabled={!canSave || busy || locked}
          className="rounded-xl bg-brand-accent py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
