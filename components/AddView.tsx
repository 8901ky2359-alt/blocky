'use client';

import { useEffect, useState } from 'react';
import { Entry, Photo, WorkType, workTypeOf } from '@/lib/types';
import { shiftDay, todayStr, yen } from '@/lib/format';
import { getBillTos, addBillTo, removeBillTo } from '@/lib/billto';
import { getAmounts, addAmount, removeAmount } from '@/lib/amounts';
import { getMemos, addMemo, removeMemo } from '@/lib/memos';
import { BILL_GROUPS, billGroupOptionLabel } from '@/lib/billgroup';
import { getWorkers, addWorker, removeWorker } from '@/lib/hire/presets';

type KnownSite = { site: string; address?: string; lat?: number; lng?: number };

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
  knownSites: KnownSite[];
  onSaved: () => void;
  onCancel?: () => void;
  onSave: (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Entry>;
}) {
  const [workType, setWorkType] = useState<WorkType>(editing ? workTypeOf(editing) : '請負');
  const [date, setDate] = useState(editing?.date ?? defaultDate ?? todayStr());
  const [site, setSite] = useState(editing?.site ?? '');
  const [amount, setAmount] = useState(editing?.amount ? String(editing.amount) : '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [photos, setPhotos] = useState<Photo[]>(editing?.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [amounts, setAmounts] = useState<number[]>([]);
  const [memoOptions, setMemoOptions] = useState<string[]>([]);
  const [billTo, setBillTo] = useState(editing?.billTo ?? '');
  const [billTos, setBillTos] = useState<string[]>([]);
  const [billGroup, setBillGroup] = useState(editing?.billGroup ?? '');
  const [hiredName, setHiredName] = useState(editing?.hiredName ?? '');
  const [workers, setWorkers] = useState<string[]>([]);

  useEffect(() => {
    setAmounts(getAmounts());
    setMemoOptions(getMemos());
    setBillTos(getBillTos());
    setWorkers(getWorkers());
  }, [editing]);

  // 過去の現場を選んだとき、現場名を一致させる
  function pickSite(k: KnownSite) {
    setSite(k.site);
  }

  function onSiteInput(value: string) {
    setSite(value);
  }

  async function handleSubmit() {
    const num = Number(amount.replace(/[, ¥]/g, ''));
    if (!Number.isFinite(num) || num < 0) {
      alert('金額を正しく入力してください');
      return;
    }
    if (!site.trim()) {
      alert('現場名を入力してください');
      return;
    }
    if (!memo.trim()) {
      alert('作業内容を入力してください');
      return;
    }
    setSaving(true);
    try {
      if (num > 0) setAmounts(addAmount(num)); // 入力した金額を次回の候補に登録
      if (memo.trim()) setMemoOptions(addMemo(memo)); // 作業内容を次回の候補に登録
      const bill = billTo.trim(); // 請求先はすべての区分で持てる
      if (bill) setBillTos(addBillTo(bill)); // 請求先を登録して次回から候補に
      const group = billGroup; // 締日グループもすべての区分で持てる
      const hired = workType === '雇用' ? hiredName.trim() : '';
      if (hired) setWorkers(addWorker(hired)); // 雇用した人を登録
      await onSave({
        id: editing?.id,
        date,
        kind: 'income',
        category: '',
        site: site.trim(),
        amount: num,
        expense: editing?.expense, // 経費は「経費」ページで管理（旧データは保持）
        memo: memo.trim(),
        photos,
        workType,
        billTo: bill || undefined,
        billGroup: group || undefined,
        hiredName: hired || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">{editing ? '記録を編集' : '売上を記録する'}</h2>

      {/* 常駐 / 請負 / 雇用（必須） */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setWorkType('常駐')}
          className={`border py-3 font-bold ${
            workType === '常駐' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-black/10 text-black/50'
          }`}
        >
          常駐
        </button>
        <button
          type="button"
          onClick={() => setWorkType('請負')}
          className={`border py-3 font-bold ${
            workType === '請負' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-black/10 text-black/50'
          }`}
        >
          請負
        </button>
        <button
          type="button"
          onClick={() => setWorkType('雇用')}
          className={`border py-3 font-bold ${
            workType === '雇用' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-black/10 text-black/50'
          }`}
        >
          雇用
        </button>
      </div>

      {/* 雇用した人（雇用のときだけ） */}
      {workType === '雇用' && (
        <div className="space-y-1 border border-indigo-200 bg-indigo-50/50 p-3">
          <span className="text-sm font-medium text-indigo-800">雇用した人（作業者）</span>
          <input
            list="hired-workers"
            value={hiredName}
            onChange={(e) => setHiredName(e.target.value)}
            placeholder="例: 田中太郎（山田が連れてきた人）"
            className="input"
          />
          <datalist id="hired-workers">
            {workers.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
          {workers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {workers.map((w) => (
                <span key={w} className="flex items-center gap-1 rounded-full border border-black/15 bg-white pl-3 pr-1 text-xs">
                  <button type="button" onClick={() => setHiredName(w)} className={`py-1 ${hiredName === w ? 'font-bold text-indigo-700' : 'text-black/60'}`}>
                    {w}
                  </button>
                  <button type="button" onClick={() => setWorkers(removeWorker(w))} className="grid h-5 w-5 place-items-center text-black/30" aria-label="削除">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 請求先（すべての区分で入力可） */}
      <div className="space-y-1 border border-emerald-200 bg-emerald-50/50 p-3">
          <span className="text-sm font-medium text-emerald-800">請求先（{workType}）</span>
          <input
            list="bill-tos"
            value={billTo}
            onChange={(e) => setBillTo(e.target.value)}
            placeholder="例: 中野さん / ◯◯建設"
            className="input"
          />
          <datalist id="bill-tos">
            {billTos.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          {billTos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {billTos.map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full border border-black/15 bg-white pl-3 pr-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillTo(b)}
                    className={`py-1 ${billTo === b ? 'font-bold text-emerald-700' : 'text-black/60'}`}
                  >
                    {b}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillTos(removeBillTo(b))}
                    className="grid h-5 w-5 place-items-center text-black/30"
                    aria-label="削除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="pt-1">
            <span className="text-xs font-medium text-emerald-800">締日グループ（同じ請求先で締日が違うとき）</span>
            <select
              value={billGroup}
              onChange={(e) => setBillGroup(e.target.value)}
              className="input mt-1"
            >
              <option value="">指定なし</option>
              {BILL_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {billGroupOptionLabel(g)}
                </option>
              ))}
            </select>
          </div>
        </div>

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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDay(date, 1))}
            className="shrink-0 rounded-xl border border-black/15 px-3 py-3 text-sm font-semibold text-black/70"
          >
            翌日 ›
          </button>
        </div>
      </div>

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
        {amounts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {amounts.map((a) => (
              <span key={a} className="flex items-center gap-1 rounded-full border border-black/15 bg-white pl-3 pr-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`py-1 ${Number(amount) === a ? 'font-bold text-brand-primary' : 'text-black/60'}`}
                >
                  {yen(a)}
                </button>
                <button
                  type="button"
                  onClick={() => setAmounts(removeAmount(a))}
                  className="grid h-5 w-5 place-items-center text-black/30"
                  aria-label="削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <Field label="現場名（必須）">
        <input
          list="known-sites"
          value={site}
          onChange={(e) => onSiteInput(e.target.value)}
          placeholder="例: 〇〇様宅 / △△線 河川敷"
          className="input"
        />
        <datalist id="known-sites">
          {knownSites.map((k) => (
            <option key={k.site} value={k.site} />
          ))}
        </datalist>
        {knownSites.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-xs text-black/40">過去の現場からタップで選ぶ（最近使った順）</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {knownSites.slice(0, 30).map((k) => (
                <button
                  key={k.site}
                  type="button"
                  onClick={() => pickSite(k)}
                  className={`max-w-[180px] shrink-0 truncate rounded-full border px-3 py-1 text-xs ${
                    site === k.site
                      ? 'border-brand-primary bg-brand-soft text-brand-primary'
                      : 'border-black/15 text-black/60'
                  }`}
                >
                  {k.address ? '📍 ' : ''}
                  {k.site}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>

      <Field label="作業内容（必須）">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="作業内容（草刈作業・軽土木作業など）・台数・面積など"
          className="input h-24"
        />
        {memoOptions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {memoOptions.map((m) => (
              <span key={m} className="flex items-center gap-1 rounded-full border border-black/15 bg-white pl-3 pr-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMemo(m)}
                  className={`py-1 ${memo === m ? 'font-bold text-brand-primary' : 'text-black/60'}`}
                >
                  {m}
                </button>
                <button
                  type="button"
                  onClick={() => setMemoOptions(removeMemo(m))}
                  className="grid h-5 w-5 place-items-center text-black/30"
                  aria-label="削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        経費（ガソリン・高速・人件費・レシートなど）は、ホームの「🧾 経費」ページで記録・報告します。
      </p>

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
