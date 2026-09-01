// 一度入力した金額を保存し、次回から選択できるようにする（localStorage）

const KEY = 'income-amounts';
const MAX = 12;

export function getAmounts(): number[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'number' && x > 0) : [];
  } catch {
    return [];
  }
}

function saveList(list: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function addAmount(value: number): number[] {
  if (!Number.isFinite(value) || value <= 0) return getAmounts();
  const list = [value, ...getAmounts().filter((x) => x !== value)].slice(0, MAX);
  saveList(list);
  return list;
}

export function removeAmount(value: number): number[] {
  const list = getAmounts().filter((x) => x !== value);
  saveList(list);
  return list;
}
