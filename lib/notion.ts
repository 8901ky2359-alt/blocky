'use client';

// その日の記録をNotionへ送信（Cloudflare Worker経由）
import { Entry } from './types';

export type NotionResult = {
  ok: boolean;
  created?: number;
  total?: number;
  error?: string;
};

export async function sendToNotion(entries: Entry[]): Promise<NotionResult> {
  // 写真は送らない（v1）。売上の記録のみ対象。
  const payload = entries.filter((e) => e.kind === 'income').map((e) => ({ ...e, photos: [] }));
  if (payload.length === 0) return { ok: false, error: 'no-entries' };
  try {
    const res = await fetch('/api/notion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entries: payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `http-${res.status}` };
    return { ok: true, created: data.created, total: data.total };
  } catch {
    return { ok: false, error: 'offline' };
  }
}
