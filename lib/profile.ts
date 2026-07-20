'use client';

// 請求書の発行元情報（屋号・氏名・連絡先など）を保存

export interface Profile {
  businessName: string; // 屋号
  name: string; // 氏名
  contact: string; // 電話・住所など
  lastClient: string; // 前回の宛名（元請け名）
}

const KEY = 'genba-profile';

const EMPTY: Profile = { businessName: '', name: '', contact: '', lastClient: '' };

export function loadProfile(): Profile {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Profile) };
  } catch {
    /* noop */
  }
  return EMPTY;
}

export function saveProfile(p: Profile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}
