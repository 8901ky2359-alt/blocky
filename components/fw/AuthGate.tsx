'use client';

// ログインゲート。ログインしていなければログイン画面を出し、role 指定時はその役割の人だけを通す。
// ログアウトボタンは無く、開くたびにトークンを延長する。

import { ShowTaxProvider } from './ui';
import { useEffect, useState } from 'react';
import { ApiError, me, setupStatus } from '@/lib/fw/api';
import { clearSession, getStoredUser, getToken, setSession } from '@/lib/fw/session';
import { User } from '@/lib/fw/types';
import LoginView from './LoginView';

export default function AuthGate({
  role,
  children,
}: {
  role?: 'admin';
  children: (user: User) => React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const cached = getStoredUser();
      if (getToken() && cached) {
        try {
          const res = await me();
          setSession(res.token, res.user);
          setUser(res.user);
        } catch (e) {
          // 電波が無いときは前回のログイン情報のまま開く
          if (e instanceof ApiError && e.code === 'offline') setUser(cached);
          else clearSession();
        }
      }
      if (!getToken()) {
        try {
          setNeedsSetup((await setupStatus()).needsSetup);
        } catch {
          /* オフライン時は通常のログイン画面 */
        }
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (!user) return <LoginView needsSetup={needsSetup} onLoggedIn={setUser} />;
  if (role && user.role !== role) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-6 text-center">
        <div className="space-y-3">
          <p>このページは総合管理画面の担当者だけが開けます。</p>
          <a href="/" className="font-semibold text-fw-green">
            ‹ ホームへ戻る
          </a>
        </div>
      </div>
    );
  }
  return <ShowTaxProvider value={user.role === 'admin'}>{children(user)}</ShowTaxProvider>;
}
