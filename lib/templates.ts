'use client';

// 定型作業テンプレートの保存（localStorage）

import { Template } from './types';
import { uid } from './format';

const KEY = 'genba-templates';
const SEED_KEY = 'genba-templates-seed';
// 初期テンプレートを更新したら、この番号を1つ増やすと既存の端末にも一度だけ反映される
const SEED_VERSION = 2;

// 初期テンプレート（常駐 / 出張）
function defaults(): Template[] {
  return [
    { id: uid(), label: '常駐', kind: 'income', category: '草刈り作業', amount: 15000, memo: '' },
    { id: uid(), label: '出張', kind: 'income', category: '草刈り作業', amount: 20000, memo: '' },
  ];
}

export function loadTemplates(): Template[] {
  if (typeof window === 'undefined') return [];

  const seededVersion = Number(window.localStorage.getItem(SEED_KEY) || '0');
  // まだ一度も初期化していない or 初期テンプレートの版が古い場合は入れ替える
  if (seededVersion < SEED_VERSION) {
    const seeded = defaults();
    saveTemplates(seeded);
    window.localStorage.setItem(SEED_KEY, String(SEED_VERSION));
    return seeded;
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Template[];
  } catch {
    /* noop */
  }
  const seeded = defaults();
  saveTemplates(seeded);
  return seeded;
}

export function saveTemplates(list: Template[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function addTemplate(t: Omit<Template, 'id'>): Template[] {
  const list = loadTemplates();
  const next = [...list, { ...t, id: uid() }];
  saveTemplates(next);
  return next;
}

export function removeTemplate(id: string): Template[] {
  const next = loadTemplates().filter((t) => t.id !== id);
  saveTemplates(next);
  return next;
}
