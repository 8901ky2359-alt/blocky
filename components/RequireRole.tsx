'use client';

// サイト全体のログインゲート。ログインしていなければログイン画面を出し、
// role が指定されている場合はその役割のユーザーだけを通す（作業員が管理者用
// ページを直接URLで開いても入れないようにする）。

import { useEffect, useState } from 'react';
import { me, setupStatus } from '@/lib/timesheet/api';
import { clearSession, getStoredUser, getToken } from '@/lib/timesheet/auth';
import { TimesheetUser } from '@/lib/timesheet/types';
import LoginView from './timesheet/LoginView';

export default function RequireRole({
  role,
  children,
}: {
  role?: 'admin' | 'worker';
  children: (user: TimesheetUser) => React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [user, setUser] = useState<TimesheetUser | null>(null);

  useEffect(() => {
    (async () => {
      const token = getToken();
      const cached = getStoredUser();
      if (token && cached) {
        try {
          const { user } = await me();
          setUser(user);
        } catch {
          clearSession();
        }
      }
      if (!token || !cached) {
        try {
          const { needsSetup } = await setupStatus();
          setNeedsSetup(needsSetup);
        } catch {
          /* オフライン時は通常ログイン画面を出す */
        }
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (!user) return <LoginView needsSetup={needsSetup} onLoggedIn={setUser} />;
  if (role && user.role !== role) return <AccessDenied name={user.name} />;
  return <>{children(user)}</>;
}

function AccessDenied({ name }: { name: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center hud-bg px-6 text-center">
      <div className="max-w-[320px]">
        <p className="mb-1 text-slate-200">{name} さんのアカウントでは、</p>
        <p className="mb-4 text-slate-200">このページを開く権限がありません。</p>
        <a href="/" className="text-cyan-400 underline">
          ホームへ戻る
        </a>
      </div>
    </div>
  );
}
