'use client';

// 作業日報API（サーバー側D1が正データ。ログイン後はトークンをAuthorizationヘッダで送る）

import { TimesheetEntry, TimesheetUser } from './types';
import { getToken } from './auth';

const BASE = '/api';

export class ApiError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

async function call<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...opts, headers });
  } catch {
    throw new ApiError('offline');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `http-${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function setupStatus(): Promise<{ needsSetup: boolean }> {
  return call('/setup-status');
}

export function setupAdmin(email: string, password: string, name: string) {
  return call<{ token: string; user: TimesheetUser }>('/setup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export function login(email: string, password: string) {
  return call<{ token: string; user: TimesheetUser }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return call<{ user: TimesheetUser }>('/me');
}

export function changeMyPassword(password: string) {
  return call<{ ok: true }>('/me', { method: 'PATCH', body: JSON.stringify({ password }) });
}

export function listUsers() {
  return call<{ users: TimesheetUser[] }>('/users');
}

export function createWorker(email: string, password: string, name: string) {
  return call<{ user: TimesheetUser }>('/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export function resetWorkerPassword(id: string, password: string) {
  return call<{ ok: true }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ password }) });
}

export function deleteWorker(id: string) {
  return call<{ ok: true }>(`/users/${id}`, { method: 'DELETE' });
}

export function listEntries(params: { month?: string; status?: string; userId?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.month) qs.set('month', params.month);
  if (params.status) qs.set('status', params.status);
  if (params.userId) qs.set('userId', params.userId);
  const q = qs.toString();
  return call<{ entries: TimesheetEntry[] }>(`/entries${q ? `?${q}` : ''}`);
}

export interface EntryInput {
  date: string;
  site: string;
  workContent: string;
  amount: number;
  memo?: string;
}

export function createEntry(input: EntryInput) {
  return call<{ entry: TimesheetEntry }>('/entries', { method: 'POST', body: JSON.stringify(input) });
}

export function updateEntry(id: string, input: Partial<EntryInput>) {
  return call<{ entry: TimesheetEntry }>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteEntry(id: string) {
  return call<{ ok: true }>(`/entries/${id}`, { method: 'DELETE' });
}

export function approveEntry(
  id: string,
  input: Partial<EntryInput> & { adminMemo?: string },
) {
  return call<{ entry: TimesheetEntry }>(`/entries/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function reopenEntry(id: string) {
  return call<{ entry: TimesheetEntry }>(`/entries/${id}/reopen`, { method: 'POST' });
}

export async function exportText(params: { month: string; status?: string; userId?: string }): Promise<string> {
  const qs = new URLSearchParams({ month: params.month });
  if (params.status) qs.set('status', params.status);
  if (params.userId) qs.set('userId', params.userId);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/export?${qs.toString()}`, { headers });
  if (!res.ok) throw new ApiError(`http-${res.status}`);
  return res.text();
}
