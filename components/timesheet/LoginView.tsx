'use client';

import { useEffect, useState } from 'react';
import { openAs, openUsers, setupAdmin, ApiError } from '@/lib/timesheet/api';
import { setSession } from '@/lib/timesheet/auth';
import { TimesheetUser } from '@/lib/timesheet/types';

const ERROR_MESSAGES: Record<string, string> = {
  'name-required': '名前を入力してください',
  offline: 'ネットワークに接続できませんでした',
};

function msg(err: unknown): string {
  const code = err instanceof ApiError ? err.code : '';
  return ERROR_MESSAGES[code] || '通信に失敗しました。もう一度お試しください';
}

type OpenUser = Pick<TimesheetUser, 'id' | 'name' | 'role'>;

// ログイン不要：名前を選ぶだけで開く（最初の1回だけ管理者を作成）
export default function LoginView({
  needsSetup,
  onLoggedIn,
}: {
  needsSetup: boolean;
  onLoggedIn: (user: TimesheetUser) => void;
}) {
  const [users, setUsers] = useState<OpenUser[] | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (needsSetup) return;
    openUsers()
      .then(({ users }) => setUsers(users))
      .catch((e) => {
        setUsers([]);
        setErr(msg(e));
      });
  }, [needsSetup]);

  async function pick(u: OpenUser) {
    setErr('');
    setBusy(true);
    try {
      const res = await openAs(u.id);
      setSession(res.token, res.user);
      onLoggedIn(res.user);
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function setup() {
    setErr('');
    setBusy(true);
    try {
      const res = await setupAdmin(name.trim());
      setSession(res.token, res.user);
      onLoggedIn(res.user);
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center hud-bg px-6">
      <div className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 text-center">
          <span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary text-2xl text-white">
            📝
          </span>
          <h1 className="text-lg font-bold text-slate-800">作業日報</h1>
          <p className="mt-1 text-xs text-slate-500">
            {needsSetup ? '最初に管理者の名前を登録してください' : '使う人の名前を選んでください'}
          </p>
        </div>

        {needsSetup ? (
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="お名前（例: 山田）"
              className="input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && setup()}
            />
            <button
              onClick={setup}
              disabled={busy || !name}
              className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? '処理中…' : '管理者として開始'}
            </button>
          </div>
        ) : users === null ? (
          <p className="py-6 text-center text-sm text-black/40">読み込み中…</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => pick(u)}
                disabled={busy}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <span>{u.name}</span>
                <span className="text-[10px] font-bold text-slate-400">{u.role === 'admin' ? '管理者' : '作業員'}</span>
              </button>
            ))}
          </div>
        )}

        {err && <p className="mt-2 text-center text-xs text-red-500">{err}</p>}

        <a href="/" className="mt-4 block w-full py-2 text-center text-sm text-slate-400">
          ‹ ホームに戻る
        </a>

        {needsSetup && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
            ※ この画面は最初の1回だけ表示されます。管理画面の「作業員管理」から各作業員を追加できます。
          </p>
        )}
      </div>
    </div>
  );
}
