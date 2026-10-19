'use client';

import { useState } from 'react';
import { TimesheetUser } from '@/lib/timesheet/types';
import { createWorker, deleteWorker, ApiError } from '@/lib/timesheet/api';

const ERROR_MESSAGES: Record<string, string> = {
  'name-required': '名前を入力してください',
};

export default function WorkerManage({ users, onChanged }: { users: TimesheetUser[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function add() {
    setBusy(true);
    setErr('');
    try {
      await createWorker(name.trim());
      setName('');
      onChanged();
    } catch (e) {
      setErr((e instanceof ApiError && ERROR_MESSAGES[e.code]) || '追加に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function remove(u: TimesheetUser) {
    if (!confirm(`${u.name} さんのアカウントを削除しますか？（入力済みの記録は残ります）`)) return;
    try {
      await deleteWorker(u.id);
      onChanged();
    } catch {
      alert('削除に失敗しました');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <h3 className="mb-2 text-sm font-bold text-slate-700">＋ 作業員を追加</h3>
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="input" />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button
            onClick={add}
            disabled={busy || !name}
            className="w-full rounded-xl bg-brand-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? '追加中…' : '追加する'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-700">作業員一覧</h3>
        {users.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
            まだ作業員が登録されていません
          </p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-black text-brand-primary">
                {u.name.slice(0, 1) || '?'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-800">
                  {u.name}
                  {u.role === 'admin' && <span className="ml-1 text-[10px] font-normal text-indigo-500">（管理者）</span>}
                </span>
              </span>
              {u.role !== 'admin' && (
                <button onClick={() => remove(u)} className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-500">
                  削除
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
