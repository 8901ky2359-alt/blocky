'use client';

import { useEffect, useState } from 'react';
import { me, setupStatus } from '@/lib/api';
import { clearSession, getStoredUser, getToken } from '@/lib/auth';
import { TimesheetUser } from '@/lib/types';
import LoginView from '@/components/LoginView';
import WorkerHome from '@/components/WorkerHome';
import AdminHome from '@/components/AdminHome';

export default function TimesheetPage() {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [user, setUser] = useState<TimesheetUser | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
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

  if (!user) {
    return <LoginView needsSetup={needsSetup} onLoggedIn={setUser} />;
  }

  return user.role === 'admin' ? <AdminHome user={user} /> : <WorkerHome user={user} />;
}
