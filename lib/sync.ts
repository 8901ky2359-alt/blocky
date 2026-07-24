'use client';

// 端末間同期（Cloudflare D1）。写真は送らず各端末に残す。
// 合言葉(space)ごとにデータを共有する。

import { Entry } from './types';
import { listEntries, putEntry } from './db';

const SPACE_KEY = 'genba-sync-space';

export function getSpace(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SPACE_KEY) || '';
}

export function setSpace(code: string): void {
  if (typeof window === 'undefined') return;
  const c = code.trim();
  if (c) window.localStorage.setItem(SPACE_KEY, c);
  else window.localStorage.removeItem(SPACE_KEY);
}

export function hasSync(): boolean {
  return !!getSpace();
}

// 覚えやすいランダムな同期コードを生成（例: genba-8k3p-x7q2）
export function generateCode(): string {
  const part = () =>
    Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4);
  return `genba-${part()}`;
}

export type SyncResult = { ok: boolean; count?: number; error?: string };

export async function syncNow(): Promise<SyncResult> {
  const space = getSpace();
  if (!space) return { ok: false, error: 'no-space' };

  let local: Entry[] = [];
  try {
    local = await listEntries();
  } catch {
    /* noop */
  }
  // 写真は送らない（容量削減・各端末に残す）
  const payload = local.map((e) => ({ ...e, photos: [] }));

  let data: { entries?: Entry[] };
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ space, entries: payload }),
    });
    if (!res.ok) return { ok: false, error: `http-${res.status}` };
    data = await res.json();
  } catch {
    return { ok: false, error: 'offline' };
  }

  if (!data || !Array.isArray(data.entries)) return { ok: false, error: 'bad-response' };

  const localMap = new Map(local.map((e) => [e.id, e]));
  for (const s of data.entries) {
    if (!s || !s.id) continue;
    const l = localMap.get(s.id);
    if ((s.updatedAt ?? 0) >= (l?.updatedAt ?? -1) || !l) {
      // 削除印なら墓標として保存（写真も破棄）。通常はローカル写真を保持
      const photos = s.deleted ? [] : l?.photos ?? [];
      await putEntry({ ...s, photos });
    }
  }
  // 表示件数は削除済みを除く
  const count = data.entries.filter((e) => !e.deleted).length;
  return { ok: true, count };
}
