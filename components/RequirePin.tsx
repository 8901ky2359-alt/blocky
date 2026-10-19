'use client';

// 管理者ログインとは別の、簡易パスワード（PIN）での閲覧ゲート。
// 他の人にも共有したいページ（アカウント登録なしで開けるページ）向け。

import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'pin-ok:';

export default function RequirePin({
  pin,
  storageKey,
  title,
  children,
}: {
  pin: string;
  storageKey: string; // ページごとに別々に記憶するためのキー
  title?: string;
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      setOk(window.localStorage.getItem(STORAGE_PREFIX + storageKey) === '1');
    } catch {
      setOk(false);
    }
    setReady(true);
  }, [storageKey]);

  function submit() {
    if (input.trim() === pin) {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + storageKey, '1');
      } catch {
        /* noop */
      }
      setOk(true);
      setErr('');
    } else {
      setErr('パスワードが違います');
    }
  }

  if (!ready) return null;

  if (!ok) {
    return (
      <div className="grid min-h-[100dvh] place-items-center hud-bg px-6 text-center">
        <div className="w-full max-w-[320px] space-y-4">
          {title && <h1 className="text-lg font-bold text-slate-100">{title}</h1>}
          <p className="text-sm text-slate-400">このページを見るにはパスワードが必要です</p>
          <input
            type="password"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="パスワード"
            className="input text-center text-lg tracking-widest"
            autoFocus
          />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button onClick={submit} className="w-full rounded-xl bg-brand-primary py-3 text-sm font-bold text-white">
            開く
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
