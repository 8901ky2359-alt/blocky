'use client';

// 立替経費：領収書写真の縮小・読み込みと、LINE報告の文章

import { Expense } from './types';
import { getReceipt } from './api';
import { shortDate } from './billing';
import { yen } from '../format';

export const DEFAULT_CATEGORIES = ['高速代', 'ガソリン', '駐車場', '資材', '処分費', '道具', '宿泊', 'その他'];

export const EXPENSE_STATUS_LABEL = { unbilled: '未請求', billed: '請求済み', paid: '入金済み' } as const;

// 領収書の写真を、文字が読める大きさのまま軽くする（長い辺 1600px → 収まらなければ小さく）
export async function shrinkReceipt(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    for (const [max, q] of [
      [1600, 0.8],
      [1400, 0.72],
      [1200, 0.65],
      [1000, 0.6],
    ] as const) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', q);
      if (data.length < 1_300_000) return data;
    }
    throw new Error('too-large');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 領収書の写真は一度読んだら覚えておく（一覧・共有で何度も使う）
const cache = new Map<string, Promise<string>>();
export function loadReceipt(id: string): Promise<string> {
  if (!cache.has(id)) {
    const p = getReceipt(id).then((r) => r.data);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id)!;
}

// 週（月曜はじまり）の初日 YYYY-MM-DD
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function line(e: Expense): string {
  const what = e.memo ? `${e.category}（${e.memo}）` : e.category;
  return [shortDate(e.date), e.site, what, yen(e.amount)].filter(Boolean).join(' ');
}

// LINEで送る立替経費の報告。請求先ごとにまとめ、領収書の写真の枚数も添える
export function expenseReport(items: Expense[], issuer: string): string {
  const byClient = new Map<string, Expense[]>();
  for (const e of [...items].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))) {
    byClient.set(e.clientName, [...(byClient.get(e.clientName) ?? []), e]);
  }
  const total = items.reduce((n, e) => n + e.amount, 0);
  const photos = items.reduce((n, e) => n + e.receipts.length, 0);
  const lines = ['【立替経費のご報告】', ''];
  for (const [client, list] of byClient) {
    lines.push(`${client} 様`);
    for (const e of list) lines.push(line(e));
    if (byClient.size > 1) lines.push(`小計 ${yen(list.reduce((n, e) => n + e.amount, 0))}`);
    lines.push('');
  }
  lines.push(`合計 ${yen(total)}（${items.length}件）`);
  if (photos > 0) lines.push(`領収書の写真${photos}枚を添付します。`);
  lines.push('ご確認よろしくお願いいたします。', issuer);
  return lines.join('\n');
}
