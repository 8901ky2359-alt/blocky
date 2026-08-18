// 簡易パスワードロック（現場メモ・雇用ページ用）
// ※静的サイトのためクライアント側の簡易ロックです（端末を触られたときの抑止用）。
//   パスワードのハッシュ(SHA-256)をlocalStorageに保存し、解錠はセッション中のみ有効。

const HASH_KEY = 'genba-lock-hash';
const UNLOCK_KEY = 'genba-unlocked';

async function hash(s: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('genba:' + s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // フォールバック（subtle非対応環境）
    let h = 0;
    const str = 'genba:' + s;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return 'f' + (h >>> 0).toString(16);
  }
}

export function hasPasscode(): boolean {
  try {
    return !!localStorage.getItem(HASH_KEY);
  } catch {
    return false;
  }
}

export async function setPasscode(pass: string): Promise<void> {
  localStorage.setItem(HASH_KEY, await hash(pass));
}

export async function verifyPasscode(pass: string): Promise<boolean> {
  const stored = localStorage.getItem(HASH_KEY);
  return !!stored && stored === (await hash(pass));
}

export function clearPasscode(): void {
  try {
    localStorage.removeItem(HASH_KEY);
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* noop */
  }
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* noop */
  }
}

export function lockNow(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* noop */
  }
}
