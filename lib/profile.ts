'use client';

// 請求書の発行元情報（氏名・住所・登録番号・振込先など）を保存

export interface Profile {
  businessName: string; // 屋号（任意）
  name: string; // 氏名
  postal: string; // 郵便番号
  address: string; // 住所
  phone: string; // 電話番号
  regNo: string; // 適格請求書発行事業者 登録番号（T+13桁）
  bankName: string; // 振込先 銀行名
  bankBranch: string; // 支店名
  bankType: string; // 種別（普通/当座）
  bankNumber: string; // 口座番号
  bankHolder: string; // 口座名義
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
  regNo: '',
  bankName: '',
  bankBranch: '',
  bankType: '普通',
  bankNumber: '',
  bankHolder: '',
  lastClient: '',
};

// 旧バージョンの保存形式（連絡先が1項目だった頃）
type LegacyProfile = Partial<Profile> & { contact?: string };

// 数字・ハイフンだけ＝電話番号のような文字列（住所として不正）
function looksLikePhone(s?: string): boolean {
  if (!s) return false;
  return /^[\d\-\s()＋+ー－]+$/.test(s.trim());
}

// 住所を判定：電話番号が紛れ込んでいたら既定住所に戻す
function resolveAddress(saved: LegacyProfile): string {
  let address = saved.address ?? '';
  // 旧「連絡先」は住所らしい場合のみ引き継ぐ（電話番号なら無視）
  if (!address && saved.contact && !looksLikePhone(saved.contact)) address = saved.contact;
  if (!address || looksLikePhone(address)) address = DEFAULT.address;
  return address;
}

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
    address: resolveAddress(saved),
    phone: saved.phone || DEFAULT.phone,
    regNo: saved.regNo || DEFAULT.regNo,
    bankName: saved.bankName || DEFAULT.bankName,
    bankBranch: saved.bankBranch || DEFAULT.bankBranch,
    bankType: saved.bankType || DEFAULT.bankType,
    bankNumber: saved.bankNumber || DEFAULT.bankNumber,
    bankHolder: saved.bankHolder || DEFAULT.bankHolder,
    lastClient: saved.lastClient || '',
  };
}

export function saveProfile(p: Profile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}
