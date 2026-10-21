'use client';

// Field Watch API（サーバー側D1が正データ。ログイン後はトークンをAuthorizationヘッダで送る）

import { Client, Profile, Sale, SaleInput, User } from './types';
import { getToken } from './session';

const BASE = '/api/fw';

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

const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

export const setupStatus = () => call<{ needsSetup: boolean }>('/setup-status');
export const setupAdmin = (email: string, password: string, name: string) =>
  call<{ token: string; user: User }>('/setup', post({ email, password, name }));
export const login = (email: string, password: string) =>
  call<{ token: string; user: User }>('/login', post({ email, password }));
export const me = () => call<{ user: User; token: string }>('/me');

export const listUsers = () => call<{ users: User[] }>('/users');
export const createMember = (name: string, email: string, password: string) =>
  call<{ user: User }>('/users', post({ name, email, password }));
export const updateMember = (id: string, patch: { name?: string; email?: string; password?: string }) =>
  call<{ ok: true }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteMember = (id: string) => call<{ ok: true }>(`/users/${id}`, { method: 'DELETE' });

export const listClients = () => call<{ clients: Client[] }>('/clients');
export const deleteClient = (id: string) => call<{ ok: true }>(`/clients/${id}`, { method: 'DELETE' });

export const listSales = () => call<{ sales: Sale[] }>('/sales');
export const createSale = (input: SaleInput) => call<{ sale: Sale }>('/sales', post(input));
export const updateSale = (id: string, input: SaleInput) =>
  call<{ sale: Sale }>(`/sales/${id}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteSale = (id: string) => call<{ ok: true }>(`/sales/${id}`, { method: 'DELETE' });
export const setApproved = (ids: string[], approved: boolean) =>
  call<{ ok: true }>('/sales/approve', post({ ids, approved }));
export const setPaid = (ids: string[], paid: boolean) => call<{ ok: true }>('/sales/paid', post({ ids, paid }));

export const getProfile = () => call<{ profile: Partial<Profile> }>('/profile');
export const saveProfile = (p: Profile) =>
  call<{ profile: Profile }>('/profile', { method: 'PUT', body: JSON.stringify(p) });
