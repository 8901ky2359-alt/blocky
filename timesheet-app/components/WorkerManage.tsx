'use client';

import { useState } from 'react';
import { TimesheetUser } from '@/lib/types';
import { createWorker, deleteWorker, resetWorkerPassword, ApiError } from '@/lib/api';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-email': 'メールアドレスの形式が正しくありません',
  'weak-password': 'パスワードは6文字以上にしてください',
  'name-required': '名前を入力してください',
  'email-taken': 'そのメールアドレスは既に使われています',
};

export default function WorkerManage({ users, onChanged }: { users: TimesheetUser[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function add() {
    setBusy(true);
    setErr('');
    try {
      await createWorker(email.trim(), password, name.trim());
      setName('');
      setEmail('');
      setPassword('');
      onChanged();
    } catch (e) {
      setErr((e instanceof ApiError && ERROR_MESSAGES[e.code]) || '追加に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function reset(u: TimesheetUser) {
    const pw = prompt(`${u.name} さんの新しいパスワード（6文字以上）`);
    if (!pw) return;
    try {
      await resetWorkerPassword(u.id, pw);
      alert('パスワードを変更しました');
    } catch {
      alert('変更に失敗しました');
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" className="input" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="初期パスワード（6文字以上）"
            className="input"
          />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button
            onClick={add}
            disabled={busy || !name || !email || !password}
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
                <span className="block truncate text-xs text-slate-500">{u.email}</span>
              </span>
              <button onClick={() => reset(u)} className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs">
                PW変更
              </button>
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
