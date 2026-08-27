'use client';

import { useEffect, useState } from 'react';
import { hasPasscode, isUnlocked, markUnlocked, setPasscode, verifyPasscode } from '@/lib/lock';

// 現場メモ・雇用ページをロックするゲート。解錠されるまで中身を表示しない。
export default function PasswordGate({
  title,
  onExit,
  children,
}: {
  title: string;
  onExit?: () => void; // ホーム等へ戻る（未指定なら / へ）
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [needSet, setNeedSet] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isUnlocked()) setUnlocked(true);
    else setNeedSet(!hasPasscode());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  async function submitSet() {
    setErr('');
    if (p1.length < 4) {
      setErr('4文字以上にしてください');
      return;
    }
    if (p1 !== p2) {
      setErr('確認用と一致しません');
      return;
    }
    await setPasscode(p1);
    markUnlocked();
    setUnlocked(true);
  }

  async function submitEnter() {
    setErr('');
    if (await verifyPasscode(p1)) {
      markUnlocked();
      setUnlocked(true);
    } else {
      setErr('パスワードが違います');
      setP1('');
    }
  }

  function goExit() {
    if (onExit) onExit();
    else if (typeof window !== 'undefined') window.location.href = '/';
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center hud-bg px-6">
      <div className="w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 text-center">
          <span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary text-2xl text-white">
            🔒
          </span>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {needSet ? 'パスワードを設定してください' : 'パスワードを入力してください'}
          </p>
        </div>

        {needSet ? (
          <div className="space-y-2">
            <input
              type="password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              placeholder="新しいパスワード（4文字以上）"
              className="input"
              autoFocus
            />
            <input
              type="password"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              placeholder="確認のためもう一度"
              className="input"
              onKeyDown={(e) => e.key === 'Enter' && submitSet()}
            />
            <button onClick={submitSet} className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white">
              設定して開く
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              placeholder="パスワード"
              className="input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitEnter()}
            />
            <button onClick={submitEnter} className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white">
              開く
            </button>
          </div>
        )}

        {err && <p className="mt-2 text-center text-xs text-red-500">{err}</p>}

        <button onClick={goExit} className="mt-4 w-full py-2 text-center text-sm text-slate-400">
          ‹ ホームに戻る
        </button>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
          ※ 端末内の簡易ロックです。設定後は同じパスワードで売上管理・雇用ページが開きます。
        </p>
      </div>
    </div>
  );
}
