'use client';

// 定型作業テンプレートの保存（localStorage）

import { Template } from './types';
import { uid } from './format';

const KEY = 'genba-templates';

// 初期サンプル（初回のみ）
const DEFAULTS: Template[] = [
  { id: uid(), label: '草刈り 半日', kind: 'income', category: '草刈り作業', amount: 15000, memo: '' },
  { id: uid(), label: '草刈り 1日', kind: 'income', category: '草刈り作業', amount: 30000, memo: '' },
  { id: uid(), label: '軽トラ運搬', kind: 'income', category: '運搬・軽トラ作業', amount: 10000, memo: '' },
  { id: uid(), label: '燃料 給油', kind: 'expense', category: '燃料（ガソリン）', amount: 0, memo: '' },
];

export function loadTemplates(): Template[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Template[];
  } catch {
    /* noop */
  }
  window.localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
  return DEFAULTS;
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
