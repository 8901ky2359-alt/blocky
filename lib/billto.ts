// 請求先（常駐の売上を請求する相手）の登録リスト（localStorage）

const KEY = 'income-billto';

export function getBillTos(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveList(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function addBillTo(name: string): string[] {
  const n = name.trim();
  if (!n) return getBillTos();
  const list = [n, ...getBillTos().filter((x) => x !== n)];
  saveList(list);
  return list;
}

export function removeBillTo(name: string): string[] {
  const list = getBillTos().filter((x) => x !== name);
  saveList(list);
  return list;
}
