'use client';

import { useEffect, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { shiftDay, todayStr, yen } from '@/lib/format';
import { getWorkers, addWorker, removeWorker, getSites, addSite, removeSite } from '@/lib/hire/presets';
import { getBillTos, addBillTo, removeBillTo } from '@/lib/billto';

export default function HireForm({
  editing,
  defaultDate,
  onSave,
  onCancel,
}: {
  editing?: HireRecord | null;
  defaultDate?: string;
  onSave: (rec: HireRecord) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(editing?.date ?? defaultDate ?? todayStr());
  const [name, setName] = useState(editing?.name ?? '');
  const [site, setSite] = useState(editing?.site ?? '');
  const [client, setClient] = useState(editing?.client ?? '');
  const [amount, setAmount] = useState(editing?.amount ? String(editing.amount) : '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [workers, setWorkers] = useState<string[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    setWorkers(getWorkers());
    setSites(getSites());
    setClients(getBillTos());
  }, []);

  function onNameInput(v: string) {
    setName(v);
  }

  function submit() {
    if (!name.trim()) {
      alert('名前を入力してください');
      return;
    }
    const num = Number(amount.replace(/[, ¥]/g, '')) || 0;
    if (name.trim()) setWorkers(addWorker(name.trim())); // 名前を登録して次回から候補に
    if (site.trim()) setSites(addSite(site.trim())); // 現場名も登録
    if (client.trim()) setClients(addBillTo(client.trim())); // 発注元・請求先も登録（売上と共通）
    const now = Date.now();
    onSave({
      id: editing?.id ?? Math.random().toString(36).slice(2, 12),
      date,
      name: name.trim(),
      site: site.trim(),
      client: client.trim() || undefined,
      amount: num,
      memo: memo.trim(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">{editing ? '記録を編集' : '雇用を記録する'}</h2>

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

      {/* 名前 */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">名前</span>
        <input
          list="hire-workers"
          value={name}
          onChange={(e) => onNameInput(e.target.value)}
          placeholder="例: 田中太郎"
          className="input"
        />
        <datalist id="hire-workers">
          {workers.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
        {workers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {workers.map((w) => (
              <span key={w} className="flex items-center gap-1 rounded-full border border-black/15 pl-3 pr-1 text-xs">
                <button type="button" onClick={() => setName(w)} className={`py-1 ${name === w ? 'font-bold text-brand-primary' : 'text-black/60'}`}>
                  {w}
                </button>
                <button type="button" onClick={() => setWorkers(removeWorker(w))} className="grid h-5 w-5 place-items-center text-black/30" aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </label>

      {/* 現場名 */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">現場名</span>
        <input list="hire-sites" value={site} onChange={(e) => setSite(e.target.value)} placeholder="例: ◯◯様宅 / △△線" className="input" />
        <datalist id="hire-sites">
          {sites.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {sites.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sites.map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-full border border-black/15 pl-3 pr-1 text-xs">
                <button type="button" onClick={() => setSite(s)} className={`py-1 ${site === s ? 'font-bold text-brand-primary' : 'text-black/60'}`}>
                  {s}
                </button>
                <button type="button" onClick={() => setSites(removeSite(s))} className="grid h-5 w-5 place-items-center text-black/30" aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </label>

      {/* 発注元・請求先（誰の現場か） */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">発注元・請求先（誰の現場か）</span>
        <input
          list="hire-clients"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="例: 中野さん / ◯◯建設"
          className="input"
        />
        <datalist id="hire-clients">
          {clients.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {clients.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {clients.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-full border border-black/15 pl-3 pr-1 text-xs">
                <button type="button" onClick={() => setClient(c)} className={`py-1 ${client === c ? 'font-bold text-emerald-700' : 'text-black/60'}`}>
                  {c}
                </button>
                <button type="button" onClick={() => setClients(removeBillTo(c))} className="grid h-5 w-5 place-items-center text-black/30" aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </label>

      {/* 金額 */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">金額（円）</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例: 20000"
          className="input text-right text-xl font-bold"
        />
        {amount && <p className="mt-1 text-right text-sm text-black/50">{yen(Number(amount) || 0)}</p>}
      </label>

      {/* メモ */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black/70">メモ（任意）</span>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="作業内容・支払状況など" className="input h-20" />
      </label>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-black/15 py-3">
          キャンセル
        </button>
        <button onClick={submit} className="flex-[2] rounded-xl bg-brand-primary py-3 font-bold text-white">
          保存する
        </button>
      </div>
    </div>
  );
}
