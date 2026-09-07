'use client';

import { useState } from 'react';
import { TimesheetEntry } from '@/lib/timesheet/types';
import { approveEntry, reopenEntry, ApiError } from '@/lib/timesheet/api';
import { formatJpDate, yen } from '@/lib/format';

export default function ApprovalCard({
  entry,
  onChanged,
}: {
  entry: TimesheetEntry;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.date);
  const [site, setSite] = useState(entry.site);
  const [workContent, setWorkContent] = useState(entry.workContent);
  const [amount, setAmount] = useState(String(entry.amount));
  const [adminMemo, setAdminMemo] = useState(entry.adminMemo || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const changed =
    date !== entry.date || site !== entry.site || workContent !== entry.workContent || Number(amount) !== entry.amount;

  async function approve() {
    setBusy(true);
    setErr('');
    try {
      await approveEntry(entry.id, { date, site, workContent, amount: Number(amount) || 0, adminMemo: adminMemo.trim() });
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.code : '承認に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    setBusy(true);
    setErr('');
    try {
      await reopenEntry(entry.id);
      onChanged();
    } catch {
      setErr('差し戻しに失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">{entry.userName || '（不明な作業員）'}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            entry.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {entry.status === 'approved' ? '承認済み' : '承認待ち'}
        </span>
      </div>

      {!editing ? (
        <button onClick={() => setEditing(true)} className="block w-full text-left" disabled={entry.status === 'approved'}>
          <p className="text-sm text-slate-500">{formatJpDate(entry.date)}</p>
          <p className="text-base font-bold text-slate-800">{entry.site || '現場名なし'}</p>
          <p className="mt-0.5 text-sm text-slate-600">{entry.workContent || '（作業内容なし）'}</p>
          <p className="mt-1 text-lg font-bold text-blue-600">{yen(entry.amount)}</p>
          {entry.memo && <p className="mt-1 text-xs text-slate-500">作業員メモ: {entry.memo}</p>}
          {entry.status !== 'approved' && <p className="mt-1 text-[11px] text-cyan-600">タップして内容を修正できます</p>}
        </button>
      ) : (
        <div className="space-y-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="現場名" className="input" />
          <textarea
            value={workContent}
            onChange={(e) => setWorkContent(e.target.value)}
            placeholder="作業内容"
            rows={2}
            className="input"
          />
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金額" className="input" />
          {entry.memo && <p className="text-xs text-slate-500">作業員メモ: {entry.memo}</p>}
          <button onClick={() => setEditing(false)} className="text-xs text-slate-400">
            編集を閉じる
          </button>
        </div>
      )}

      {entry.status !== 'approved' && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {changed && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
              内容を修正しました。下のメモ欄に修正内容を残してから承認してください。
            </p>
          )}
          <textarea
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            placeholder="修正メモ（例: 現場名を◯◯に修正しておきました）"
            rows={2}
            className="input"
          />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button
            onClick={approve}
            disabled={busy}
            className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? '処理中…' : '承認する'}
          </button>
        </div>
      )}

      {entry.status === 'approved' && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {entry.editedByAdmin && entry.adminMemo && (
            <p className="mb-2 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-700">✎ 修正メモ: {entry.adminMemo}</p>
          )}
          <p className="mb-2 text-[11px] text-slate-400">
            承認者: {entry.approvedByName || '-'}
            {entry.approvedAt ? ` ／ ${new Date(entry.approvedAt).toLocaleString('ja-JP')}` : ''}
          </p>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button onClick={reopen} disabled={busy} className="w-full rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-500 disabled:opacity-50">
            承認を取り消す（差し戻す）
          </button>
        </div>
      )}
    </div>
  );
}
