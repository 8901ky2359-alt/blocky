'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Entry, WorkType, workTypeOf } from '@/lib/types';
import { getMemos, addMemo } from '@/lib/memos';
import { BILL_GROUPS } from '@/lib/billgroup';
import {
  currentMonthKey,
  formatJpMonth,
  shiftMonth,
  todayStr,
  yen,
} from '@/lib/format';

type KnownSite = { site: string; address?: string; lat?: number; lng?: number };

// 編集中の変更をためておく型（idごと）
type Patch = Partial<
  Pick<Entry, 'date' | 'workType' | 'site' | 'memo' | 'amount' | 'billTo' | 'billGroup' | 'hiredName'>
>;

export default function EntriesEditor({
  entries,
  onSave,
  onDelete,
  knownSites,
}: {
  entries: Entry[];
  onSave: (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Entry>;
  onDelete: (id: string) => void;
  knownSites: KnownSite[];
}) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [pending, setPending] = useState<Record<string, Patch>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [memoOptions, setMemoOptions] = useState<string[]>([]);

  useEffect(() => {
    setMemoOptions(getMemos());
  }, []);

  // 保存時に「最新の元データ」を参照するためのref（連続編集で古い値に戻さない）
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const rows = useMemo(
    () =>
      entries
        .filter((e) => e.kind === 'income' && e.date.slice(0, 7) === mKey)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [entries, mKey],
  );

  const monthTotal = useMemo(() => rows.reduce((s, e) => s + (e.amount || 0), 0), [rows]);

  // 表示値 = 未確定の編集があればそれ、なければ元データ
  function val<K extends keyof Patch>(e: Entry, key: K): NonNullable<Patch[K]> {
    const p = pending[e.id];
    if (p && key in p && p[key] !== undefined) return p[key] as NonNullable<Patch[K]>;
    if (key === 'workType') return workTypeOf(e) as NonNullable<Patch[K]>;
    return (e[key as keyof Entry] ?? '') as NonNullable<Patch[K]>;
  }

  function setField<K extends keyof Patch>(id: string, key: K, value: Patch[K]) {
    setPending((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  // パッチを「最新の元データ」にマージして保存
  async function applyPatch(id: string, patch: Patch) {
    if (Object.keys(patch).length === 0) return;
    const base = entriesRef.current.find((x) => x.id === id);
    if (!base) return;
    const workType = (patch.workType ?? workTypeOf(base)) as WorkType;
    const memo = (patch.memo ?? base.memo).trim();
    if (patch.memo !== undefined && memo) setMemoOptions(addMemo(memo)); // 作業内容を次回の候補に登録
    setSavingId(id);
    try {
      await onSave({
        ...base,
        date: patch.date ?? base.date,
        site: (patch.site ?? base.site).trim(),
        memo,
        amount: patch.amount != null ? patch.amount : base.amount,
        workType,
        billTo: (patch.billTo ?? base.billTo ?? '').trim() || undefined,
        billGroup: (patch.billGroup ?? base.billGroup ?? '') || undefined,
        hiredName:
          workType === '雇用' ? (patch.hiredName ?? base.hiredName ?? '').trim() || undefined : undefined,
      });
      setPending((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setSavingId((cur) => (cur === id ? null : cur));
    }
  }

  // 入力欄から離れたら保存
  async function commit(e: Entry) {
    const p = pending[e.id];
    if (!p || Object.keys(p).length === 0) return;
    await applyPatch(e.id, p);
  }

  // プルダウンはblurが分かりにくいので、変更したら即保存
  async function changeField(e: Entry, part: Patch) {
    setPending((prev) => ({ ...prev, [e.id]: { ...prev[e.id], ...part } }));
    await applyPatch(e.id, { ...pending[e.id], ...part });
  }

  async function addRow() {
    const today = todayStr();
    const date = today.slice(0, 7) === mKey ? today : `${mKey}-01`;
    await onSave({
      date,
      kind: 'income',
      category: '',
      site: '',
      amount: 0,
      memo: '',
      photos: [],
      workType: '請負',
    });
  }

  const isDirty = (id: string) => !!pending[id] && Object.keys(pending[id]).length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* 月ヘッダ */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMKey(shiftMonth(mKey, -1))}
            className="rounded-lg border border-black/15 px-2 py-1 text-sm"
          >
            ‹
          </button>
          <h2 className="text-lg font-bold">{formatJpMonth(mKey)} の一覧</h2>
          <button
            onClick={() => setMKey(shiftMonth(mKey, 1))}
            className="rounded-lg border border-black/15 px-2 py-1 text-sm"
          >
            ›
          </button>
        </div>
        <div className="text-sm">
          <span className="text-black/50">売上計</span>{' '}
          <span className="font-bold text-blue-600">{yen(monthTotal)}</span>
          <span className="ml-2 text-black/40">（{rows.length}件）</span>
        </div>
      </div>

      <p className="mb-2 text-xs text-black/50">
        表の各項目はそのまま入力・変更できます（入力欄から離れると自動保存）。区分を変えると即保存されます。
      </p>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: '150px' }} />
            <col style={{ width: '64px' }} />
            <col />
            <col />
            <col style={{ width: '84px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '58px' }} />
            <col style={{ width: '28px' }} />
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-slate-50 text-left text-xs text-black/50">
            <tr>
              <th className="whitespace-nowrap px-1.5 py-2 font-semibold">日付</th>
              <th className="whitespace-nowrap px-1.5 py-2 font-semibold">区分</th>
              <th className="px-1.5 py-2 font-semibold">現場名</th>
              <th className="px-1.5 py-2 font-semibold">作業内容</th>
              <th className="whitespace-nowrap px-1.5 py-2 text-right font-semibold">金額(円)</th>
              <th className="px-1.5 py-2 font-semibold">請求先 / 作業員</th>
              <th className="whitespace-nowrap px-1.5 py-2 font-semibold">締日</th>
              <th className="px-1 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-black/40">
                  この月の記録はまだありません
                </td>
              </tr>
            ) : (
              rows.map((e) => {
                const wt = val(e, 'workType') as WorkType;
                return (
                  <tr key={e.id} className="border-t border-black/5 align-top hover:bg-slate-50/60">
                    <td className="px-1.5 py-1.5">
                      <input
                        type="date"
                        value={val(e, 'date') as string}
                        onChange={(ev) => setField(e.id, 'date', ev.target.value)}
                        onBlur={() => commit(e)}
                        className="input !w-full !py-1 !text-xs"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <select
                        value={wt}
                        onChange={(ev) => changeField(e, { workType: ev.target.value as WorkType })}
                        className="input !w-full !py-1 !text-xs"
                      >
                        <option value="請負">請負</option>
                        <option value="常駐">常駐</option>
                        <option value="雇用">雇用</option>
                      </select>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        list="editor-sites"
                        value={val(e, 'site') as string}
                        onChange={(ev) => setField(e.id, 'site', ev.target.value)}
                        onBlur={() => commit(e)}
                        placeholder="現場名"
                        className="input !w-full !py-1 !text-xs"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        list="editor-memos"
                        value={val(e, 'memo') as string}
                        onChange={(ev) => setField(e.id, 'memo', ev.target.value)}
                        onBlur={() => commit(e)}
                        placeholder="作業内容"
                        className="input !w-full !py-1 !text-xs"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={val(e, 'amount') as number}
                        onChange={(ev) => setField(e.id, 'amount', Number(ev.target.value) || 0)}
                        onBlur={() => commit(e)}
                        className="input !w-full !py-1 text-right !text-xs font-semibold"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className="space-y-1">
                        <input
                          list="editor-clients"
                          value={val(e, 'billTo') as string}
                          onChange={(ev) => setField(e.id, 'billTo', ev.target.value)}
                          onBlur={() => commit(e)}
                          placeholder="請求先"
                          className="input !w-full !py-1 !text-xs"
                        />
                        {wt === '雇用' && (
                          <input
                            value={val(e, 'hiredName') as string}
                            onChange={(ev) => setField(e.id, 'hiredName', ev.target.value)}
                            onBlur={() => commit(e)}
                            placeholder="作業員名"
                            className="input !w-full !py-1 !text-xs"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <select
                        value={(val(e, 'billGroup') as string) || ''}
                        onChange={(ev) => changeField(e, { billGroup: ev.target.value })}
                        className="input !w-full !py-1 !text-xs"
                        title="締日グループ"
                      >
                        <option value="">—</option>
                        {BILL_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      {savingId === e.id ? (
                        <span className="text-[10px] text-brand-primary">保存中</span>
                      ) : isDirty(e.id) ? (
                        <span className="text-[10px] text-amber-500">●</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm('この記録を削除しますか？')) onDelete(e.id);
                          }}
                          className="text-black/30 hover:text-red-500"
                          aria-label="削除"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <button
          onClick={addRow}
          className="rounded-xl border border-dashed border-brand-primary/50 px-4 py-2 text-sm font-semibold text-brand-primary"
        >
          ＋ この月に1件追加
        </button>
      </div>

      {/* 候補（現場名・請求先） */}
      <datalist id="editor-sites">
        {knownSites.map((k) => (
          <option key={k.site} value={k.site} />
        ))}
      </datalist>
      <datalist id="editor-clients">
        {[...new Set(entries.map((e) => e.billTo).filter((x): x is string => !!x))].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="editor-memos">
        {[...new Set([...memoOptions, ...entries.map((e) => e.memo).filter((x) => !!x)])].map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
  );
}
