'use client';

// 作業日報のログイン状態（トークン）の端末内保存

import { TimesheetUser } from './types';

const TOKEN_KEY = 'ts-token';
const USER_KEY = 'ts-user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): TimesheetUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as TimesheetUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: TimesheetUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
