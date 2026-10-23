'use client';

// 端末間同期（Cloudflare D1 の /api/sync）。防草シート管理の進捗を全端末で共有する。
// 以前の「売上管理」と同じ合言葉(space)を使うので、これまでの進捗もそのまま読み込める。

const SPACE_KEY = 'genba-sync-space';
// 既定の同期スペース。全端末が同じ値になるので、設定なしで自動的に同期される。
export const DEFAULT_SPACE = 'genba-yamada-8901ky-main-v1';

export function getSpace(): string {
  if (typeof window === 'undefined') return DEFAULT_SPACE;
  return window.localStorage.getItem(SPACE_KEY) || DEFAULT_SPACE;
}

// 任意のストア（防草シートの進捗など）を space の派生キーで同期する。
// rows は {id, updatedAt, deleted?} を持つJSON。サーバの全行(墓標含む)を返す。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pushPull(suffix: string, rows: any[]): Promise<any[] | null> {
  const base = getSpace();
  if (!base) return null;
  const space = suffix ? `${base}::${suffix}` : base;
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ space, entries: rows }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.entries) ? data.entries : null;
  } catch {
    return null;
  }
}
