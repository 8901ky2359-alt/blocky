'use client';

import { useState } from 'react';
import { login, setupAdmin, ApiError } from '@/lib/api';
import { setSession } from '@/lib/auth';
import { TimesheetUser } from '@/lib/types';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-credentials': 'メールアドレスまたはパスワードが違います',
  'invalid-email': 'メールアドレスの形式が正しくありません',
  'weak-password': 'パスワードは6文字以上にしてください',
  'name-required': '名前を入力してください',
  offline: 'ネットワークに接続できませんでした',
};

function msg(err: unknown): string {
  const code = err instanceof ApiError ? err.code : '';
  return ERROR_MESSAGES[code] || '通信に失敗しました。もう一度お試しください';
}

export default function LoginView({
  needsSetup,
  onLoggedIn,
}: {
  needsSetup: boolean;
  onLoggedIn: (user: TimesheetUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setErr('');
    setBusy(true);
    try {
      const res = needsSetup ? await setupAdmin(email.trim(), password, name.trim()) : await login(email.trim(), password);
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
            {needsSetup ? '最初に管理者アカウントを作成してください' : 'メールアドレスとパスワードでログイン'}
          </p>
        </div>

        <div className="space-y-2">
          {needsSetup && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="お名前（例: 山田）"
              className="input"
              autoFocus
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="input"
            autoFocus={!needsSetup}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={needsSetup ? 'パスワード（6文字以上）' : 'パスワード'}
            className="input"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button
            onClick={submit}
            disabled={busy || !email || !password || (needsSetup && !name)}
            className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? '処理中…' : needsSetup ? '管理者として開始' : 'ログイン'}
          </button>
        </div>

        {err && <p className="mt-2 text-center text-xs text-red-500">{err}</p>}

        <a href="/" className="mt-4 block w-full py-2 text-center text-sm text-slate-400">
          ‹ ホームに戻る
        </a>

        {needsSetup && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
            ※ この画面は最初の1回だけ表示されます。作成した管理者アカウントで各作業員のアカウントを追加できます。
          </p>
        )}
      </div>
    </div>
  );
}
