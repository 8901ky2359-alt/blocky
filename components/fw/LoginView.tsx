'use client';

import { useState } from 'react';
import { ApiError, login, setupAdmin } from '@/lib/fw/api';
import { setSession } from '@/lib/fw/session';
import { User } from '@/lib/fw/types';
import Logo from './Logo';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-credentials': 'メールアドレスまたはパスワードが違います',
  'invalid-email': 'メールアドレスの形式が正しくありません',
  'weak-password': 'パスワードは6文字以上にしてください',
  'name-required': '名前を入力してください',
  offline: 'インターネットに接続できませんでした',
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
  onLoggedIn: (user: User) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-6 py-10">
      <div className="mb-8 grid justify-items-center gap-2 text-center">
        <Logo size={64} />
        <h1 className="mt-2 text-2xl font-extrabold tracking-[0.14em]">FIELD WATCH</h1>
        <p className="text-sm text-fw-muted">現場の売上と請求をひとつに</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {needsSetup && (
          <>
            <p className="text-center text-sm text-fw-muted">最初に、総合管理画面を使う人のアカウントを作ります</p>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="お名前（例: 山田）" className="input" />
          </>
        )}
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          className="input"
        />
        <input
          id="password"
          type="password"
          autoComplete={needsSetup ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={needsSetup ? 'パスワード（6文字以上）' : 'パスワード'}
          className="input"
        />
        <button
          type="submit"
          disabled={busy || !email || !password || (needsSetup && !name)}
          className="w-full rounded-xl bg-fw-green py-3.5 font-bold text-white disabled:opacity-50"
        >
          {busy ? '確認中…' : needsSetup ? 'アカウントを作って始める' : 'ログイン'}
        </button>
        {err && <p className="text-center text-sm text-fw-red">{err}</p>}
        {!needsSetup && (
          <p className="pt-2 text-center text-xs text-fw-muted">
            パスワードを忘れた場合は、総合管理画面の担当者に再設定を頼んでください。
            <br />
            <a href="/recover" className="text-fw-green">
              総合管理画面の担当者がログインできないとき
            </a>
          </p>
        )}
      </form>
    </main>
  );
}
