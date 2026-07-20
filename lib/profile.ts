'use client';

// 請求書の発行元情報（氏名・郵便番号・住所・電話番号など）を保存

export interface Profile {
  businessName: string; // 屋号（任意）
  name: string; // 氏名
  postal: string; // 郵便番号
  address: string; // 住所
  phone: string; // 電話番号
  lastClient: string; // 前回の宛名（元請け名）
}

const KEY = 'genba-profile';

// 既定の発行元情報
const DEFAULT: Profile = {
  businessName: '',
  name: '山田一貴',
  postal: '980-0804',
  address: '宮城県仙台市青葉区大町2丁目15-13-702',
  phone: '080-1814-5592',
  lastClient: '',
};

// 旧バージョンの保存形式（連絡先が1項目だった頃）
type LegacyProfile = Partial<Profile> & { contact?: string };

export function loadProfile(): Profile {
  if (typeof window === 'undefined') return { ...DEFAULT };
  let saved: LegacyProfile = {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) saved = JSON.parse(raw) as LegacyProfile;
  } catch {
    /* noop */
  }
  return {
    businessName: saved.businessName || DEFAULT.businessName,
    name: saved.name || DEFAULT.name,
    postal: saved.postal || DEFAULT.postal,
    // 旧データの「連絡先(contact)」は住所欄に引き継ぐ
    address: saved.address || saved.contact || DEFAULT.address,
    phone: saved.phone || DEFAULT.phone,
    lastClient: saved.lastClient || '',
  };
}

export function saveProfile(p: Profile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}
