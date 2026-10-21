'use client';

// 総合管理画面のアカウントにログインできなくなったときの復旧ページ

import { useState } from 'react';
import Logo from '@/components/fw/Logo';
import { ApiError, recoverAdmin } from '@/lib/fw/api';
import { setSession } from '@/lib/fw/session';

const ERRORS: Record<string, string> = {
  'not-configured': '復旧キーがまだ Cloudflare に設定されていません（手順は下を見てください）',
  'invalid-key': '復旧キーが違います',
  'invalid-email': 'メールアドレスの形式が正しくありません',
  'weak-password': 'パスワードは6文字以上にしてください',
  'email-taken': 'そのメールアドレスは仲間のアカウントで使われています',
  'not-found': '総合管理画面のアカウントが見つかりません',
  offline: 'インターネットに接続できませんでした',
};

export default function RecoverPage() {
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await recoverAdmin(key.trim(), email.trim(), password);
      setSession(res.token, res.user);
      location.href = '/';
    } catch (e) {
      setErr((e instanceof ApiError && ERRORS[e.code]) || '復旧できませんでした。もう一度お試しください');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col justify-center px-6 py-10">
      <div className="mb-6 grid justify-items-center gap-2 text-center">
        <Logo size={56} />
        <h1 className="mt-2 text-xl font-extrabold">総合管理画面のログインを復旧</h1>
        <p className="text-sm text-fw-muted">メールアドレスとパスワードを新しく付け直します。売上や仲間のデータはそのまま残ります。</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input id="key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="復旧キー" autoComplete="off" className="input" />
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="新しいメールアドレス" className="input" />
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="新しいパスワード（6文字以上）"
          className="input"
        />
        <button disabled={busy || !key || !email || !password} className="w-full rounded-xl bg-fw-green py-3.5 font-bold text-white disabled:opacity-40">
          {busy ? '確認中…' : '付け直してログインする'}
        </button>
        {err && <p className="text-center text-sm text-fw-red">{err}</p>}
      </form>

      <div className="mt-8 rounded-2xl bg-fw-card p-4 text-[13px] leading-relaxed text-fw-muted">
        <p className="mb-1 font-semibold text-fw-ink">復旧キーの設定方法</p>
        Cloudflare のダッシュボード →「Workers &amp; Pages」→「blocky」→「設定」→「変数とシークレット」で、
        種類「シークレット」、名前 <b className="text-fw-ink">FW_RECOVERY_KEY</b>、値に自分で決めた長い文字列を入れて保存・デプロイします。
        その文字列を上の「復旧キー」に入れてください。
      </div>

      <a href="/" className="mt-6 text-center text-sm text-fw-green">
        ‹ ログイン画面に戻る
      </a>
    </main>
  );
}
